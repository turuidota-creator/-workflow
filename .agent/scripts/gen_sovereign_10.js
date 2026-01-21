const fs = require('fs');
const path = require('path');

// ================= CONSTANTS & DATA =================

const META = {
    id: "20260115_sovereign_ai_10",
    title_zh: "硅幕降临：主权 AI",
    title_en: "The Silicon Curtain: Sovereign AI Clouds, Energy Bottlenecks, and Computational Protectionism",
    date: "2026-01-15",
    topic: "科技",
    level: "10",
    readTime: 12,
    wordCount: 470,
    briefing: {
        what: "全球竞相建设“主权AI云”防止数据外流。",
        who: "各国政府；超大规模云服务商(Hyperscalers)。",
        when: "2026年1月15日",
        scope: "数字基础设施、能源供应与半导体。",
        market_implications: "互联网碎片化；核能资产溢价；算力保护主义抬头。"
    }
};

const INTRO = `深入探讨“主权 AI 云”兴起背后的地缘博弈：算力、数据与能源的终极冲突。
背景：AI 算力已成为国家生存的“核心战备资源”。
我们将探究科技巨头如何通过核能收购来突破能源瓶颈，以及各国如何在这场“数字圈地运动”中争夺算力霸权。`;

const SENTENCES = [
    // P1
    {
        en: 'The frantic construction of "Sovereign AI Clouds" has rapidly evolved into the contemporary equivalent of the Manhattan Project, compelling powerful nations to mandate aggressive data localization laws that effectively Balkanize the global internet into distinct, impermeable digital fiefdoms.',
        zh: '“主权 AI 云”的疯狂建设已迅速演变为当代的“曼哈顿计划”，迫使各大国强制实施激进的数据本地化法律，这实际上将全球互联网碎片化为独特的、不可渗透的数字封建领地。',
        analysis: {
            grammar: '用 "compelling" 引导结果状语，"that" 引导定语从句修饰 laws。',
            explanation: '人话：AI 太重要了，各国吓得赶紧把数据锁在自家院子里，搞得互联网跟以前的封建领地一样，谁也进不来。',
            keywords: ['sovereign', 'equivalent', 'mandate', 'Balkanize']
        }
    },
    {
        en: 'Governments are now actively subsiding indigenous foundation models to preempt "algorithmic colonization," strategically ensuring that the unique cultural, linguistic, and ideological nuances encoded within Large Language Models (LLMs) remain strictly aligned with specific national interests and security imperatives.',
        zh: '各国政府现在正积极补贴本土基础大模型以抢占先机，防止“算法殖民”，策略性地确保大语言模型（LLMs）中所编码的独特的文化、语言和意识形态细微差别与特定国家利益和安全要求保持严格一致。',
        analysis: {
            grammar: '"ensuring that..." 作伴随状语，解释补贴的目的。',
            explanation: '人话：国家贴钱养自家的 AI，就是怕大家的脑子都被外国 AI 给洗了。必须确保 AI 说的话、讲的道理符合咱们的价值观。',
            keywords: ['indigenous', 'preempt', 'nuances', 'aligned']
        }
    },
    // P2
    {
        en: 'This unprecedented trajectory of computational exponentiality is increasingly colliding with intractable physical energy constraints, driving hyperscalers to acquire behind-the-meter nuclear assets, a strategic pivot that is effectively merging the high-stakes semiconductor and utility sectors.',
        zh: '这种前所未有的算力指数级增长正日益与棘手的物理能源限制发生碰撞，促使超大规模云服务商收购“表后”核能资产。这一战略转向正在有效地合并高风险的半导体和公用事业部门。',
        analysis: {
            grammar: '"driving..." 作结果状语；"a strategic pivot" 是前面动作的同位语。',
            explanation: '人话：AI 算力增长太快，电网跟不上了。为了不让服务器停电，巨头们开始买核电站，直接让电厂和数据中心对接。',
            keywords: ['trajectory', 'intractable', 'hyperscalers', 'pivot']
        }
    },
    {
        en: 'The structural bottleneck has shifted decisively from silicon lithography to gigawatt-scale power availability, rendering reliable carbon-free electricity the ultimate "hard currency" in the intensifying global AI arms race.',
        zh: '结构性瓶颈已果断从硅光刻技术转移到吉瓦级的电力供应能力，使可靠的无碳电力成为不断加剧的全球 AI 军备竞赛中的终极“硬通货”。',
        analysis: {
            grammar: '"rendering..." 作结果状语，表示由此造成的状态。',
            explanation: '人话：以前造不出芯片是瓶颈，现在没电才是瓶颈。谁手里有稳定的绿电（核电），谁才是老大。',
            keywords: ['bottleneck', 'lithography', 'gigawatt', 'currency']
        }
    },
    // P3
    {
        en: 'We are witnessing the onset of a new era of "algorithmic mercantilism," where stringent export controls target not just physical hardware assets, but the very mathematical weights and biases of foundational models, defining the new and highly contentious frontier of national security.',
        zh: '我们正在目睹一个“算法重商主义”新时代的到来。在这种主义下，严格的出口管制不仅针对物理硬件资产，还针对基础模型的数学权重和偏置，这定义了国家安全的新且极具争议的前沿。',
        analysis: {
            grammar: '"where" 引导定语从句修饰 era；"defining" 作结果状语。',
            explanation: '人话：以前只禁运芯片，现在连模型里的参数（权重）也不让发了。这种把技术当私产一样保护起来的做法，就是新时代的重商主义。',
            keywords: ['mercantilism', 'weights', 'biases', 'frontier']
        }
    },
    {
        en: 'Consequently, the egalitarian open-source ethos that successfully propelled the initial AI boom is being systematically stifled by a new regime of strategic secrecy and aggressive intellectual property enclosure.',
        zh: '因此，成功推动了 AI 初期繁荣的平等开源精神，正被一种战略保密和激进知识产权圈地的新体制系统性地扼杀。',
        analysis: {
            grammar: '被动语态 "is being stifled"；"that" 引导定语从句修饰 ethos。',
            explanation: '人话：也就是大家以前一起写代码的日子结束了。为了竞争，大公司开始把技术锁死，像当年的圈地运动一样搞技术垄断。',
            keywords: ['ethos', 'propelled', 'stifled', 'enclosure']
        }
    }
];

