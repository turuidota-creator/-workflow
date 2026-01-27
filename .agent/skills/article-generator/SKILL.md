---
name: article-generator
description: 核心写作模块。基于 Research Archive，按照 Level 10/7 标准生成高质量、合规的 JSON 格式文章。
---

# Article Generator Skill

## 1. 核心目標 (Core Objective)

將 `news-researcher` 提供的 `_research.md` 轉化為符合 ReadRead 標準的 `Article` JSON 數據。

**Output**: `temp_article.json`

---

## 2. 數據結構 (Data Structure)

> [!IMPORTANT]
> 以下結構與 `src/types/article.ts` 和 PocketBase `articles` Collection 嚴格對齊。

### 2.1 輸出文件格式

```json
{
  "article": { /* Article Object */ },
  "glossary": { /* GlossaryMap Object */ }
}
```

### 2.2 Article 根結構

```typescript
interface Article {
  meta: ArticleMeta;
  intro: IntroBlock;       // 導讀
  title: TitleBlock;       // 標題
  paragraphs: ParagraphBlock[]; // 段落數組
  vocabulary?: VocabEntry[];   // 可選
  glossary?: GlossaryMap;      // 可選 (通常由 vocabulary-production-expert 填充)
  podcastUrl?: string;         // 可選 (通常由 podcast-script-expert 填充)
}
```

### 2.3 ArticleMeta 元數據

| 字段 | 類型 | 說明 | PocketBase 映射 |
| :--- | :--- | :--- | :--- |
| `id` | string | `YYYYMMDD_slug` | 存入 `content.meta.id` |
| `slug` | string | URL 友好標識 | - |
| `title` | string | 顯示標題 | 存入 `content.meta.title` |
| `level` | `"5"` \| `"7"` \| `"9"` \| `"10"` | 難度等級 | `level` (Select) |
| `topic` | `"國際"` \| `"財經"` \| `"科技"` | 中文主題 | `topic` (Select) |
| `date` | string | `YYYY-MM-DD` | `date` (Date) |
| `wordCount` | number | **必須 > 200** | 存入 `content.meta.wordCount` |
| `briefing` | `BriefingCard` | 硬資訊卡片 (繁體中文 (臺灣習慣)，**必填**) | 存入 `content.meta.briefing` |

### 2.3.1 BriefingCard 硬資訊卡片

> [!CAUTION]
> `briefing` 對象中的所有字段均為 **必填項**，缺失任何字段會導致審計失敗。

```typescript
interface BriefingCard {
  what: string;                // 事件內容：發生了什麼
  when: string;                // 時間：具體日期，例如 "2026年1月20日"
  who: string;                 // 事件主體：涉及的組織/人物
  scope: string;               // 影響範圍：涵蓋的地域/人群/領域
  market_implications: string; // 市場影響：對市場/行業的具體影響
  grammar_analysis: string;    // 語法分析：**繁體中文開頭 (臺灣習慣)**，簡述文本語法重點
}
```

**示例**:

```json
"briefing": {
  "what": "歐盟與印度即將簽署歷史性自貿協定 (FTA)。",
  "when": "2026年1月20日",
  "who": "歐盟委員會；印度政府。",
  "scope": "涵蓋20億人口的經貿與投資。",
  "market_implications": "供應鏈多元化加速；印度紡織與歐盟機械受益。",
  "grammar_analysis": "語法重點：首句包含時間狀語，後續使用定語從句補充背景。"
}
```

### 2.4 TitleBlock 標題塊

```typescript
interface TitleBlock {
  type: 'title';
  id: string;     // e.g., "title-20260121_deepseek"
  zh: string;     // 繁體中文標題 (臺灣習慣) -> PB: title_zh
  en: string;     // 英文標題 -> PB: title_en
}
```

### 2.5 IntroBlock 導讀塊

```typescript
interface IntroBlock {
  type: 'intro';
  id: string;
  text: string;   // 繁體中文導讀 (臺灣習慣) -> PB: intro (JSON)
}
```

> **規範**: `intro.text` 必須包含**具體時間、地點/主體、核心事件**，禁止抽象評論。

