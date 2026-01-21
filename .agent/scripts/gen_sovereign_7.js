const fs = require('fs');
const path = require('path');

// ================= CONSTANTS & DATA =================

const META = {
    id: "20260115_sovereign_ai_7",
    title_zh: "数字墙：主权 AI 的兴起",
    title_en: "Digital Borders: Sovereign AI Clouds and the Challenges of Energy",
    date: "2026-01-15",
    topic: "科技",
    level: "7",
    readTime: 12,
    wordCount: 450,
    briefing: {
        what: "全球竞相建设“主权AI云”并立法保护数据。",
        who: "各国政府与大型科技公司。",
        when: "2026年1月15日",
        scope: "AI基础设施、能源与国家安全。",
        market_implications: "网络被切割；电力成为核心资源；技术共享终结。"
    }
};

const INTRO = `这篇文章深度解析人工智能与国家竞争。
背景：AI 已成为现代国家的“大脑”，谁拥有 AI，谁就拥有未来。
我们将研究各国如何建立自己的技术边界，以及为什么“电力”正在成为 AI 竞赛中最缺的东西。`;

const SENTENCES = [
    // P1
    {
        en: 'Building "Sovereign AI" has become a top priority for many countries, which led to new laws that keep important data within each national border.',
        zh: '建设“主权 AI”已成为许多国家的首要任务，这导致了将重要数据留在国内的新法律。',
        analysis: {
            grammar: '"which" 引导非限制性定语从句，指代前面的整件事。',
            explanation: '人话：AI 太强了，每个国家都想掌控它。为此，各国开始筑起数字围墙，严禁核心数据出国。',
            keywords: ['sovereign', 'priority', 'border']
        }
    },
    {
        en: 'Governments are now providing funds to local tech companies to make sure their AI systems follow national culture and values, rather than relying on tools from other countries.',
        zh: '政府现在正向本地科技公司提供资金，以确保它们的 AI 系统遵循本国的文化和价值观，而不是依赖其他相关国家的技术。',
        analysis: {
            grammar: '"providing funds to..." 提供资金给...；"rather than" 表示“而不是...”。',
            explanation: '人话：国家出钱养自己人搞 AI，就是为了让 AI 的“思想”和咱们一致。要是全用别人的 AI，咱们的文化就可能被慢慢同化。',
            keywords: ['funds', 'values', 'relying', 'culture']
        }
    },
    // P2
    {
        en: 'The rapid growth of AI needs a huge amount of power, so big tech companies are now buying nuclear power plants to keep their computers operational.',
        zh: 'AI 的快速增长需要巨大的电力，因此大型科技公司现在正在购买核电站以保持其计算机运行。',
        analysis: {
            grammar: '"so" 连接因果关系；"to keep... operational" 不定式作目的状语，operational 是形容词作宾补。',
            explanation: '人话：电脑运行 AI 非常费电（算力就是电力）。为了保证不断电，科技巨头们甚至开始自己买核电站。',
            keywords: ['nuclear', 'operational']
        }
    },
    {
        en: 'The primary challenge is no longer how to make chips, but how to find enough clean electricity, making power the most valuable resource in the AI race.',
        zh: '主要问题不再是如何制造芯片，而是如何找到足够的清洁电力，这使得电力成为 AI 竞赛中最宝贵的资源。',
        analysis: {
            grammar: '"no longer A but B" 不再是A而是B；"making..." 分词短语作结果状语。',
            explanation: '人话：现在最缺的不是芯片，而是电。谁有电，谁就能跑得动最先进的 AI。',
            keywords: ['primary', 'electricity', 'resource']
        }
    },
    // P3
    {
        en: 'We are entering a time where countries not only control hardware like chips but also the "math" inside AI models to protect their national security.',
        zh: '我们正在进入一个时代，国家不仅控制像芯片这样的硬件，还控制 AI 模型内部的“数学”，以保护其国家安全。',
        analysis: {
            grammar: '"where" 引导定语从句修饰 time；"not only... but also..." 连接并列谓语（control implied）。',
            explanation: '人话：以前只管硬件，现在连 AI 怎么思考的“数学公式”也要管。这也是为了国家安全。',
            keywords: ['hardware', 'math', 'security']
        }
    },
    {
        en: 'As a result, the old idea of sharing technology openly is dying, replaced by secrecy and strict ownership rules.',
        zh: '结果，公开分享技术的旧观念正在消亡，取而代之的是保密和严格的所有权规则。',
        analysis: {
            grammar: '"replaced by..." 过去分词短语作伴随状语；"secrecy" 和 "ownership" 并列。',
            explanation: '人话：以前大家都喜欢开源共享，现在大家都藏着掖着，把技术当成自己的私有财产。',
            keywords: ['technology', 'secrecy', 'ownership', 'strict']
        }
    }
];