const VOCAB_DATA = [
    { w: "sovereign", lemma: "sovereign", pos: "adj.", def: "拥有独立主权的", ctx: "[主权] 指国家对AI基础设施拥有完全控制权，不受外国干涉。" },
    { w: "mandate", lemma: "mandate", pos: "v.", def: "强制执行；授权", ctx: "[立法强制] 政府通过法律强行要求企业执行数据本地化策略。" },
    { w: "localization", lemma: "localization", pos: "n.", def: "本地化", ctx: "[数据本地化] 规定核心数据必须存储在境内服务器，禁止出境。" },
    { w: "balkanize", lemma: "balkanize", pos: "v.", def: "使分裂；割据", ctx: "[碎片化] 互联网从一个整体分裂成一个个互不相通的区域网络。" },
    { w: "impermeable", lemma: "impermeable", pos: "adj.", def: "不可渗透的", ctx: "[严密封锁] 指数字边界严密，外部数据流无法自由进入。" },
    { w: "fiefdom", lemma: "fiefdom", pos: "n.", def: "封地；领地", ctx: "[数字领地] 互联网被各大国割裂成一个个像封建领地一样的封闭区域。" },
    { w: "indigenous", lemma: "indigenous", pos: "adj.", def: "本土的", ctx: "[国产自主] 指由本国独立研发、掌握核心技术的基础模型。" },
    { w: "preempt", lemma: "preempt", pos: "v.", def: "预先阻止；抢占", ctx: "[战略抢占] 提前布局技术高地，防止被外国算法控制话语权。" },
    { w: "colonization", lemma: "colonization", pos: "n.", def: "殖民", ctx: "[算法殖民] 指外国AI通过输出价值观潜移默化地控制本国用户的思想。" },
    { w: "nuance", lemma: "nuance", pos: "n.", def: "细微差别", ctx: "[文化微差] 只有本国AI才能准确理解的文化梗、价值观和语言细节。" },
    { w: "imperative", lemma: "imperative", pos: "n.", def: "必要的事；命令", ctx: "[安全铁律] 关系到国家生存发展的绝对安全要求。" },
    { w: "trajectory", lemma: "trajectory", pos: "n.", def: "轨道；轨迹", ctx: "[发展路径] AI技术当前这种疯狂的发展势头。" },
    { w: "exponentiality", lemma: "exponentiality", pos: "n.", def: "指数级增长性质", ctx: "[算力爆炸] 指AI对算力和能源的需求呈现几何级数的疯狂增长。" },
    { w: "intractable", lemma: "intractable", pos: "adj.", def: "棘手的；难治的", ctx: "[难以解决] 形容物理能源短缺问题受到物理定律限制，极难突破。" },
    { w: "hyperscaler", lemma: "hyperscaler", pos: "n.", def: "超大规模云厂商", ctx: "[云巨头] 指AWS、Google、Azure等拥有百万级服务器的科技巨阀。" },
    { w: "acquire", lemma: "acquire", pos: "v.", def: "收购；获得", ctx: "[战略收购] 云厂商直接买下核电站以确保供电。" },
    { w: "pivot", lemma: "pivot", pos: "n.", def: "支点；转向", ctx: "[战略剧变] 科技公司从单纯做软件/硬件，转向重资产的能源运营。" },
    { w: "bottleneck", lemma: "bottleneck", pos: "n.", def: "瓶颈", ctx: "[发展瓶颈] 限制AI进一步发展的最关键短板。" },
    { w: "lithography", lemma: "lithography", pos: "n.", def: "光刻技术", ctx: "[芯片制造] 之前被认为是卡脖子的核心技术，现在地位下降。" },
    { w: "gigawatt", lemma: "gigawatt", pos: "n.", def: "吉瓦 (10^9瓦)", ctx: "[吉瓦级] 衡量超大功率电力的单位，暗示AI数据中心是吞电巨兽。" },
    { w: "currency", lemma: "currency", pos: "n.", def: "货币；通货", ctx: "[硬通货] 指稳定的清洁电力在AI竞赛中像黄金一样珍贵且通用。" },
    { w: "mercantilism", lemma: "mercantilism", pos: "n.", def: "重商主义", ctx: "[算法重商主义] 国家像保护金银一样保护数据和算法，通过垄断积累国力。" },
    { w: "stringent", lemma: "stringent", pos: "adj.", def: "严格的", ctx: "[严苛] 指出口管制措施非常紧，滴水不漏。" },
    { w: "weight", lemma: "weight", pos: "n.", def: "重量；分量", ctx: "[参数权重] 神经网络内部连接的数值大小，决定了模型的“智力”。" },
    { w: "bias", lemma: "bias", pos: "n.", def: "偏见；偏置", ctx: "[数学/价值偏置] 既指神经网络的参数，也隐喻模型中隐含的价值观导向。" },
    { w: "frontier", lemma: "frontier", pos: "n.", def: "边疆；前沿", ctx: "[新战场] 国家安全争夺的最新、最激烈的领域。" },
    { w: "egalitarian", lemma: "egalitarian", pos: "adj.", def: "平等主义的", ctx: "[普惠平权] 早期希望AI技术能被所有人平等使用的理想。" },
    { w: "ethos", lemma: "ethos", pos: "n.", def: "精神气质", ctx: "[社区精神] 开源社区那种分享、协作、不藏私的文化氛围。" },
    { w: "propel", lemma: "propel", pos: "v.", def: "推进；驱动", ctx: "[推动] 促成了AI第一波爆发式增长。" },
    { w: "stifle", lemma: "stifle", pos: "v.", def: "扼杀；使窒息", ctx: "[系统性扼杀] 在新体制下，开源精神被彻底压制，无法生存。" },
    { w: "enclosure", lemma: "enclosure", pos: "n.", def: "圈地；围场", ctx: "[知识圈地] 像当年圈地运动剥夺农民土地一样，巨头将公共知识转化为私有财产。" },
    { w: "aligned", lemma: "align", pos: "v.", def: "使一致；结盟", ctx: "[保持一致] 确保AI的价值观与国家利益完全吻合。" }
];

