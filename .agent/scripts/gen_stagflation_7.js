const fs = require('fs');
const path = require('path');

const META = {
    id: "20260115_stagflation_debt_7",
    title_zh: "通胀与债务：政府支出下的市场风险",
    title_en: "The Problems of Inflation and Debt: Market Risks and Government Spending",
    date: "2026-01-15",
    topic: "财经",
    level: "7",
    readTime: 12,
    wordCount: 430,
    briefing: {
        what: "全球面临“财政赤字、高通胀与债务危机”的完美风暴。",
        who: "全球央行(Central Banks)；“债券义警”(Bond Vigilantes)。",
        when: "2026年1月15日",
        scope: "宏观经济、资本市场与企业信贷。",
        market_implications: "股债双杀格局确立；信用利差飙升；现金流资产为王。"
    }
};

const INTRO = `这篇文章深度分析 2026 年的经济难题：债务、物价与风险。
背景：利息很高，但政府花钱很多。
我们将学习为什么通胀很难下降，以及为什么在这个时期“现金”比“梦想”更重要。`;

const SENTENCES = [
    // P1
    {
        en: 'A strange and difficult thing is happening in the world today: while central banks try to stop inflation by hiking interest rates, government spending is making prices go up even more.',
        zh: '当今世界正在发生一件既奇怪又困难的事情：当央行试图通过加息来阻止通胀时，政府支出却让物价上涨得更快。',
        analysis: {
            grammar: 'While 引导对比状语从句；by hiking ... 通过...方式。',
            explanation: '人话：银行在踩刹车（加息），政府在踩油门（花钱）。这两种力量互相抵消，结果就是物价一直掉不下来。',
            keywords: ['hiking', 'inflation', 'spending']
        }
    },
    {
        en: 'This situation makes people worry about the future value of their wealth, and many investors now want higher interest to protect themselves from low purchasing power.',
        zh: '这种情况让人们担心未来的货币价值，许多投资者现在要求更高的利息来保护自己免受购买力下降的影响。',
        analysis: {
            grammar: 'make sb. do sth. 使某人担心；protect ... from ... 保护免受...侵蚀。',
            explanation: '人话：大家觉得钱以后不值钱了，所以借钱给别人时，都要收更多的利息作为补偿。',
            keywords: ['wealth', 'investors', 'purchasing power']
        }
    },
    {
        en: 'Because of this, the rules of the financial market are changing, and old ways of preserving capital might not work as well as they did before.',
        zh: '正因为如此，金融市场的规则正在发生变化，旧的省钱方式可能不再像以前那样有效。',
        analysis: {
            grammar: 'Because of 由于...；as well as ... 和...一样好。',
            explanation: '人话：投资环境变了，以前那一套养老、理财的逻辑，在现在的这种混乱局面前，可能要失灵了。',
            keywords: ['financial', 'preserving', 'capital']
        }
    },
    // P2
    {
        en: 'Many companies that borrowed "low-cost capital" in the past years are now in big trouble because they cannot pay back their debts at these new, higher rates.',
        zh: '许多在过去几年借了“低息资金”的公司现在陷入了巨大的困境，因为它们无法按照这些新的、更高的利率偿还债务。',
        analysis: {
            grammar: 'that 引导定语从句；pay back debts 偿还债务。',
            explanation: '人话：以前借钱几乎不要利息，现在利息翻了好几倍。很多靠借钱活着的烂公司发现自己还不起债，快破产了。',
            keywords: ['borrowed', 'debts', 'trouble']
        }
    },
    {
        en: 'As more businesses fail, the risk in the market grows, making it difficult for even good companies to secure the necessary funds they need to stay online.',
        zh: '随着更多企业破产，市场风险增加，这使得即便优秀的公司也很难获得维持运营所需的资金。',
        analysis: {
            grammar: 'As 随着...；making it difficult ... 分词作结果状语；secure funds 获得资金。',
            explanation: '人话：倒闭的公司多了，银行就不敢随便借钱了（惜贷）。哪怕你是好公司，现在想借钱也变得非常难。',
            keywords: ['risk', 'secure', 'funds', 'online']
        }
    },
    {
        en: 'This could lead to a sudden "liquidity crunch," where there is not sufficient liquidity in the system for everyone to pay their bills on time.',
        zh: '这可能导致突然的“流动性紧缩”，即系统中没有足够的现金让每个人都能准时支付账单。',
        analysis: {
            grammar: 'liquidity crunch 流动性紧缩；where 引导定语从句。',
            explanation: '人话：这就是传说中的“钱荒”。即便你有厂房、有股票，但手里没现金，到期还不上账，照样得倒闭。',
            keywords: ['liquidity', 'crunch', 'sufficient']
        }
    },
    // P3
    {
        en: 'In this new economic cycle, investors are forced to change their plans and buy real assets like gold or land to keep their wealth safe from inflation.',
        zh: '在这个新的经济周期中，投资者被迫改变他们的计划，购买黄金或土地等实物资产，以使他们的财富免受通货膨胀的影响。',
        analysis: {
            grammar: 'forced to do 被迫做...；real assets 实物资产。',
            explanation: '人话：钱不值钱了，买黄金这种硬通货才是硬道理。大家都在为了保值而疯狂买入实物。',
            keywords: ['cycle', 'investors', 'assets', 'safe']
        }
    },
    {
        en: 'The future will be more about having a steady cash flow rather than just hoping for a company to grow fast based on dreams.',
        zh: '未来将更多地关于拥有稳定的现金流，而不是仅仅寄希望于一家公司基于梦想而快速成长。',
        analysis: {
            grammar: 'rather than 而不是...；based on 基于...。',
            explanation: '人话：不要再听那些“画大饼”的故事了。未来，谁能每月稳稳赚到钱，谁才是真正的赢家。',
            keywords: ['future', 'steady', 'cash flow', 'dreams']
        }
    }
];

