/**
 * audit_dictionary.js
 *
 * 审计词典覆盖率 (PocketBase / 本地兜底)
 * - 默认从 PocketBase 读取文章与词典
 * - 可使用 --file=... 审计单篇 JSON
 * - 可使用 --dict=local 审计 simpleDictionary.ts
 */

const fs = require('fs');
const path = require('path');

const PB_URL = process.env.POCKETBASE_URL || 'http://127.0.0.1:8090';
const PB_EMAIL = process.env.POCKETBASE_EMAIL;
const PB_PASSWORD = process.env.POCKETBASE_PASSWORD;

const LOCAL_DICT_PATH = path.join(__dirname, '../../../../src/data/simpleDictionary.ts');

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

function extractWordsFromText(text) {
    if (!text) return [];
    const matches = text.match(/[A-Za-z][A-Za-z0-9'-]*/g) || [];
    return matches
        .map(word => word.trim())
        .filter(word => {
            const lower = word.toLowerCase();
            if (word.length === 1 && lower !== 'a' && lower !== 'i') return false;
            return true;
        });
}

function extractWordsFromTokens(tokens = []) {
    const words = [];
    tokens.forEach(token => {
        const text = token?.text || '';
        const isWord = token?.isWord ?? /[A-Za-z]/.test(text);
        if (!isWord) return;
        const cleaned = text.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g, '');
        if (!cleaned) return;
        const lower = cleaned.toLowerCase();
        if (/^\d+(\.\d+)*$/.test(cleaned)) return;
        if (cleaned.length === 1 && lower !== 'a' && lower !== 'i') return;
        if (!/[A-Za-z]/.test(cleaned)) return;
        words.push(cleaned);
    });
    return words;
}

function extractArticleWords(article) {
    const words = [];
    (article.paragraphs || []).forEach(block => {
        const paragraph = normalizeParagraphBlock(block);
        if (Array.isArray(paragraph?.tokenizedSentences) && paragraph.tokenizedSentences.length > 0) {
            paragraph.tokenizedSentences.forEach(sentence => {
                words.push(...extractWordsFromTokens(sentence.tokens));
            });
            return;
        }
        if (Array.isArray(paragraph?.sentences)) {
            paragraph.sentences.forEach(sentence => {
                words.push(...extractWordsFromText(sentence.en));
            });
        }
    });
    return words;
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
        return {
            meta: content.meta || { id: record.id },
            paragraphs: content.paragraphs || [],
            _sourceLabel: content?.meta?.id || record.id
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

function getDictionaryWordsFromLocal(dictPath) {
    const content = fs.readFileSync(dictPath, 'utf-8');
    const words = new Set();
    const badKeys = [];

    const regex = /^\s*["']([a-zA-Z0-9'-]+)["']:\s*\{/gm;
    let match;
    while ((match = regex.exec(content)) !== null) {
        const key = match[1];
        if (key !== key.toLowerCase()) {
            badKeys.push(key);
        }
        words.add(key);
    }

    if (badKeys.length > 0) {
        console.warn(`\n⚠️  警告: 发现 ${badKeys.length} 个非小写键位 (应用无法查询到):`);
        badKeys.forEach(k => console.warn(`   - "${k}" 应该为 "${k.toLowerCase()}"`));
        console.warn('请立即修复 simpleDictionary.ts 中的这些键位。\n');
    }

    return words;
}

async function getDictionaryWordsFromPocketBase() {
    const pb = await createPocketBaseClient();
    const perPage = 200;
    let page = 1;
    let items = [];

    while (true) {
        const result = await pb.collection('dictionary').getList(page, perPage, { sort: 'word' });
        items = items.concat(result.items);
        if (page * perPage >= result.totalItems) {
            break;
        }
        page += 1;
    }

    const words = new Set();
    const badKeys = [];

    items.forEach(record => {
        if (!record.word) return;
        if (record.word !== record.word.toLowerCase()) {
            badKeys.push(record.word);
        }
        words.add(record.word);
    });

    if (badKeys.length > 0) {
        console.warn(`\n⚠️  警告: 发现 ${badKeys.length} 个非小写词条 (应统一小写存储):`);
        badKeys.forEach(word => console.warn(`   - "${word}" 应该为 "${word.toLowerCase()}"`));
        console.warn('请修复 PocketBase dictionary 词条。\n');
    }

    return words;
}

function parseArgs(argv) {
    const options = {
        source: 'pb',
        date: null,
        file: null,
        dict: 'pb',
        dictPath: LOCAL_DICT_PATH
    };

    argv.forEach(arg => {
        if (arg.startsWith('--date=')) {
            options.date = arg.split('=')[1];
        } else if (arg.startsWith('--source=')) {
            options.source = arg.split('=')[1];
        } else if (arg.startsWith('--file=')) {
            options.file = arg.split('=')[1];
        } else if (arg.startsWith('--dict=')) {
            options.dict = arg.split('=')[1];
        } else if (arg.startsWith('--dict-path=')) {
            options.dictPath = arg.split('=')[1];
        } else if (!arg.startsWith('--') && !options.file) {
            options.file = arg;
        }
    });

    if (options.file) {
        options.source = 'file';
    }

    return options;
}

async function runAudit() {
    console.log('\n=== 全量单词审计 (PocketBase/本地) ===\n');

    const options = parseArgs(process.argv.slice(2));
    let targetArticles = [];

    if (options.source === 'pb') {
        if (options.date) {
            console.log(`过滤器: 仅审计 ${options.date} 的文章\n`);
        }
        targetArticles = await loadArticlesFromPocketBase(options.date);
    } else if (options.source === 'file') {
        if (!options.file) {
            console.error('缺少 --file=<path> 参数。');
            process.exit(1);
        }
        targetArticles = loadArticleFromFile(options.file);
    } else {
        console.error(`未知 source: ${options.source}，支持 pb 或 file。`);
        process.exit(1);
    }

    console.log(`扫描文章: ${targetArticles.length} 篇`);

    let dictWords;
    if (options.dict === 'local') {
        dictWords = getDictionaryWordsFromLocal(options.dictPath);
    } else {
        dictWords = await getDictionaryWordsFromPocketBase();
    }

    console.log(`现有词典条目: ${dictWords.size} 个\n`);

    const missingWords = new Map();
    let totalWordCount = 0;
    let coveredWordCount = 0;

    targetArticles.forEach(article => {
        const articleWords = extractArticleWords(article);

        articleWords.forEach(original => {
            const cleaned = original.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g, '');
            if (!cleaned) return;
            if (/^\d+(\.\d+)*$/.test(cleaned)) return;

            const word = cleaned.toLowerCase();
            totalWordCount += 1;

            if (dictWords.has(word)) {
                coveredWordCount += 1;
                return;
            }

            if (!missingWords.has(word)) {
                missingWords.set(word, { count: 0, sources: new Set(), original: cleaned });
            }
            const info = missingWords.get(word);
            info.count += 1;
            info.sources.add(article._sourceLabel || article.meta?.id || 'unknown');
        });
    });

    const coverage = totalWordCount > 0 ? ((coveredWordCount / totalWordCount) * 100).toFixed(1) : 100;
    console.log(`单词总扫描量: ${totalWordCount}`);
    console.log(`覆盖率: ${coverage}%\n`);

    if (missingWords.size > 0) {
        const sortedMissing = Array.from(missingWords.entries())
            .sort((a, b) => b[1].count - a[1].count);

        console.log(`❌ 发现 ${missingWords.size} 个未收录词汇 (Top 50 按频次):`);
        sortedMissing.slice(0, 50).forEach(([word, info]) => {
            console.log(`   - ${info.original} (出现 ${info.count} 次) [来源: ${Array.from(info.sources).join(', ').slice(0, 60)}...]`);
        });

        const outList = Array.from(missingWords.keys()).sort();
        const outputPath = path.join(__dirname, 'missing_all_words.json');
        fs.writeFileSync(outputPath, JSON.stringify(outList, null, 2));

        console.log(`\n完整缺失列表已保存至: ${outputPath}`);
        console.log('所有词汇必须包含在词典中（PocketBase 或 simpleDictionary.ts）。');

        process.exit(1);
    } else {
        console.log('=== 审计结果: 全量覆盖通过 ✅ ===');
    }
}

runAudit();
