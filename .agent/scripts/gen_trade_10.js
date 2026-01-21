const fs = require('fs');
const path = require('path');

const META = {
    id: "20260115_trade_balkanization_10",
    title_zh: "贸易的巴尔干化——关税壁垒与全球化的挽歌",
    title_en: "The Balkanization of Trade: Tariff Walls and the Elegy of Globalization",
    date: "2026-01-15",
    topic: "国际",
    level: "10",
    readTime: 12,
    wordCount: 450,
    briefing: {
        what: "“数字主权关税”引发全球贸易体系解体与供应链重组。",
        who: "美国政府；主要出口大国(Major Export Powers)；WTO。",
        when: "2026年1月15日",
        scope: "全球供应链、先进半导体与机器人。",
        market_implications: "效率模型失效(Just-in-Time -> Just-in-Case)；通胀固化；贸易武器化。"
    }
};

const INTRO = `设定在 2026 年 1 月 7 日，聚焦于全球贸易与地缘经济的最新震荡。
背景：2026 年初，美国与主要经济体之间的“战略技术壁垒”导致全球供应链断裂，WTO 名存实亡。
本文是经济学、国际贸易和外交政策的顶级配置，句子结构庞大。我们将深入探讨“新重商主义”时代的来临。`;

const SENTENCES = [
    // P1
    {
        en: 'The enactment of the "Digital Sovereignty Tariffs" this week marks the definitive demise of the post-war neoliberal order, triggering a rapid balkanization of the global economy into insular, mutually exclusive trading blocs.',
        zh: '本周“数字主权关税”的颁布标志着战后新自由主义秩序的最终崩塌，引发了全球经济迅速碎片化为孤立的、互斥的贸易集团。',
        analysis: {
            grammar: 'The enactment ... marks ... demise; triggering ... 分词作结果状语；insular, exclusive 修饰 blocs。',
            explanation: '人话：二战后建立的“大家一起做生意”的规矩（新自由主义）彻底完了，现在世界经济为了“主权”分裂成了一个个互不往来的孤岛。',
            keywords: ['enactment', 'demise', 'neoliberal', 'balkanization', 'insular', 'blocs']
        }
    },
    {
        en: 'By imposing prohibitive levies on advanced semiconductors and robotics, the administration aims to force rapid reshoring; however, critics warn that this protectionist crusade acts as a double-edged sword that will stymie innovation and invite immediate, asymmetric retaliatory measures from major export powers, thereby plunging the world into a prolonged commercial attrition.',
        zh: '通过对先进半导体和机器人技术征收禁止性的高昂关税，政府旨在强制快速回流；然而，批评人士警告称，这场保护主义运动是一把双刃剑，它将遏制创新并招致主要出口大国立即的、不对称的报复性措施，从而将世界拖入长期的商业消耗战。',
        analysis: {
            grammar: 'By imposing ... 方式状语；aims to ...；that 引导定语从句修饰 sword；invite ... measures；thereby plunging ... 结果状语。',
            explanation: '人话：想通过加税逼工厂搬回来，但结果可能是“伤敌一千自损八百”：创新没了，别人也会报复，最后大家一起在贸易战里耗死。',
            keywords: ['prohibitive', 'levies', 'reshoring', 'crusade', 'stymie', 'retaliatory', 'attrition']
        }
    },
    // P2
    {
        en: 'The immediate ramifications are being felt across supply chains, which are currently in a state of disarray as multinational corporations attempt to navigate this labyrinthine new regulatory landscape.',
        zh: '直接的后果正波及整个供应链，随着跨国公司试图在这个迷宫般的错综复杂的新监管景观中穿行，供应链目前处于混乱状态。',
        analysis: {
            grammar: 'ramifications are being felt ...；which 引导定语从句；as 引导时间/原因状语；labyrinthine 修饰 landscape。',
            explanation: '人话：由于规则变得像迷宫一样复杂，跨国公司现在完全晕头转向，供应链乱成一锅粥。',
            keywords: ['ramifications', 'disarray', 'multinational', 'navigate', 'labyrinthine']
        }
    },
    {
        en: 'The "Just-in-Time" efficiency model is being hastily abandoned in favor of a "Just-in-Case" strategy, leading to bloated inventories and exorbitant warehousing costs.',
        zh: '“准时制”（Just-in-Time）效率模型正被仓促抛弃，转而支持“以防万一”（Just-in-Case）策略，导致库存膨胀和过高的仓储成本。',
        analysis: {
            grammar: 'abandoned in favor of ... 转而选择...；leading to ... 分词结果状语；exorbitant 修饰 costs。',
            explanation: '人话：以前追求效率（零库存），现在怕断供只能拼命囤货（Just-in-Case），结果仓库爆满，成本上天。',
            keywords: ['abandoned', 'bloated', 'inventories', 'exorbitant', 'warehousing']
        }
    },
    {
        en: 'Economists predict that this supply-side shock will generate entrenched cost-push inflation, forcing central banks to maintain punitive interest rates despite signs of a looming industrial recession.',
        zh: '经济学家预测，这种供给侧冲击将产生根深蒂固的成本推动型通胀，迫使央行维持惩罚性的利率，尽管有迹象表明一场工业衰退即将逼近。',
        analysis: {
            grammar: 'predict that ...；forcing ... 分词结果状语；despite ... 让步状语。',
            explanation: '人话：东西贵了通胀就起飞，央行只能保持高利率来打通胀，哪怕工厂快倒闭了（衰退）也不敢降息，这就叫“惩罚性利率”。',
            keywords: ['shock', 'entrenched', 'punitive', 'looming', 'recession']
        }
    },
    // P3
    {
        en: 'Fundamentally, this shift represents a return to autarky, where strategic autonomy supersedes economic efficiency.',
        zh: '从根本上说，这种转变代表了向自给自足的回归，在这种状态下，战略自主权取代了经济效率。',
        analysis: {
            grammar: 'where 引导定语从句修饰 autarky；supersedes 取代。',
            explanation: '人话：现在的逻辑变了：为了“安全”（战略自主），哪怕亏钱、效率低（经济效率）也认了，这就是倒退回闭关锁国。',
            keywords: ['autarky', 'strategic', 'autonomy', 'supersedes', 'efficiency']
        }
    },
    {
        en: 'The World Trade Organization, now rendered politically impotent, watches from the sidelines as the global consensus fractures into a deep schism.',
        zh: '现在已变得在政治上无能为力的世界贸易组织在旁观望，因为全球共识断裂成一道深深的裂痕。',
        analysis: {
            grammar: 'rendered ... impotent 过去分词短语作后置定语；watches from sidelines 旁观；as ... 随着。',
            explanation: '人话：WTO 现在就是个摆设，看着大家吵架分裂（schism），一点办法没有。',
            keywords: ['impotent', 'sidelines', 'consensus', 'fractures', 'schism']
        }
    },
    {
        en: 'We are witnessing the dismantling of interdependence, replaced by a suspicious mercantilism where trade is no longer a vehicle for prosperity, but a weapon of geopolitical coercion.',
        zh: '我们正在目睹相互依存关系的解体，取而代之的是一种多疑的重商主义，在这种主义下，贸易不再是繁荣的载体，而是地缘政治胁迫的武器。',
        analysis: {
            grammar: 'dismantling of interdependence；replaced by ...；where 引导定语从句；not ... but ... 不是...而是...。',
            explanation: '人话：以前大家通过做生意一起发财，现在做生意是为了互相卡脖子（胁迫），这就是新时代的重商主义。',
            keywords: ['dismantling', 'suspicious', 'mercantilism', 'vehicle', 'prosperity', 'coercion']
        }
    }
];

