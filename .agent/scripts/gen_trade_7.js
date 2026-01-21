const fs = require('fs');
const path = require('path');

const META = {
    id: "20260115_trade_balkanization_7",
    title_zh: "贸易的碎片化：关税壁垒与全球化的挽歌",
    title_en: "The Fragmentation of Trade: Tariff Walls and the Elegy of Globalization",
    date: "2026-01-15",
    topic: "国际",
    level: "7",
    readTime: 12,
    wordCount: 440,
    briefing: {
        what: "“数字主权关税”引发全球贸易体系解体与供应链重组。",
        who: "美国政府；主要出口大国(Major Export Powers)；WTO。",
        when: "2026年1月15日",
        scope: "全球供应链、先进半导体与机器人。",
        market_implications: "效率模型失效(Just-in-Time -> Just-in-Case)；通胀固化；贸易武器化。"
    }
};

const INTRO = `这篇文章详细讨论 2026 年初期全球贸易的重大转折。
背景：各国政府开始筑起技术墙，这导致了全球供应链的断裂。
我们将分析为什么自由贸易正在消失，以及国家为何开始选择“安全”而非“利润”。`;

const SENTENCES = [
    // P1
    {
        en: 'The new "Digital Sovereignty Tariffs" this week mark the end of the old global trade system, causing the world economy to split into isolated and exclusive trading groups.',
        zh: '本周颁布的新“数字主权关税”标志着旧全球贸易体系的结束，导致世界经济分裂为孤立且互斥的贸易集团。',
        analysis: {
            grammar: 'mark the end ... 标志着...的结束；causing ... 分词作结果状语。',
            explanation: '人话：以前全球大家一起做生意的规矩变了。由于加税，世界经济现在像巴尔干半岛一样，碎成了很多互不往来的小团体。',
            keywords: ['sovereignty', 'tariffs', 'isolated', 'exclusive']
        }
    },
    {
        en: 'By putting high taxes on advanced chips and robots, the government wants to restore manufacturing in their own country; however, experts warn that this will stop new ideas and lead to immediate retaliation from other export countries, starting a long trade war.',
        zh: '通过对先进芯片和机器人征收高额税金，政府希望让工厂回到自己的国家；然而，专家警告说，这会阻碍创新并引发其他出口国的报复，从而开启长期的贸易战。',
        analysis: {
            grammar: 'By putting ... 通过...方式；restore ... 恢复；retaliation 报复。',
            explanation: '人话：政府想用关税逼工厂搬回来。但代价很大：技术进步变慢，别的国家也会对我们进行报复，大家在贸易战里互相消耗。',
            keywords: ['taxes', 'manufacturing', 'retaliation']
        }
    },
    {
        en: 'As a result, the hope for a single global market is disappearing, and businesses must now prepare for a future where trade is more difficult and expensive.',
        zh: '结果，建立统一全球市场的希望正在消失，企业现在必须为一个贸易更加困难且昂贵的未来做准备。',
        analysis: {
            grammar: 'As a result 结果是；where 引导定语从句修饰 future。',
            explanation: '人话：全球化的好日子到头了。以前全世界是一个大市场，现在到处是墙，做生意的成本会越来越高。',
            keywords: ['market', 'disappearing', 'difficult', 'expensive']
        }
    },
    // P2
    {
        en: 'Supply chains are currently in a state of chaos as multinational companies attempt to follow these complex and confusing new rules.',
        zh: '由于跨国公司试图遵循这些复杂且令人困惑的新规则，供应链目前处于混乱状态。',
        analysis: {
            grammar: 'in a state of chaos 处于混乱状态；as 引导原因/时间状语。',
            explanation: '人话：由于规则每时每刻都在变，而且非常复杂，跨国贸易的运输和供应现在乱成一团，公司都不知道该听谁的。',
            keywords: ['supply chains', 'chaos', 'multinational', 'confusing']
        }
    },
    {
        en: 'The "Just-in-Time" model, which focused on speed and low waste, is being abandoned; instead, companies are using a "Just-in-Case" strategy, leading to very high costs for storage and warehouses.',
        zh: '曾专注于速度和低浪费的“准时制”模型正在被抛弃；相反，公司正在使用“以防万一”策略，导致存储和仓库的高昂成本。',
        analysis: {
            grammar: 'being abandoned 被抛弃；instead 相反；costs for storage ... 仓储成本。',
            explanation: '人话：以前为了省钱不留库存（Just-in-Time），现在怕断供只能拼命囤货（Just-in-Case），结果仓库租金贵得吓人。',
            keywords: ['abandoned', 'strategy', 'costs', 'storage', 'warehouses']
        }
    },
    {
        en: 'Economists believe that these problems will make prices go up for everyone, forcing central banks to keep interest rates high even when the economy is weak.',
        zh: '经济学家认为，这些问题将使每个人的生活成本上升，迫使央行即便在经济虚弱时也要维持高利率。',
        analysis: {
            grammar: 'force sb. to do 迫使某人做...；even when 即使当...。',
            explanation: '人话：囤货多了、成本高了，物价就会涨（通胀）。央行为了打通胀只能涨利息，这会让日子更不好过。',
            keywords: ['economists', 'prices', 'forcing', 'economy', 'weak']
        }
    },
    // P3
    {
        en: 'Basically, this shift shows that countries now value their national safety more than economic efficiency.',
        zh: '基本上，这种转变表明，国家现在比起经济效率更看重国家安全。',
        analysis: {
            grammar: 'value A more than B 看重A胜过B。',
            explanation: '人话：现在的逻辑变了：哪怕多花钱、效率低，也得保证东西是自己做的，或者是在安全的朋友那里买的。',
            keywords: ['shift', 'value', 'safety', 'efficiency']
        }
    },
    {
        en: 'The World Trade Organization (WTO) has lost its authority, and it can only watch as global rules break into many different pieces.',
        zh: '世界贸易组织（WTO）已经失去了权力，当全球规则支离破碎时，它只能在一旁观看。',
        analysis: {
            grammar: 'lost its authority 失去权威；watch as ... 看着...发生。',
            explanation: '人话：WTO 以前是管做生意的裁判，现在大家都各搞各的，它说话没人听了，只能当个看客。',
            keywords: ['authority', 'watch', 'rules']
        }
    },
    {
        en: 'We are seeing the end of global cooperation, replaced by a system where trade is not a way to share wealth, but a weapon to intimidate other countries.',
        zh: '我们正在看到全球合作的终结，取而代之的是一种将贸易不作为分享财富的方式，而是作为威胁其他国家的武器。',
        analysis: {
            grammar: 'replaced by ... 被...取代；not ... but ... 不是...而是...。',
            explanation: '人话：以前大家合作赚大钱，现在做生意是为了卡脖子。贸易不再是发财的工具，而是打仗的“武器”。',
            keywords: ['cooperation', 'wealth', 'weapon', 'intimidate']
        }
    }
];

