const fs = require('fs');
const path = require('path');

const META = {
    id: "20260115_stagflation_debt_10",
    title_zh: "滞胀的幽灵：债务周期与资产定价",
    title_en: "The Specter of Stagflation: Fiscal Dominance, Debt Cycles, and the Repricing of Assets",
    date: "2026-01-15",
    topic: "财经",
    level: "10",
    readTime: 12,
    wordCount: 460,
    briefing: {
        what: "全球面临“财政赤字、高通胀与债务危机”的完美风暴。",
        who: "全球央行(Central Banks)；“债券义警”(Bond Vigilantes)。",
        when: "2026年1月15日",
        scope: "宏观经济、资本市场与企业信贷。",
        market_implications: "股债双杀格局确立；信用利差飙升；现金流资产为王。"
    }
};

const INTRO = `深入剖析 2026 年宏观经济困境：财政赤字、粘性通胀与企业债务危机的完美风暴。
背景：高利率环境已持续三年，政府支出却未见收敛。
我们将探讨“财政主导”如何削弱央行的抗通胀能力，以及投资者在资产重新定价中的策略。`;

const SENTENCES = [
    // P1
    {
        en: 'The synchronicity of global fiscal dominance and monetary tightening has birthed a fundamental paradox: while central banks strive to extinguish systemic inflation through aggressive rate hikes, unchecked government deficit spending continually fuels the very inflationary fire they seek to douse.',
        zh: '全球财政主导与货币紧缩的同步性催生了一个根本性的悖论：当央行试图通过激进加息来扑灭系统性通胀时，不受约束的政府赤字支出却在不断为它们试图浇灭的通胀之火推波助澜。',
        analysis: {
            grammar: 'While 引导对比状语从句；fueled ... fire 形象地比喻“火上浇油”。',
            explanation: '人话：这就好比一个人在拼命踩刹车（央行加息），另一个人在疯狂踩油门（政府发债），在这种矛盾操作下，通胀这辆车很难停下来。',
            keywords: ['synchronicity', 'dominance', 'paradox', 'extinguish', 'deficit']
        }
    },
    {
        en: 'This macroeconomic dissonance has effectively unanchored inflation expectations across the private sector, creating a volatile market regime where "bond vigilantes" demand significantly higher term premiums to compensate for the anticipated erosion of long-term purchasing power.',
        zh: '这种宏观经济上的不协调实际上已经使私营部门的通胀预期脱锚，创造了一个动荡的市场机制，在此机制下，“债券义警”要求显著更高的期限溢价，以补偿预期的长期购买力侵蚀。',
        analysis: {
            grammar: 'where 引导定语从句修饰 regime；compensate for 补偿...。',
            explanation: '人话：大家都看出来通胀控制不住了（预期脱锚），所以买国债的大佬们（债券义警）要求更高的利息，因为怕以后拿回来的钱不值钱了。',
            keywords: ['dissonance', 'unanchored', 'volatile', 'vigilantes', 'erosion']
        }
    },
    // P2
    {
        en: 'Consequently, the credibility of inflation-targeting regimes is under severe scrutiny, as the boundary between monetary policy and fiscal exigency becomes increasingly blurred in the eyes of institutional investors.',
        zh: '因此，以通胀为目标的调节机制的公信力正受到严峻考验，因为在机构投资者眼中，货币政策与财政紧急需要之间的界限正变得日益模糊。',
        analysis: {
            grammar: 'as 引导原因状语从句；become blurred 系表结构。',
            explanation: '人话：投资者开始怀疑央行是否还能独立（不被政府绑架），毕竟政府为了还债可能会逼迫央行印钱。一旦公信力没了，哪怕加息也没人信了。',
            keywords: ['credibility', 'scrutiny', 'exigency', 'blurred']
        }
    },
    // Note: Re-aligning p2s1 to standard p2s1 position in new structure
    {
        en: 'Corporate balance sheets, which were buoyed for over a decade by an era of artificially cheap capital, are now finally buckling under the unprecedented weight of "refinancing cliffs," precipitating a brutal purge of "zombie companies" that can no longer service their massive debt obligations.',
        zh: '在超过十年的低息资金时代支撑下的企业资产负债表，现在终于在“再融资悬崖”的前所未有的重压下开始崩溃，引发了对那些无法再偿还巨额债务的“僵尸企业”的残酷清洗。',
        analysis: {
            grammar: 'which 引导定语从句；precipitating ... 分词作结果状语；service debt 偿还债务。',
            explanation: '人话：那些靠着以前利息低混日子的垃圾公司（僵尸企业），现在要借新还旧时发现利息太高借不起了（再融资悬崖），只能排队破产。',
            keywords: ['buoyed', 'buckling', 'refinancing', 'purge', 'obligations']
        }
    },
    {
        en: 'As default rates ostensibly climb to multi-year highs, credit spreads are widening aggressively, signaling a fundamental repricing of risk that could potentially destabilize the highly leveraged shadow banking sector and trigger a liquidity crunch.',
        zh: '随着违约率明显攀升至多年高点，信用利差正在激进扩大，标志着风险的根本性重新定价，这可能会破坏高杠杆影子银行部门的稳定，并引发流动性紧缩。',
        analysis: {
            grammar: 'As 引导随着...；signaling ... 分词作结果状语；trigger a crunch 引发紧缩。',
            explanation: '人话：破产的公司多了，市场上没人敢乱借钱了（利差扩大）。那些玩高杠杆的金融机构（影子银行）一旦借不到钱，就会产生连锁崩盘。',
            keywords: ['ostensibly', 'spreads', 'repricing', 'destabilize', 'crunch']
        }
    },
    // P3
    {
        en: 'In this environment, global investors are being compelled to perform a radical recalibration of their portfolios to survive a regime of "secular stagflation," where the traditional 60/40 asset allocation model has fundamentally broken down, necessitating a frantic flight to tangible assets and various inflation-hedged financial instruments.',
        zh: '在这种环境下，全球投资者被迫对其投资组合进行彻底的重新校准，以在“长期滞胀”的机制中生存下来。在这种机制下，传统的 60/40 资产配置模型已从根本上失效，估值必须转向有形资产和各种通胀对冲金融工具。',
        analysis: {
            grammar: 'being compelled to 被迫做...；where 引导定语从句；necessitating ... 分词作结果状语。',
            explanation: '人话：以前“股债平衡”的老黄历不管用了（股债双杀），现在为了保命，投资者必须去买黄金、大宗商品这些看得见摸得着的硬资产。',
            keywords: ['recalibration', 'secular', 'stagflation', 'tangible', 'hedged']
        }
    },
    {
        en: 'The specter of persistent liquidity shortages looms large over global markets, suggesting that sustainable cash flow generating capacity, rather than speculative future growth, will emerge as the sole determinant of corporate solvency and market success in the coming economic cycle.',
        zh: '持续流动性短缺的幽灵在全市场范围内若隐若现，这表明可持续的现金流产生能力，而非投机性的未来增长，将成为即将到来的经济周期中决定企业偿付能力和市场成功的唯一因素。',
        analysis: {
            grammar: 'suggesting that ... 分词引导宾语从句；rather than 引导对比。',
            explanation: '人话：别再画 PPT 讲故事了（投机性增长）。在现在这世道，谁手里有真金白银的现金流，谁才是大爷，否则就是死路一条。',
            keywords: ['specter', 'liquidity', 'speculative', 'solvency', 'determinant']
        }
    }
];