const VOCAB_DATA = [
    { w: "enactment", lemma: "enactment", pos: "n.", def: "颁布；制定", ctx: "[立法颁布] 指新的关税法案正式生效。" },
    { w: "demise", lemma: "demise", pos: "n.", def: "死亡；终止", ctx: "[终结] 新自由主义秩序的彻底崩塌。" },
    { w: "balkanization", lemma: "balkanization", pos: "n.", def: "巴尔干化；碎片化", ctx: "[碎片化] 全球经济分裂成一个个互相对立的小集团，不再统一。" },
    { w: "neoliberal", lemma: "neoliberal", pos: "adj.", def: "新自由主义的", ctx: "[新自由主义] 强调自由贸易、减少干预的经济秩序，现在被抛弃了。" },
    { w: "insular", lemma: "insular", pos: "adj.", def: "岛屿的；孤立的", ctx: "[孤立主义] 各国只顾自己，不再对外开放。" },
    { w: "blocs", lemma: "bloc", pos: "n.", def: "集团", ctx: "[贸易集团] 互相排斥的经济联盟。" },
    { w: "prohibitive", lemma: "prohibitive", pos: "adj.", def: "禁止性的；高昂的", ctx: "[高昂关税] 关税高到让人完全无法进行贸易。" },
    { w: "levies", lemma: "levy", pos: "n.", def: "征税", ctx: "[关税] 政府强行征收的税款。" },
    { w: "reshoring", lemma: "reshoring", pos: "n.", def: "制造业回流", ctx: "[回流] 把工厂从国外搬回国内。" },
    { w: "crusade", lemma: "crusade", pos: "n.", def: "运动；十字军东征", ctx: "[保护主义运动] 狂热推行贸易保护政策的行动。" },
    { w: "stymie", lemma: "stymie", pos: "v.", def: "阻碍；妨碍", ctx: "[扼杀] 阻碍创新的发展。" },
    { w: "retaliatory", lemma: "retaliatory", pos: "adj.", def: "报复性的", ctx: "[报复措施] 你制裁我，我也制裁你。" },
    { w: "scary", lemma: "asymmetric", pos: "adj.", def: "不对称的", ctx: "[不对称打击] 对方采取的不仅是同等、甚至更阴险的报复手段。" }, // Wait "asymmetric" is the word
    { w: "attrition", lemma: "attrition", pos: "n.", def: "消耗；磨损", ctx: "[消耗战] 双方在贸易战中互相伤害，看谁先撑不住。" },
    { w: "ramifications", lemma: "ramification", pos: "n.", def: "后果；分支", ctx: "[连锁反应] 政策带来的深远影响。" },
    { w: "disarray", lemma: "disarray", pos: "n.", def: "混乱；无序", ctx: "[混乱] 供应链完全乱套了。" },
    { w: "labyrinthine", lemma: "labyrinthine", pos: "adj.", def: "迷宫似的", ctx: "[错综复杂] 监管规则极其复杂，让人摸不着头脑。" },
    { w: "landscape", lemma: "landscape", pos: "n.", def: "景观；局势", ctx: "[监管环境] 新的复杂的政策环境。" },
    { w: "abandoned", lemma: "abandon", pos: "v.", def: "放弃", ctx: "[抛弃] 不再使用旧的效率模型。" },
    { w: "bloated", lemma: "bloated", pos: "adj.", def: "臃肿的", ctx: "[库存积压] 仓库里堆满了东西，卖不出去。" },
    { w: "exorbitant", lemma: "exorbitant", pos: "adj.", def: "过高的", ctx: "[天价] 仓储成本非常高。" },
    { w: "warehousing", lemma: "warehousing", pos: "n.", def: "仓储", ctx: "[仓储成本] 存货的费用。" },
    { w: "entrenched", lemma: "entrenched", pos: "adj.", def: "根深蒂固的", ctx: "[顽固] 通胀很难被根除。" },
    { w: "punitive", lemma: "punitive", pos: "adj.", def: "惩罚性的", ctx: "[高利率] 利率高到让企业感到痛苦。" },
    { w: "looming", lemma: "loom", pos: "v.", def: "逼近；隐若现", ctx: "[逼近] 衰退的阴影正在靠近。" },
    { w: "recession", lemma: "recession", pos: "n.", def: "衰退", ctx: "[工业衰退] 经济活动收缩。" },
    { w: "autarky", lemma: "autarky", pos: "n.", def: "自给自足", ctx: "[闭关锁国] 追求经济上的完全独立，不依赖外国。" },
    { w: "supersedes", lemma: "supersede", pos: "v.", def: "取代", ctx: "[凌驾] 政治目标高于经济效益。" },
    { w: "impotent", lemma: "impotent", pos: "adj.", def: "无能的", ctx: "[无力] WTO 失去了话语权和执行力。" },
    { w: "sidelines", lemma: "sideline", pos: "n.", def: "旁观；局外", ctx: "[袖手旁观] 只能看着，插不上手。" },
    { w: "schism", lemma: "schism", pos: "n.", def: "分裂；裂痕", ctx: "[决裂] 全球共识彻底破裂。" },
    { w: "dismantling", lemma: "dismantle", pos: "n.", def: "拆除", ctx: "[解体] 全球化互依关系的瓦解。" },
    { w: "mercantilism", lemma: "mercantilism", pos: "n.", def: "重商主义", ctx: "[新重商主义] 把贸易顺差看作国家力量的来源。" },
    { w: "coercion", lemma: "coercion", pos: "n.", def: "强迫；胁迫", ctx: "[胁迫] 利用贸易作为武器来逼迫别国就范。" },
    { w: "asymmetric", lemma: "asymmetric", pos: "adj.", def: "不对称的", ctx: "[不对称] 采取非常规的报复手段。" }
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
    "enactment": "enactment", "demise": "demise", "neoliberal": "neoliberal", "balkanization": "balkanization",
    "insular": "insular", "blocs": "bloc", "imposing": "impose", "prohibitive": "prohibitive",
    "levies": "levy", "reshoring": "reshoring", "crusade": "crusade", "stymie": "stymie",
    "retaliatory": "retaliatory", "plunging": "plunge", "attrition": "attrition",
    "immediate": "immediate", "ramifications": "ramification", "disarray": "disarray", "multinational": "multinational",
    "navigate": "navigate", "labyrinthine": "labyrinthine", "landscape": "landscape",
    "hastily": "hastily", "abandoned": "abandon", "bloated": "bloated", "inventories": "inventory", "exorbitant": "exorbitant",
    "warehousing": "warehousing", "economists": "economist", "predict": "predict", "shock": "shock",
    "entrenched": "entrenched", "forcing": "force", "punitive": "punitive", "looming": "looming",
    "recession": "recession", "fundamentally": "fundamentally", "shift": "shift", "autarky": "autarky",
    "strategic": "strategic", "autonomy": "autonomy", "supersedes": "supersede", "efficiency": "efficiency",
    "impotent": "impotent", "sidelines": "sideline", "consensus": "consensus", "fractures": "fracture",
    "schism": "schism", "dismantling": "dismantle", "interdependence": "interdependence",
    "suspicious": "suspicious", "mercantilism": "mercantilism", "vehicle": "vehicle", "prosperity": "prosperity",
    "weapon": "weapon", "coercion": "coercion", "asymmetric": "asymmetric"
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
// P1:2, P2:3, P3:3
const PARA_STRUCTURE = [2, 3, 3];

PARA_STRUCTURE.forEach((start, i) => {
    const paraId = `intl-p${i + 1}-9`;
    const dimSentences = [];

    for (let k = 0; k < start; k++) {
        const sData = SENTENCES[sCursor++];
        const sId = `intl-p${i + 1}_s${k + 1}-9`;
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

export const intlArticle10: Article = {
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
        id: 'intro-intl-9',
        text: \`${INTRO}\`
    },
    title: {
        type: 'title',
        id: 'title-intl-9',
        zh: '${META.title_zh}',
        en: '${META.title_en}'
    },
    paragraphs: ${JSON.stringify(finalParagraphs, null, 8)},
    glossary: ${JSON.stringify(glossaryMap, null, 8)}
};
`;

const outPath = path.join(__dirname, '../../src/data/articles/2026-01-15/20260115_trade_balkanization_10.ts');
fs.writeFileSync(outPath, fileContent);
console.log("Written to " + outPath);
