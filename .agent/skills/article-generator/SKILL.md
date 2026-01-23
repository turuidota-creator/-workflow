---
name: article-generator
description: 核心写作模块。基于 Research Archive，按照 Level 10/7 标准生成高质量、合规的 JSON 格式文章。
---

# Article Generator Skill

## 1. 核心目标 (Core Objective)

将 `news-researcher` 提供的 `_research.md` 转化为符合 ReadRead 标准的 `Article` JSON 数据。

**Output**: `temp_article.json`

---

## 2. 数据结构 (Data Structure)

> [!IMPORTANT]
> 以下结构与 `src/types/article.ts` 和 PocketBase `articles` Collection 严格对齐。

### 2.1 输出文件格式

```json
{
  "article": { /* Article Object */ },
  "glossary": { /* GlossaryMap Object */ }
}
```

### 2.2 Article 根结构

```typescript
interface Article {
  meta: ArticleMeta;
  intro: IntroBlock;       // 前言
  title: TitleBlock;       // 标题
  paragraphs: ParagraphBlock[]; // 段落数组
  vocabulary?: VocabEntry[];   // 可选
  glossary?: GlossaryMap;      // 可选 (通常由 vocabulary-production-expert 填充)
  podcastUrl?: string;         // 可选 (通常由 podcast-script-expert 填充)
}
```

### 2.3 ArticleMeta 元数据

| 字段 | 类型 | 说明 | PocketBase 映射 |
| :--- | :--- | :--- | :--- |
| `id` | string | `YYYYMMDD_slug` | 存入 `content.meta.id` |
| `slug` | string | URL 友好标识 | - |
| `title` | string | 显示标题 | 存入 `content.meta.title` |
| `level` | `"5"` \| `"7"` \| `"9"` \| `"10"` | 难度等级 | `level` (Select) |
| `topic` | `"国际"` \| `"财经"` \| `"科技"` | 中文主题 | `topic` (Select) |
| `date` | string | `YYYY-MM-DD` | `date` (Date) |
| `wordCount` | number | **必须 > 200** | 存入 `content.meta.wordCount` |
| `briefing` | `BriefingCard` | 硬信息卡片 (中文，**必填**) | 存入 `content.meta.briefing` |

### 2.3.1 BriefingCard 硬信息卡片

> [!CAUTION]
> `briefing` 对象中的所有字段均为 **必填项**，缺失任何字段会导致审计失败。

```typescript
interface BriefingCard {
  what: string;                // 事件内容：发生了什么
  when: string;                // 时间：具体日期，例如 "2026年1月20日"
  who: string;                 // 事件主体：涉及的组织/人物
  scope: string;               // 影响范围：涵盖的地域/人群/领域
  market_implications: string; // 市场影响：对市场/行业的具体影响
  grammar_analysis: string;    // 语法分析：**中文开头**，简述文本语法重点
}
```

**示例**:

```json
"briefing": {
  "what": "欧盟与印度即将签署历史性自贸协定 (FTA)。",
  "when": "2026年1月20日",
  "who": "欧盟委员会；印度政府。",
  "scope": "涵盖20亿人口的经贸与投资。",
  "market_implications": "供应链多元化加速；印度纺织与欧盟机械受益。",
  "grammar_analysis": "语法重点：首句包含时间状语，后续使用定语从句补充背景。"
}
```

### 2.4 TitleBlock 标题块

```typescript
interface TitleBlock {
  type: 'title';
  id: string;     // e.g., "title-20260121_deepseek"
  zh: string;     // 中文标题 -> PB: title_zh
  en: string;     // 英文标题 -> PB: title_en
}
```

### 2.5 IntroBlock 前言块

```typescript
interface IntroBlock {
  type: 'intro';
  id: string;
  text: string;   // 中文导读 -> PB: intro (JSON)
}
```

> **规范**: `intro.text` 必须包含**具体时间、地点/主体、核心事件**，禁止抽象评论。

### 2.6 ParagraphBlock 段落块

> [!IMPORTANT]
> **首句规范**：第一段 (p1) 的第一句 (s1) **必须包含具体日期**（如 "On January 22," 或 "This Tuesday,"），为读者提供时间锚点。