const VOCAB_DATA = [
    { w: "sovereignty", lemma: "sovereignty", pos: "n.", def: "主权", ctx: "[数字主权] 国家对本国数字数据和技术的控制权。" },
    { w: "tariffs", lemma: "tariff", pos: "n.", def: "关税", ctx: "[关税壁垒] 政府对进口商品征收的税，用于保护本国产业。" },
    { w: "isolated", lemma: "isolated", pos: "adj.", def: "孤立的", ctx: "[孤立] 各国切断联系，不再互通有无。" },
    { w: "exclusive", lemma: "exclusive", pos: "adj.", def: "排他的；独有的", ctx: "[互斥] 贸易集团只对自己人开放，排斥外人。" },
    { w: "manufacturing", lemma: "manufacturing", pos: "n.", def: "制造业", ctx: "[工厂] 生产商品的工业部门。" },
    { w: "taxes", lemma: "tax", pos: "n.", def: "税收", ctx: "[高额税金] 针对进口芯片和机器人的罚款性收税。" },
    { w: "retaliation", lemma: "retaliation", pos: "n.", def: "报复", ctx: "[贸易报复] 别人加关税，我也加关税打回去。" },
    { w: "market", lemma: "market", pos: "n.", def: "市场", ctx: "[全球市场] 全世界统一的做生意的地方。" },
    { w: "disappearing", lemma: "disappear", pos: "v.", def: "消失", ctx: "[消亡] 统一市场的希望正在破灭。" },
    { w: "difficult", lemma: "difficult", pos: "adj.", def: "困难的", ctx: "[艰难] 做生意面临更多障碍。" },
    { w: "expensive", lemma: "expensive", pos: "adj.", def: "昂贵的", ctx: "[高成本] 关税和运费让商品变得很贵。" },
    { w: "supply chains", lemma: "supply chain", pos: "n.", def: "供应链", ctx: "[供应链] 产品从原料到成品的整个运输网络。" },
    { w: "chaos", lemma: "chaos", pos: "n.", def: "混乱", ctx: "[混乱] 秩序完全乱套了。" },
    { w: "multinational", lemma: "multinational", pos: "adj.", def: "跨国的", ctx: "[跨国公司] 在很多国家做生意的大公司。" },
    { w: "confusing", lemma: "confusing", pos: "adj.", def: "令人困惑的", ctx: "[复杂] 规则太乱，让人看不懂。" },
    { w: "abandoned", lemma: "abandon", pos: "v.", def: "抛弃", ctx: "[放弃] 不再使用旧的模式。" },
    { w: "strategy", lemma: "strategy", pos: "n.", def: "策略", ctx: "[以防万一] 多囤货以防断供的商业策略。" },
    { w: "storage", lemma: "storage", pos: "n.", def: "存储", ctx: "[库存] 存放货物。" },
    { w: "warehouses", lemma: "warehouse", pos: "n.", def: "仓库", ctx: "[库房] 存放商品的大型建筑。" },
    { w: "economists", lemma: "economist", pos: "n.", def: "经济学家", ctx: "[专家] 研究经济规律的人。" },
    { w: "forcing", lemma: "force", pos: "v.", def: "强迫", ctx: "[迫使] 让央行别无选择，只能加息。" },
    { w: "economy", lemma: "economy", pos: "n.", def: "经济", ctx: "[经济状况] 国家的生产和消费活动。" },
    { w: "weak", lemma: "weak", pos: "adj.", def: "虚弱的", ctx: "[衰退] 经济增长乏力。" },
    { w: "shift", lemma: "shift", pos: "n.", def: "转变", ctx: "[转型] 这种政策上的根本变动。" },
    { w: "value", lemma: "value", pos: "v.", def: "重视", ctx: "[看重] 认为某事更重要。" },
    { w: "safety", lemma: "safety", pos: "n.", def: "安全", ctx: "[国家安全] 国家的生存和平安。" },
    { w: "efficiency", lemma: "efficiency", pos: "n.", def: "效率", ctx: "[经济效率] 以最低成本获得最大收益。" },
    { w: "authority", lemma: "authority", pos: "n.", def: "权威；权力", ctx: "[话语权] WTO 管理全球贸易的能力。" },
    { w: "cooperation", lemma: "cooperation", pos: "n.", def: "合作", ctx: "[协作] 各国联手发展经济。" },
    { w: "wealth", lemma: "wealth", pos: "n.", def: "财富", ctx: "[繁荣] 经济增长带来的好处。" },
    { w: "weapon", lemma: "weapon", pos: "n.", def: "武器", ctx: "[工具] 用来攻击或威胁对手的手段。" },
    { w: "intimidate", lemma: "intimidate", pos: "v.", def: "恐吓", ctx: "[威慑] 吓唬别的国家。" }
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
    "sovereignty": "sovereignty", "tariffs": "tariff", "isolated": "isolated", "exclusive": "exclusive",
    "taxes": "tax", "manufacturing": "manufacturing", "retaliation": "retaliation", "market": "market",
    "disappearing": "disappear", "difficult": "difficult", "expensive": "expensive",
    "supply": "supply", "chains": "chain", "chaos": "chaos", "multinational": "multinational",
    "confusing": "confusing", "abandoned": "abandon", "strategy": "strategy", "costs": "cost",
    "storage": "storage", "warehouses": "warehouse", "economists": "economist", "prices": "price",
    "forcing": "force", "economy": "economy", "weak": "weak", "shift": "shift", "value": "value",
    "safety": "safety", "efficiency": "efficiency", "authority": "authority", "cooperation": "cooperation",
    "wealth": "wealth", "weapon": "weapon", "intimidate": "intimidate"
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
// P1:3, P2:3, P3:3
const PARA_STRUCTURE = [3, 3, 3];

PARA_STRUCTURE.forEach((start, i) => {
    const paraId = `intl-p${i + 1}-7`;
    const dimSentences = [];

    for (let k = 0; k < start; k++) {
        const sData = SENTENCES[sCursor++];
        const sId = `intl-p${i + 1}_s${k + 1}-7`;
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

export const intlArticle7: Article = {
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
        id: 'intro-intl-7',
        text: \`${INTRO}\`
    },
    title: {
        type: 'title',
        id: 'title-intl-7',
        zh: '${META.title_zh}',
        en: '${META.title_en}'
    },
    paragraphs: ${JSON.stringify(finalParagraphs, null, 8)},
    glossary: ${JSON.stringify(glossaryMap, null, 8)}
};
`;

const outPath = path.join(__dirname, '../../src/data/articles/2026-01-15/20260115_trade_balkanization_7.ts');
fs.writeFileSync(outPath, fileContent);
console.log("Written to " + outPath);
