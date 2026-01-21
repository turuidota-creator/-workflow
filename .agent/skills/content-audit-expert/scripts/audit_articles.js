/**
 * audit_articles.js
 *
 * 审计文章数据（PocketBase 或 JSON 文件），检查：
 * 1. analysis.grammar 和 analysis.explanation 是否为中文
 * 2. 必填字段是否完整 (meta, intro, title, paragraphs)
 * 3. briefing.when 时效性是否与 meta.date 匹配
 * 4. 字数硬指标：真实字数 > 200，并对比 meta.wordCount
 *
 * 使用方法:
 * node .agent/skills/content-audit-expert/scripts/audit_articles.js --source=pb --date=2026-01-18
 * node .agent/skills/content-audit-expert/scripts/audit_articles.js --file=temp_article.json
 */

const fs = require('fs');
const path = require('path');

const PB_URL = process.env.POCKETBASE_URL || 'http://127.0.0.1:8090';
const PB_EMAIL = process.env.POCKETBASE_EMAIL;
const PB_PASSWORD = process.env.POCKETBASE_PASSWORD;

// 中文检测正则 (包含至少一个中文字符)
const CHINESE_REGEX = /[\u4e00-\u9fa5]/;

// 年份提取正则
const YEAR_REGEX = /20\d{2}/;

const auditResults = {
    totalFiles: 0,
    nonChineseGrammar: [],
    nonChineseExplanation: [],
    missingFields: [],
    timelineMismatch: [],
    englishExplanationPrefix: [],
    lowWordCount: [],
    explanationPrefixMissing: []
};

function containsChinese(str) {
    return CHINESE_REGEX.test(str);
}

function extractYear(str) {
    const match = str?.match(YEAR_REGEX);
    return match ? match[0] : null;
}

function parseJsonMaybe(value) {
    if (typeof value !== 'string') return value;
    try {
        return JSON.parse(value);
    } catch (error) {
        return value;
    }
}

function normalizeParagraphBlock(block) {
    return block?.paragraph || block;
}

function getSentenceBlocks(paragraph) {
    if (!paragraph) return [];
    if (Array.isArray(paragraph.tokenizedSentences) && paragraph.tokenizedSentences.length > 0) {
        return paragraph.tokenizedSentences.map(sentence => ({ type: 'tokenized', data: sentence }));
    }
    if (Array.isArray(paragraph.sentences)) {
        return paragraph.sentences.map(sentence => ({ type: 'legacy', data: sentence }));
    }
    return [];
}