### 2.6 ParagraphBlock 段落塊

> [!IMPORTANT]
> **首句規範**：第一段 (p1) 的第一句 (s1) **必須包含具體日期**（如 "On January 22," 或 "This Tuesday,"），為讀者提供時間錨點。

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
  zh: string;           // 繁體中文翻譯 (臺灣習慣)
  analysis?: {
    grammar: {
      main: string;               // 主干: 句子的核心結構，例如 "The goal is not to create tools, but to engineer architects"
      extension: string;          // 擴充: 例如 "not merely...but..." (並列對比結構，強調真正目標)
      structure_explanation: string; // 結構解釋: 例如 "that can..." (定語從句，具體解釋 architects 的能力) (繁體中文+臺灣用法)
    };
    explanation: string;  // **必須以 "白話：" 或 "潛臺詞：" 開頭** (臺灣口語習慣)
    keywords?: string[];
  };
}
```

### 2.6.1 ArticleToken 分詞規範

> [!CAUTION]
> **關鍵規則**：每個單詞、空格、標點符號都必須是**獨立的 token**！
> 用戶點擊單詞時，App 需要精確匹配單個單詞。如果將多個單詞合併為一個 token，點擊功能將失效。

```typescript
interface ArticleToken {
  text: string;       // 單個單詞、空格或標點
  isWord: boolean;    // true = 可點擊的單詞, false = 空格/標點
  glossaryId?: string; // 可選，鏈接到 glossary 中的詞條
}
```

**正確示例**:

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

**錯誤示例** (❌ 不要這樣):

```json
"tokens": [
  { "text": "Robert F. Kennedy Jr.", "highlight": false },
  { "text": " ascended", "highlight": true },
  { "text": " the podium in Manchester", "highlight": false }
]
```

### 2.7 PocketBase 映射總覽

| PB 字段 | 類型 | 來源 |
| :--- | :--- | :--- |
| `date` | Date | `article.meta.date` |
| `level` | Select | `article.meta.level` |
| `topic` | Select | `article.meta.topic` |
| `title_zh` | Text | `article.title.zh` |
| `title_en` | Text | `article.title.en` |
| `intro` | JSON | `article.intro` (整個對象) |
| `content` | JSON | `{ meta: article.meta, paragraphs: article.paragraphs }` |
| `glossary` | JSON | `glossary` (整個 GlossaryMap) |
| `podcast_url` | Text | `article.podcastUrl` (可選) |
| `podcast_file` | File | 上傳後由 PB 自動生成文件名 |

---

## 3. 風格與安全 (Style & Safety)

### 3.1 風格矩陣

| 維度 | **Style A: The Old Editor** | **Style B: The Show-off** |
| :--- | :--- | :--- |
| **詞匯** | 小詞大義 ("friction") | GRE難詞 ("exorbitant") |
| **句法** | Punchy, Punchline | 從句套從句 |
| **Param** | `style_preset: "authentic_journalist"` | `style_preset: "pedagogic_showoff"` |

### 3.2 內容脫敏 (Sanitization)

> [!CAUTION]
> **紅線**: 1989/Tiananmen, 領導人點名, 主權分裂, 顛覆言論 -> **立即熔斷**。

**脫敏策略**:

1. **實體抽象化**: "Xi's policy" -> "Beijing's strategy".
2. **機制聚焦**: 關注經濟機制，而非政治對錯。
3. **Steelman**: 必須包含一句為對立面辯護的邏輯。

---

## 4. 質量熔斷 (Circuit Breaker)

- **規則**: `meta.wordCount < 210` 或 `meta.wordCount > 270` -> 無效。
- **結構**: 必須正好 **3個自然段**。
- **Action**: 丟棄 -> 重試 (最多 3 次) -> 失敗報錯。

---

## 5. 常見錯誤 (Debugging)

- `briefing` 缺失: 檢查是否在 `meta` 內部。
- `intro.text` 抽象: 必須是具體事實。
- `analysis` 語言: 必須是繁體中文，`explanation` 必須以 `白話：` 開頭。
- `briefing.grammar_analysis` 非中文開頭: 必須以繁體中文字符開頭。