const VOCAB_DATA = [
    { w: "sovereign", lemma: "sovereign", pos: "adj.", def: "主权的；至高无上的", ctx: "[主权] 指国家拥有的独立控制权。" },
    { w: "priority", lemma: "priority", pos: "n.", def: "优先事项", ctx: "[首要任务] 各国政府最看重的事情。" },
    { w: "border", lemma: "border", pos: "n.", def: "边界；国界", ctx: "[国界] 限制数据流动的国家地理界线。" },
    { w: "funds", lemma: "fund", pos: "n.", def: "资金", ctx: "[补贴] 政府提供的财政支持。" },
    { w: "values", lemma: "value", pos: "n.", def: "价值观", ctx: "[价值观] 一个国家或社会的道德准则和文化信仰。" },
    { w: "relying", lemma: "rely", pos: "v.", def: "依赖", ctx: "[依赖] 指靠别人的技术生存，受制于人。" },
    { w: "culture", lemma: "culture", pos: "n.", def: "文化", ctx: "[文化] 一个国家特有的生活方式和传统。" },
    { w: "operational", lemma: "operational", pos: "adj.", def: "运作的；可用的", ctx: "[正常运行] 保持计算机系统不宕机。" },
    { w: "nuclear", lemma: "nuclear", pos: "adj.", def: "核能的", ctx: "[核能] 一种稳定且清洁的能源形式。" },
    { w: "primary", lemma: "primary", pos: "adj.", def: "主要的；首要的", ctx: "[核心] 指最关键的挑战。" },
    { w: "electricity", lemma: "electricity", pos: "n.", def: "电力", ctx: "[电力] 驱动AI运行的能源。" },
    { w: "resource", lemma: "resource", pos: "n.", def: "资源", ctx: "[资源] 像水和石油一样重要的物资。" },
    { w: "hardware", lemma: "hardware", pos: "n.", def: "硬件", ctx: "[硬件设备] 如芯片、服务器等实体机器。" },
    { w: "math", lemma: "math", pos: "n.", def: "数学", ctx: "[算法] 指AI模型内部的计算逻辑和参数。" },
    { w: "security", lemma: "security", pos: "n.", def: "安全", ctx: "[国家安全] 指保护国家免受威胁的状态。" },
    { w: "technology", lemma: "technology", pos: "n.", def: "技术", ctx: "[科技] 指AI等先进技术。" },
    { w: "secrecy", lemma: "secrecy", pos: "n.", def: "保密", ctx: "[保密] 不再公开分享技术细节。" },
    { w: "ownership", lemma: "ownership", pos: "n.", def: "所有权", ctx: "[私有] 指技术属于谁的问题。" },
    { w: "strict", lemma: "strict", pos: "adj.", def: "严格的", ctx: "[严厉] 规则非常强硬，不可违反。" }
];

// ================= LOGIC =================

function computeDefHash(input) {
    const normalized = input.definition.trim().toLowerCase().replace(/\s/g, '');
    const raw = `${input.lemma.toLowerCase()}|${input.pos.toLowerCase()}|${normalized}`;
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
        const char = raw.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(8, '0').slice(0, 8);
}

function generateGlossaryId(input) {
    const hash = computeDefHash(input);
    const cleanPos = input.pos.replace(/\./g, '');
    return `${input.lemma.toLowerCase()}_${cleanPos}_${hash}`;
}

const glossaryMap = {};
VOCAB_DATA.forEach(item => {
    const id = generateGlossaryId({ lemma: item.lemma, pos: item.pos, definition: item.def });
    glossaryMap[item.lemma] = {
        id: id,
        lemma: item.lemma,
        word: item.w,
        definition: item.def,
        contextDefinition: item.ctx,
        pos: item.pos,
        pronunciation: "",
        exampleSentence: "",
        sourceArticleId: META.id
    };
});