function countWordsFromText(text) {
    if (!text) return 0;
    const matches = text.match(/[A-Za-z][A-Za-z0-9'-]*/g) || [];
    return matches.filter(word => {
        const lower = word.toLowerCase();
        if (word.length === 1 && lower !== 'a' && lower !== 'i') return false;
        return true;
    }).length;
}

function countWordsFromTokens(tokens = []) {
    return tokens.filter(token => {
        const text = token?.text || '';
        const isWord = token?.isWord ?? /[A-Za-z]/.test(text);
        if (!isWord) return false;
        const cleaned = text.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g, '');
        if (!cleaned) return false;
        const lower = cleaned.toLowerCase();
        if (/^\d+(\.\d+)*$/.test(cleaned)) return false;
        if (cleaned.length === 1 && lower !== 'a' && lower !== 'i') return false;
        return /[A-Za-z]/.test(cleaned);
    }).length;
}

function auditSentenceAnalysis(fileLabel, analysis) {
    if (!analysis) return;
    const grammar = analysis.grammar;
    if (grammar && !containsChinese(grammar)) {
        auditResults.nonChineseGrammar.push({ file: fileLabel, content: grammar });
    }

    const explanation = analysis.explanation;
    if (explanation) {
        if (!containsChinese(explanation)) {
            auditResults.nonChineseExplanation.push({ file: fileLabel, content: explanation });
        }
        if (/^[A-Za-z]+:/.test(explanation)) {
            auditResults.englishExplanationPrefix.push({ file: fileLabel, content: explanation.substring(0, 50) });
        }
        if (!explanation.startsWith('人话：') && !explanation.startsWith('潜台词：')) {
            if (containsChinese(explanation) && !/^[A-Za-z]+:/.test(explanation)) {
                auditResults.explanationPrefixMissing.push({ file: fileLabel, content: explanation.substring(0, 50) });
            }
        }
    }
}

function auditArticle(article, fileLabel) {
    const meta = article?.meta || {};

    const missingFields = [];
    if (!article?.intro) missingFields.push('intro');
    if (!article?.title) missingFields.push('title');
    if (!Array.isArray(article?.paragraphs) || article.paragraphs.length === 0) missingFields.push('paragraphs');
    if (!meta || Object.keys(meta).length === 0) missingFields.push('meta');

    if (missingFields.length > 0) {
        auditResults.missingFields.push({ file: fileLabel, missing: missingFields });
    }

    let actualWordCount = 0;

    (article.paragraphs || []).forEach(block => {
        const paragraph = normalizeParagraphBlock(block);
        const sentenceBlocks = getSentenceBlocks(paragraph);
        sentenceBlocks.forEach(({ type, data }) => {
            if (type === 'legacy') {
                actualWordCount += countWordsFromText(data.en);
                auditSentenceAnalysis(fileLabel, data.analysis);
            } else {
                actualWordCount += countWordsFromTokens(data.tokens);
                auditSentenceAnalysis(fileLabel, data.analysis);
            }
        });
    });

    if (actualWordCount < 200) {
        auditResults.lowWordCount.push({
            file: fileLabel,
            count: actualWordCount,
            metaCount: meta.wordCount
        });
    }

    const metaDate = meta?.date;
    const briefingWhen = meta?.briefing?.when;
    if (metaDate && briefingWhen) {
        const metaYear = extractYear(metaDate);
        const briefingYear = extractYear(briefingWhen);
        if (metaYear && briefingYear && metaYear !== briefingYear) {
            auditResults.timelineMismatch.push({
                file: fileLabel,
                metaDate,
                briefingWhen
            });
        }
    }
}

async function createPocketBaseClient() {
    const { default: PocketBase } = await import('pocketbase');
    const pb = new PocketBase(PB_URL);
    if (PB_EMAIL && PB_PASSWORD) {
        await pb.admins.authWithPassword(PB_EMAIL, PB_PASSWORD);
    }
    return pb;
}

async function loadArticlesFromPocketBase(date) {
    const pb = await createPocketBaseClient();
    const perPage = 50;
    let page = 1;
    let items = [];
    const filter = date ? `date = "${date}"` : '';

    while (true) {
        const result = await pb.collection('articles').getList(page, perPage, {
            sort: '-date',
            filter
        });
        items = items.concat(result.items);
        if (page * perPage >= result.totalItems) {
            break;
        }
        page += 1;
    }

    return items.map(record => {
        const content = parseJsonMaybe(record.content) || {};
        const intro = parseJsonMaybe(record.intro);
        const meta = content.meta || {
            id: record.id,
            title: record.title_en,
            date: record.date,
            level: record.level,
            topic: record.topic,
            wordCount: content?.meta?.wordCount
        };

        return {
            meta,
            intro,
            title: {
                zh: record.title_zh,
                en: record.title_en
            },
            paragraphs: content.paragraphs || [],
            _sourceLabel: meta.id || record.id
        };
    });
}

function loadArticleFromFile(filePath) {
    const raw = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(raw);
    const article = data.article || data;
    return [{
        ...article,
        _sourceLabel: path.basename(filePath)
    }];
}

function parseArgs(argv) {
    const options = {
        source: 'pb',
        date: null,
        file: null
    };

    argv.forEach(arg => {
        if (arg.startsWith('--date=')) {
            options.date = arg.split('=')[1];
        } else if (arg.startsWith('--source=')) {
            options.source = arg.split('=')[1];
        } else if (arg.startsWith('--file=')) {
            options.file = arg.split('=')[1];
        } else if (!arg.startsWith('--') && !options.file) {
            options.file = arg;
        }
    });

    if (options.file) {
        options.source = 'file';
    }

    return options;
}

function generateReport() {
    console.log('\n=== 文章审计报告 ===\n');
    console.log(`扫描文章: ${auditResults.totalFiles} 篇\n`);

    if (auditResults.nonChineseGrammar.length > 0) {
        console.log('❌ 非中文 grammar:');
        auditResults.nonChineseGrammar.forEach(item => {
            console.log(`   - ${item.file}: "${item.content}"`);
        });
        console.log();
    } else {
        console.log('✅ grammar 全部为中文\n');
    }

    if (auditResults.nonChineseExplanation.length > 0) {
        console.log('❌ 非中文 explanation:');
        auditResults.nonChineseExplanation.forEach(item => {
            console.log(`   - ${item.file}: "${item.content}"`);
        });
        console.log();
    } else {
        console.log('✅ explanation 全部为中文\n');
    }

    if (auditResults.englishExplanationPrefix.length > 0) {
        console.log('⚠️  explanation 以英文标签开头 (应以 "人话：" 或 "潜台词：" 开头):');
        auditResults.englishExplanationPrefix.forEach(item => {
            console.log(`   - ${item.file}: "${item.content}"`);
        });
        console.log();
    }

    if (auditResults.missingFields.length > 0) {
        console.log('❌ 缺失必填字段:');
        auditResults.missingFields.forEach(item => {
            console.log(`   - ${item.file}: 缺少 [${item.missing.join(', ')}]`);
        });
        console.log();
    } else {
        console.log('✅ 必填字段完整\n');
    }

    if (auditResults.timelineMismatch.length > 0) {
        console.log('❌ 时效性问题 (briefing.when 与 meta.date 年份不匹配):');
        auditResults.timelineMismatch.forEach(item => {
            console.log(`   - ${item.file}: briefing.when="${item.briefingWhen}" 但 date="${item.metaDate}"`);
        });
        console.log();
    } else {
        console.log('✅ 时效性检查通过\n');
    }

    if (auditResults.lowWordCount.length > 0) {
        console.log('❌ 真实字数不足 (需 > 200):');
        auditResults.lowWordCount.forEach(item => {
            const metaCount = item.metaCount ? `, Meta标记=${item.metaCount}` : '';
            console.log(`   - ${item.file}: 真实=${item.count}${metaCount}`);
        });
        console.log();
    } else {
        console.log('✅ 字数检查通过 (>200)\n');
    }

    if (auditResults.explanationPrefixMissing.length > 0) {
        console.log('⚠️  explanation 未以 "人话：" 或 "潜台词：" 开头:');
        auditResults.explanationPrefixMissing.forEach(item => {
            console.log(`   - ${item.file}: "${item.content}..."`);
        });
        console.log();
    }

    const hasErrors =
        auditResults.nonChineseGrammar.length > 0 ||
        auditResults.nonChineseExplanation.length > 0 ||
        auditResults.missingFields.length > 0 ||
        auditResults.timelineMismatch.length > 0 ||
        auditResults.lowWordCount.length > 0 ||
        auditResults.explanationPrefixMissing.length > 0;

    if (hasErrors) {
        console.log('=== 审计结果: 存在问题需要修复 ===');
        process.exit(1);
    } else {
        console.log('=== 审计结果: 全部通过 ✅ ===');
    }
}

async function main() {
    const options = parseArgs(process.argv.slice(2));
    let articles = [];

    if (options.source === 'pb') {
        if (options.date) {
            console.log(`过滤器: 仅审计 ${options.date} 的文章`);
        }
        articles = await loadArticlesFromPocketBase(options.date);
    } else if (options.source === 'file') {
        if (!options.file) {
            console.error('缺少 --file=<path> 参数。');
            process.exit(1);
        }
        articles = loadArticleFromFile(options.file);
    } else {
        console.error(`未知 source: ${options.source}，支持 pb 或 file。`);
        process.exit(1);
    }

    auditResults.totalFiles = articles.length;
    articles.forEach(article => {
        auditArticle(article, article._sourceLabel || article.meta?.id || 'unknown');
    });

    generateReport();
}

main();