```typescript
interface ParagraphBlock {
  type: 'paragraph';
  id: string; // e.g., "p1"
  paragraph: {
    id: string;
    tokenizedSentences: TokenizedSentence[];
  };
}

interface TokenizedSentence {
  id: string;           // e.g., "s1-20260121_deepseek"
  tokens: ArticleToken[];
  zh: string;           // 中文翻译
  analysis?: {
    grammar: string;      // **中文**，使用语法术语
    explanation: string;  // **必须以 "人话：" 或 "潜台词：" 开头**
    keywords?: string[];
  };
}
```

### 2.6.1 ArticleToken 分词规范

> [!CAUTION]
> **关键规则**：每个单词、空格、标点符号都必须是**独立的 token**！
> 用户点击单词时，App 需要精确匹配单个单词。如果将多个单词合并为一个 token，点击功能将失效。

```typescript
interface ArticleToken {
  text: string;       // 单个单词、空格或标点
  isWord: boolean;    // true = 可点击的单词, false = 空格/标点
  glossaryId?: string; // 可选，链接到 glossary 中的词条
}
```

**正确示例**:

```json
"tokens": [
  { "text": "The", "isWord": true },
  { "text": " ", "isWord": false },
  { "text": "single", "isWord": true },
  { "text": " ", "isWord": false },
  { "text": "click", "isWord": true },
  { "text": ",", "isWord": false },
  { "text": " ", "isWord": false },
  { "text": "once", "isWord": true },
  { "text": " ", "isWord": false },
  { "text": "the", "isWord": true },
  { "text": " ", "isWord": false },
  { "text": "basic", "isWord": true, "glossaryId": "basic_adj_1" },
  { "text": " ", "isWord": false },
  { "text": "unit", "isWord": true },
  { "text": ".", "isWord": false }
]
```

**错误示例** (❌ 不要这样):

```json
"tokens": [
  { "text": "Robert F. Kennedy Jr.", "highlight": false },
  { "text": " ascended", "highlight": true },
  { "text": " the podium in Manchester", "highlight": false }
]
```

### 2.7 PocketBase 映射总览

| PB 字段 | 类型 | 来源 |
| :--- | :--- | :--- |
| `date` | Date | `article.meta.date` |
| `level` | Select | `article.meta.level` |
| `topic` | Select | `article.meta.topic` |
| `title_zh` | Text | `article.title.zh` |
| `title_en` | Text | `article.title.en` |
| `intro` | JSON | `article.intro` (整个对象) |
| `content` | JSON | `{ meta: article.meta, paragraphs: article.paragraphs }` |
| `glossary` | JSON | `glossary` (整个 GlossaryMap) |
| `podcast_url` | Text | `article.podcastUrl` (可选) |
| `podcast_file` | File | 上传后由 PB 自动生成文件名 |

---

## 3. 风格与安全 (Style & Safety)

### 3.1 风格矩阵

| 维度 | **Style A: The Old Editor** | **Style B: The Show-off** |
| :--- | :--- | :--- |
| **词汇** | 小词大义 ("friction") | GRE难词 ("exorbitant") |
| **句法** | Punchy, Punchline | 从句套从句 |
| **Param** | `style_preset: "authentic_journalist"` | `style_preset: "pedagogic_showoff"` |

### 3.2 内容脱敏 (Sanitization)

> [!CAUTION]
> **红线**: 1989/Tiananmen, 领导人点名, 主权分裂, 颠覆言论 -> **立即熔断**。

**脱敏策略**:

1. **实体抽象化**: "Xi's policy" -> "Beijing's strategy".
2. **机制聚焦**: 关注经济机制，而非政治对错。
3. **Steelman**: 必须包含一句为对立面辩护的逻辑。

---

## 4. 质量熔断 (Circuit Breaker)

- **规则**: `meta.wordCount < 210` 或 `meta.wordCount > 270` -> 无效。
- **结构**: 必须正好 **3个自然段**。
- **Action**: 丢弃 -> 重试 (最多 3 次) -> 失败报错。

---

## 5. 常见错误 (Debugging)

- `briefing` 缺失: 检查是否在 `meta` 内部。
- `intro.text` 抽象: 必须是具体事实。
- `analysis` 语言: 必须是中文，`explanation` 必须以 `人话：` 开头。
- `briefing.grammar_analysis` 非中文开头: 必须以中文字符开头。