// ================= LOGIC =================

// 1. Helper: Compute Hash
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

// 2. Build Glossary Map
const glossaryMap = {};
VOCAB_DATA.forEach(item => {
    const id = generateGlossaryId({ lemma: item.lemma, pos: item.pos, definition: item.def });
    glossaryMap[item.lemma] = {
        id: id,
        lemma: item.lemma,
        word: item.w, // Representative word
        definition: item.def,
        contextDefinition: item.ctx,
        pos: item.pos,
        pronunciation: "", // simplified
        exampleSentence: "", // Will fill later or skip
        sourceArticleId: META.id
    };
});

// Manual Map for inflections
const WORD_TO_LEMMA = {
    "sovereign": "sovereign", "clouds": "cloud", "evolved": "evolve", "compelling": "compel",
    "nations": "nation", "mandate": "mandate", "laws": "law", "balkanize": "balkanize",
    "fiefdoms": "fiefdom", "governments": "government", "subsiding": "subsidize", "indigenous": "indigenous",
    "models": "model", "preempt": "preempt", "colonization": "colonization", "nuances": "nuance",
    "aligned": "align", "imperatives": "imperative", "trajectory": "trajectory", "exponentiality": "exponentiality",
    "colliding": "collide", "intractable": "intractable", "constraints": "constraint", "hyperscalers": "hyperscaler",
    "acquire": "acquire", "assets": "asset", "pivot": "pivot", "semiconductor": "semiconductor",
    "sectors": "sector", "bottleneck": "bottleneck", "shifted": "shift", "lithography": "lithography",
    "power": "power", "availability": "availability", "rendering": "render", "electricity": "electricity",
    "currency": "currency", "mercantilism": "mercantilism", "controls": "control", "target": "target",
    "weights": "weight", "biases": "bias", "defining": "define", "frontier": "frontier",
    "egalitarian": "egalitarian", "ethos": "ethos", "propelled": "propel", "stifled": "stifle",
    "secrecy": "secrecy", "enclosure": "enclosure", "strict": "strict", "stringent": "stringent",
    "gigawatt-scale": "gigawatt"
};
VOCAB_DATA.forEach(v => WORD_TO_LEMMA[v.lemma] = v.lemma);
VOCAB_DATA.forEach(v => WORD_TO_LEMMA[v.w] = v.lemma);

// 3. Tokenize
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

// 4. Build Paragraphs
const finalParagraphs = [];
let pIdx = 0;
const PARA_STRUCTURE = [2, 2, 2];
let sCursor = 0;

PARA_STRUCTURE.forEach((start, i) => {
    const paraId = `tech-p${i + 1}-9`;
    const dimSentences = [];

    for (let k = 0; k < start; k++) {
        const sData = SENTENCES[sCursor++];
        const sId = `tech-p${i + 1}_s${k + 1}-9`;

        // Tokenize
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

// 5. Generate File Content
const fileContent = `import { Article } from '../../../types/article';

export const techArticle10: Article = {
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
        id: 'intro-tech-9',
        text: \`${INTRO}\`
    },
    title: {
        type: 'title',
        id: 'title-tech-9',
        zh: '${META.title_zh}',
        en: '${META.title_en}'
    },
    paragraphs: ${JSON.stringify(finalParagraphs, null, 8)},
    glossary: ${JSON.stringify(glossaryMap, null, 8)}
};
`;

const outPath = path.join(__dirname, '../../src/data/articles/2026-01-15/20260115_sovereign_ai_10.ts');
fs.writeFileSync(outPath, fileContent);
console.log("Written to " + outPath);