const VOCAB_DATA = [
    { w: "synchronicity", lemma: "synchronicity", pos: "n.", def: "同步性", ctx: "[同步共振] 指财政扩张和货币紧缩两个相反的政策同时发生。" },
    { w: "dominance", lemma: "dominance", pos: "n.", def: "主导地位", ctx: "[财政主导] Fiscal Dominance，一种经济状态，指央行被迫配合政府财政需求，失去独立性。" },
    { w: "paradox", lemma: "paradox", pos: "n.", def: "悖论", ctx: "[政策悖论] 政府一边踩刹车（加息）一边踩油门（赤字），自相矛盾。" },
    { w: "extinguish", lemma: "extinguish", pos: "v.", def: "熄灭；压制", ctx: "[扑灭] 央行试图通过加息来压制高通胀。" },
    { w: "deficit", lemma: "deficit", pos: "n.", def: "赤字", ctx: "[赤字支出] 政府花的钱比赚的多，导致通胀压力。" },
    { w: "dissonance", lemma: "dissonance", pos: "n.", def: "不协调；噪音", ctx: "[宏观失调] 财政政策和货币政策互不配合，产生冲突。" },
    { w: "unanchored", lemma: "unanchored", pos: "adj.", def: "脱锚的；无依附的", ctx: "[预期脱锚] 市场不再相信央行能控制住通胀，通胀预期开始失控。" },
    { w: "volatile", lemma: "volatile", pos: "adj.", def: "动荡的；易变的", ctx: "[市场动荡] 市场价格剧烈波动，不仅平稳。" },
    { w: "vigilantes", lemma: "vigilante", pos: "n.", def: "义警；自发维持治安者", ctx: "[债券义警] Bond Vigilantes，指通过抛售债券来倒逼政府削减开支的投资者。" },
    { w: "erosion", lemma: "erosion", pos: "n.", def: "侵蚀", ctx: "[购买力侵蚀] 通胀导致同样的钱买到的东西越来越少。" },
    { w: "credibility", lemma: "credibility", pos: "n.", def: "公信力", ctx: "[信用危机] 市场对央行维持物价稳定的能力产生怀疑。" },
    { w: "scrutiny", lemma: "scrutiny", pos: "n.", def: "详细审查", ctx: "[严峻考验] 央行的政策正受到市场的严密监视和质疑。" },
    { w: "exigency", lemma: "exigency", pos: "n.", def: "紧急情况；急需", ctx: "[财政急需] 政府为了还债或支出而迫切需要资金。" },
    { w: "blurred", lemma: "blurred", pos: "adj.", def: "模糊的", ctx: "[界限模糊] 央行和财政部穿了一条裤子，不再独立。" },
    { w: "buoyed", lemma: "buoy", pos: "v.", def: "支撑；使浮起", ctx: "[人工支撑] 长期被低利率政策人为地支撑着。" },
    { w: "buckling", lemma: "buckle", pos: "v.", def: "压垮；弯曲", ctx: "[崩溃] 承受不住高债务压力而开始断裂。" },
    { w: "refinancing", lemma: "refinancing", pos: "n.", def: "再融资", ctx: "[再融资悬崖] 债务到期需要借新还旧时，利息突然暴涨的危险时刻。" },
    { w: "purge", lemma: "purge", pos: "n.", def: "清洗；清除", ctx: "[出清] 市场残酷地淘汰那些没有竞争力的公司。" },
    { w: "obligations", lemma: "obligation", pos: "n.", def: "义务；债务", ctx: "[偿债义务] 企业必须偿还的到期债务。" },
    { w: "ostensibly", lemma: "ostensibly", pos: "adv.", def: "表面上；明显地", ctx: "[肉眼可见] 违约率明显地在上升。" },
    { w: "spreads", lemma: "spread", pos: "n.", def: "差价；利差", ctx: "[信用利差] Credit Spreads，国债和企业债之间的利息差，反映违约风险。" },
    { w: "repricing", lemma: "reprice", pos: "n.", def: "重新定价", ctx: "[风险重估] 市场开始重新评估风险，要求更高的回报。" },
    { w: "destabilize", lemma: "destabilize", pos: "v.", def: "使动摇；破坏稳定", ctx: "[破坏稳定] 让金融系统变得摇摇欲坠。" },
    { w: "crunch", lemma: "crunch", pos: "n.", def: "紧缩；短缺", ctx: "[流动性危机] 市场上突然没钱了，借不到钱。" },
    { w: "recalibration", lemma: "recalibration", pos: "n.", def: "重新校准", ctx: "[彻底调整] 投资者必须完全改变以前的投资逻辑。" },
    { w: "secular", lemma: "secular", pos: "adj.", def: "长期的；世俗的", ctx: "[长期性] Secular Stagflation，指一种持续时间很长的结构性滞胀。" },
    { w: "stagflation", lemma: "stagflation", pos: "n.", def: "滞胀", ctx: "[滞胀] 经济停滞(Stagnation)和通货膨胀(Inflation)同时存在的恶劣经济状态。" },
    { w: "tangible", lemma: "tangible", pos: "adj.", def: "有形的", ctx: "[硬资产] 如黄金、房产、大宗商品等看得见摸得着的资产。" },
    { w: "hedged", lemma: "hedge", pos: "v.", def: "对冲", ctx: "[通胀对冲] 能抵抗通胀贬值的投资工具。" },
    { w: "specter", lemma: "specter", pos: "n.", def: "幽灵；恐惧", ctx: "[阴霾] 长期流动性短缺的威胁像幽灵一样笼罩市场。" },
    { w: "liquidity", lemma: "liquidity", pos: "n.", def: "流动性", ctx: "[钱荒] 市场上资金的充裕程度。" },
    { w: "speculative", lemma: "speculative", pos: "adj.", def: "投机的", ctx: "[投机性] 靠讲故事、画大饼支撑的虚高估值。" },
    { w: "solvency", lemma: "solvency", pos: "n.", def: "偿付能力", ctx: "[生存能力] 企业有没有钱还债，决定了能不能活下去。" },
    { w: "determinant", lemma: "determinant", pos: "n.", def: "决定因素", ctx: "[决定性] 现金流是决定生死的唯一标准。" }
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
    "synchronicity": "synchronicity", "dominance": "dominance", "paradox": "paradox", "extinguish": "extinguish",
    "systemic": "systemic", "unchecked": "check", "fuels": "fuel", "inflationary": "inflationary",
    "douse": "douse", "macroeconomic": "macroeconomic", "dissonance": "dissonance", "unanchored": "unanchored",
    "creating": "create", "volatile": "volatile", "regime": "regime", "vigilantes": "vigilante",
    "premiums": "premium", "compensate": "compensate", "anticipated": "anticipate", "erosion": "erosion",
    "consequently": "consequently", "credibility": "credibility", "regimes": "regime", "scrutiny": "scrutiny",
    "exigency": "exigency", "blurred": "blurred", "corporate": "corporate", "sheets": "sheet",
    "buoyed": "buoy", "buckling": "buckle", "refinancing": "refinancing", "precipitating": "precipitate",
    "brutal": "brutal", "purge": "purge", "companies": "company", "obligations": "obligation",
    "default": "default", "ostensibly": "ostensibly", "spreads": "spread", "widening": "widen",
    "signaling": "signal", "repricing": "reprice", "destabilize": "destabilize", "leveraged": "leverage",
    "crunch": "crunch", "environment": "environment", "investors": "investor", "compelled": "compel",
    "recalibration": "recalibration", "portfolios": "portfolio", "secular": "secular", "stagflation": "stagflation",
    "allocation": "allocation", "necessitating": "necessitate", "frantic": "frantic", "tangible": "tangible",
    "hedged": "hedge", "specter": "specter", "persistent": "persistent", "looms": "loom",
    "suggesting": "suggest", "sustainable": "sustainable", "speculative": "speculative", "determinant": "determinant",
    "solvency": "solvency", "success": "success", "fiscal": "fiscal", "monetary": "monetary", "deficit": "deficit"
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
// Note: P1 has 3 sentences in original definition for Stagflation 10.
// Let's check original text:
// P1: s1, s2, s3.
// P2: s1, s2.
// P3: s1, s2.
const PARA_STRUCTURE = [3, 2, 2];

PARA_STRUCTURE.forEach((start, i) => {
    const paraId = `fin-p${i + 1}-9`;
    const dimSentences = [];

    for (let k = 0; k < start; k++) {
        const sData = SENTENCES[sCursor++];
        const sId = `fin-p${i + 1}_s${k + 1}-9`;
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

export const financeArticle10: Article = {
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
        id: 'intro-finance-9',
        text: \`${INTRO}\`
    },
    title: {
        type: 'title',
        id: 'title-finance-9',
        zh: '${META.title_zh}',
        en: '${META.title_en}'
    },
    paragraphs: ${JSON.stringify(finalParagraphs, null, 8)},
    glossary: ${JSON.stringify(glossaryMap, null, 8)}
};
`;

const outPath = path.join(__dirname, '../../src/data/articles/2026-01-15/20260115_stagflation_debt_10.ts');
fs.writeFileSync(outPath, fileContent);
console.log("Written to " + outPath);