// Manual Map for inflections
const WORD_TO_LEMMA = {
    "sovereign": "sovereign", "priority": "priority", "laws": "law", "border": "border",
    "providing": "provide", "funds": "fund", "companies": "company", "values": "value",
    "relying": "rely", "operational": "operational", "buying": "buy", "plants": "plant",
    "challenges": "challenge", "primary": "primary", "electricity": "electricity",
    "resource": "resource", "entering": "enter", "control": "control", "hardware": "hardware",
    "math": "math", "security": "security", "sharing": "sharing", "technology": "technology",
    "dying": "die", "replaced": "replace", "secrecy": "secrecy", "ownership": "ownership",
    "strict": "strict", "culture": "culture", "nuclear": "nuclear", "math": "math"
};
// Add direct mapping for lemma=word
VOCAB_DATA.forEach(v => WORD_TO_LEMMA[v.lemma] = v.lemma);
VOCAB_DATA.forEach(v => WORD_TO_LEMMA[v.w] = v.lemma);

function tokenize(text) {
    const regex = /([a-zA-Z0-9'-]+|[^a-zA-Z0-9\s]+|\s+)/g;
    const parts = text.match(regex) || [];
    return parts.map(part => {
        const isWord = /^[a-zA-Z0-9'-]+$/i.test(part) && /[a-zA-Z]/.test(part);
        let glossaryId = undefined;
        if (isWord) {
            const lower = part.toLowerCase();
            let lemma = WORD_TO_LEMMA[lower];
            if (!lemma) {
                if (glossaryMap[lower]) lemma = lower;
                else if (lower.endsWith('s') && glossaryMap[lower.slice(0, -1)]) lemma = lower.slice(0, -1);
                else if (lower.endsWith('ed') && glossaryMap[lower.slice(0, -2)]) lemma = lower.slice(0, -2);
                else if (lower.endsWith('ing') && glossaryMap[lower.slice(0, -3)]) lemma = lower.slice(0, -3);
            }
            if (lemma && glossaryMap[lemma]) {
                glossaryId = glossaryMap[lemma].id;
            }
        }
        return { text: part, isWord, glossaryId };
    });
}

const finalParagraphs = [];
// Sentences are 2 per para, 3 paras
let sCursor = 0;
const PARA_STRUCTURE = [2, 2, 2];

PARA_STRUCTURE.forEach((start, i) => {
    const paraId = `tech-p${i + 1}-7`;
    const dimSentences = [];

    for (let k = 0; k < start; k++) {
        const sData = SENTENCES[sCursor++];
        const sId = `tech-p${i + 1}_s${k + 1}-7`;
        const tokens = tokenize(sData.en);

        dimSentences.push({
            id: sId,
            tokens: tokens,
            zh: sData.zh,
            analysis: sData.analysis
        });
    }

    finalParagraphs.push({
        type: 'paragraph',
        id: paraId,
        paragraph: {
            id: `p${i + 1}`,
            label: `Para ${i + 1}`,
            tokenizedSentences: dimSentences
        }
    });
});

const fileContent = `import { Article } from '../../../types/article';

export const techArticle7: Article = {
    meta: {
        id: "${META.id}",
        title: "${META.title_zh}",
        level: "${META.level}",
        topic: "${META.topic}",
        date: "${META.date}",
        estimatedReadTime: ${META.readTime},
        wordCount: ${META.wordCount},
        briefing: ${JSON.stringify(META.briefing, null, 12).trim()}
    },
    intro: {
        type: 'intro',
        id: 'intro-tech-7',
        text: \`${INTRO}\`
    },
    title: {
        type: 'title',
        id: 'title-tech-7',
        zh: '${META.title_zh}',
        en: '${META.title_en}'
    },
    paragraphs: ${JSON.stringify(finalParagraphs, null, 8)},
    glossary: ${JSON.stringify(glossaryMap, null, 8)}
};
`;

const outPath = path.join(__dirname, '../../src/data/articles/2026-01-15/20260115_sovereign_ai_7.ts');
fs.writeFileSync(outPath, fileContent);
console.log("Written to " + outPath);
