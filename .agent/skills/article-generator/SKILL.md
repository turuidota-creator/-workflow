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
| `briefing` | object | 硬信息卡片 (中文) | 存入 `content.meta.briefing` |

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

- **规则**: `meta.wordCount < 200` -> 无效。
- **Action**: 丢弃 -> 重试 (最多 3 次) -> 失败报错。

---

## 5. 常见错误 (Debugging)

- `briefing` 缺失: 检查是否在 `meta` 内部。
- `intro.text` 抽象: 必须是具体事实。
- `analysis` 语言: 必须是中文，`explanation` 必须以 `人话：` 开头。