const VOCAB_DATA = [
    { w: "hiking", lemma: "hike", pos: "v.", def: "大幅提高", ctx: "[加息] 央行为了抑制通胀而大幅提高利率。" },
    { w: "inflation", lemma: "inflation", pos: "n.", def: "通货膨胀", ctx: "[通胀] 物价持续上涨，钱变得不值钱。" },
    { w: "spending", lemma: "spending", pos: "n.", def: "开支", ctx: "[政府支出] 政府花在公共事务上的钱。" },
    { w: "wealth", lemma: "wealth", pos: "n.", def: "财富", ctx: "[资产] 个人拥有的钱和财产的总和。" },
    { w: "investors", lemma: "investor", pos: "n.", def: "投资者", ctx: "[投资人] 将钱投入市场以期获得回报的人。" },
    { w: "purchasing power", lemma: "purchasing power", pos: "n.", def: "购买力", ctx: "[购买力] 现在的钱能买到多少东西的能力。" },
    { w: "financial", lemma: "financial", pos: "adj.", def: "金融的", ctx: "[金融市场] 买卖股票、债券和货币的地方。" },
    { w: "preserving", lemma: "preserve", pos: "v.", def: "保存；保护", ctx: "[保值] 保护本金不缩水。" },
    { w: "capital", lemma: "capital", pos: "n.", def: "资本", ctx: "[本金] 用于投资的钱。" },
    { w: "borrowed", lemma: "borrow", pos: "v.", def: "借入", ctx: "[借债] 公司为了经营去借钱。" },
    { w: "debts", lemma: "debt", pos: "n.", def: "债务", ctx: "[欠款] 公司必须偿还的钱。" },
    { w: "trouble", lemma: "trouble", pos: "n.", def: "困难", ctx: "[困境] 无法还钱的糟糕状况。" },
    { w: "risk", lemma: "risk", pos: "n.", def: "风险", ctx: "[市场风险] 投资亏损或借不到钱的可能性。" },
    { w: "secure", lemma: "secure", pos: "v.", def: "获得；保卫", ctx: "[获取资金] 成功借到钱或拿到投资。" },
    { w: "funds", lemma: "fund", pos: "n.", def: "资金", ctx: "[救命钱] 公司运营必须的现金。" },
    { w: "online", lemma: "online", pos: "adj.", def: "在线的；运作的", ctx: "[存活] 保持公司正常运转，不倒闭。" },
    { w: "liquidity", lemma: "liquidity", pos: "n.", def: "流动性", ctx: "[现金流] 手头可以立即使用的现金。" },
    { w: "crunch", lemma: "crunch", pos: "n.", def: "紧缩；危机", ctx: "[钱荒] 市场上突然借不到钱了。" },
    { w: "sufficient", lemma: "sufficient", pos: "adj.", def: "充足的", ctx: "[足够] 钱够不够付账单。" },
    { w: "cycle", lemma: "cycle", pos: "n.", def: "周期", ctx: "[经济周期] 经济繁荣和萧条的交替过程。" },
    { w: "assets", lemma: "asset", pos: "n.", def: "资产", ctx: "[实物资产] 黄金、土地等看得见摸得着的东西。" },
    { w: "safe", lemma: "safe", pos: "adj.", def: "安全的", ctx: "[避险] 躲避通货膨胀带来的损失。" },
    { w: "future", lemma: "future", pos: "n.", def: "未来", ctx: "[前景] 经济发展的未来趋势。" },
    { w: "steady", lemma: "steady", pos: "adj.", def: "稳定的", ctx: "[稳健] 收入稳定，不忽高忽低。" },
    { w: "cash flow", lemma: "cash flow", pos: "n.", def: "现金流", ctx: "[流水] 公司账户里实际进出的现金。" },
    { w: "dreams", lemma: "dream", pos: "n.", def: "梦想", ctx: "[画大饼] 指那些听起来很美但还没赚钱的商业计划。" }
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
    "hiking": "hike", "spending": "spending", "prices": "price", "wealth": "wealth",
    "investors": "investor", "protect": "protect", "purchasing": "purchasing", "power": "power",
    "financial": "financial", "preserving": "preserve", "capital": "capital", "companies": "company",
    "borrowed": "borrow", "debts": "debt", "trouble": "trouble", "businesses": "business",
    "fail": "fail", "risk": "risk", "grows": "grow", "secure": "secure", "funds": "fund",
    "online": "online", "liquidity": "liquidity", "crunch": "crunch", "sufficient": "sufficient",
    "cycle": "cycle", "forced": "force", "plans": "plan", "assets": "asset", "inflation": "inflation",
    "steady": "steady", "cash": "cash", "flow": "flow", "dreams": "dream", "safe": "safe", "future": "future"
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
let sCursor = 0;
// P1:3, P2:3, P3:2
const PARA_STRUCTURE = [3, 3, 2];

PARA_STRUCTURE.forEach((start, i) => {
    const paraId = `fin-p${i + 1}-7`;
    const dimSentences = [];

    for (let k = 0; k < start; k++) {
        const sData = SENTENCES[sCursor++];
        const sId = `fin-p${i + 1}_s${k + 1}-7`;
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

export const financeArticle7: Article = {
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
        id: 'intro-finance-7',
        text: \`${INTRO}\`
    },
    title: {
        type: 'title',
        id: 'title-finance-7',
        zh: '${META.title_zh}',
        en: '${META.title_en}'
    },
    paragraphs: ${JSON.stringify(finalParagraphs, null, 8)},
    glossary: ${JSON.stringify(glossaryMap, null, 8)}
};
`;

const outPath = path.join(__dirname, '../../src/data/articles/2026-01-15/20260115_stagflation_debt_7.ts');
fs.writeFileSync(outPath, fileContent);
console.log("Written to " + outPath);
