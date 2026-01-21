---
name: vocabulary-production-expert
description: 将原始文本转换为 ReadRead App 的语境感知词汇表 (Context-Aware Glossary)，包含分词、词表提取、词库扫描与维护。
---

# Vocabulary Production Expert Skill

此 Skill 专门用于 **词汇处理流水线**，将文章文本转化为结构化的 `GlossaryMap`，供前端即时显示**语境释义**。

## 1. 核心职责

| 职责 | 说明 |
| ---- | ---- |
| **分词 (Tokenization)** | 将句子拆分为 Token 序列，标注 `glossaryId` |
| **词表提取 (Glossary Extraction)** | 从文章中提取 B1-C2 级词汇 |
| **语境翻译 (Context Translation)** | 为每个词生成"基础释义 + 语境释义" |
| **词库扫描 (Dictionary Scanning)** | 识别缺失词汇并批量补充 |

---

## 2. 分词规范 (Tokenization Specification)

**必须严格遵守**：

### 2.1 Token 分类

| `type` | 说明 | 可点击 | 示例 |
| ------ | ---- | ------ | ---- |
| `word` | 英语单词（含连字符、撇号） | ✅ | `"Don't"`, `"dual-use"` |
| `punctuation` | 标点符号 | ❌ | `"."`, `","` |
| `whitespace` | 空白符 | ❌ | `" "` |

### 2.2 Normalization 规则

- `"Don't"` → Token: `{text:"Don't", isWord:true}` (不拆分)
- `"word."` → Tokens: `[{text:"word", isWord:true}, {text:".", isWord:false}]`

### 2.3 Key 对齐规范 (Critical)

> [!IMPORTANT]
> **GlossaryMap 的 key 必须是 normalized lemma**，而非原词形。
> 这确保 `running`, `runs`, `ran` 都能通过 lookupKey 映射到同一个 `run` 词条。

| 概念 | 定义 | 示例 |
| ---- | ---- | ---- |
| **原词形 (word)** | 文中实际出现的单词 | `"Running"`, `"ran"` |
| **lookupKey** | 原词形小写 + 去标点 | `"running"`, `"ran"` |
| **lemma** | 词典原形 | `"run"` |
| **GlossaryMap key** | normalized lemma (小写) | `"run"` |

**分词时的查找逻辑**：

```typescript
// 需要维护 lookupKey → lemma 的映射表
const wordToLemmaMap: Record<string, string> = {
  "running": "run",
  "runs": "run",
  "ran": "run",
  // ...
};

const tokenize = (text: string, glossaryMap: GlossaryMap, wordToLemma: Record<string, string>): ArticleToken[] => {
  const regex = /([a-zA-Z0-9'-]+|[^a-zA-Z0-9\s]+|\s+)/g;
  const parts = text.match(regex) || [];
  return parts.map(part => {
    const isWord = /^[a-zA-Z0-9'-]+$/i.test(part) && /[a-zA-Z]/.test(part);
    const lookupKey = part.toLowerCase().replace(/[^a-z0-9'-]/g, '');
    const lemma = wordToLemma[lookupKey] || lookupKey; // fallback to lookupKey
    const glossaryItem = glossaryMap[lemma];
    return {
      text: part,
      isWord,
      glossaryId: glossaryItem?.id // 可能为 undefined
    };
  });
};
```

### 2.4 GlossaryId 缺失处理策略

> [!NOTE]
> glossaryId 可以为空，但 `isWord` 必须正确标记。

| 场景 | 处理 |
| ---- | ---- |
| 词在 GlossaryMap 中 | 填入 `glossaryId` |
| 词不在 GlossaryMap 中 | `glossaryId = undefined`，`isWord = true` |
| 前端展示 | glossaryId 存在 → 显示语境释义；否则 → 查询 `simpleDictionary` (fallback) |

**Pipeline 阶段补齐策略（推荐）**：

- 在文章生成后的 LLM 词表提取阶段，尽量覆盖所有 B1-C2 词汇
- 对于 A1/A2 常用词，不生成 GlossaryItem，但确保 `simpleDictionary` 有兜底

---

## 3. 词汇表数据结构 (Glossary Data Structure)

采用 **Lemma + POS + DefHash** 作为唯一键，实现语义级去重。

```typescript
// 与 src/types/glossary.ts 保持一致
export interface GlossaryItem {
  /** 唯一 ID: `{lemma}_{pos}_{defHash_前8位}` */
  id: string;
  /** 词元 (e.g., "run") */
  lemma: string;
  /** 文中原词 (e.g., "running") */
  word: string;
  /** 基础释义 (通用词典义项) - 必填 */
  definition: string;
  /** 语境释义 (文章特定) - 必填 */
  contextDefinition: string;
  /** 词性 (v., n., adj., adv., etc.) */
  pos: string;
  /** IPA 音标 */
  pronunciation?: string;
  /** 包含此词的原句 */
  exampleSentence: string;
  /** 来源文章ID */
  sourceArticleId?: string;
}

/**
 * GlossaryMap: key 为 normalized lemma (小写)
 * 用于 O(1) 查找
 */
export type GlossaryMap = Record<string, GlossaryItem>;
```

> [!WARNING]
> `contextDefinition` 为**必填字段**。
> 每个 GlossaryItem 都必须同时包含 `definition` 和 `contextDefinition`。

### 3.1 ID 生成规则

```text
ID = {lemma}_{clean_pos}_{MD5(lemma|pos|definition)[:8]}
```

> [!IMPORTANT]
> **ID 生成时的 POS 处理**:
> ID 中的 `pos` 片段必须**去除点号**，仅保留字母 (clean_pos)。
> 例如: `pos="n."` -> ID part="n"; `pos="adj."` -> ID part="adj".
> ID 正则校验: `/^[a-z0-9'-]+_[a-z]+_[a-f0-9]{8}$/` (中间段不允许有点号)

示例: `curtain_n_a1b2c3d4`

---

## 4. LLM 词表生成 Prompt

### 4.1 B1-C2 词汇识别策略

> [!NOTE]
> **CEFR 等级判断标准**：
>
> - **依赖 LLM 内置知识**：在 prompt 中明确要求 "ignore A1/A2 basic vocabulary"
> - **参考词频表**（可选）：Oxford 3000/5000, COCA Top 5000
> - **经验法则**：日常会话词（the, is, have）属 A1/A2，学术/专业词属 B2+

### 4.2 词汇提取 + 双释义生成

**System Prompt:**

```text
Role: Expert Lexicographer & JSON API.
Task: Extract vocabulary from text and provide DUAL definitions.

Input: English article text (User Message).

=== CEFR Level Filtering ===
- Extract ONLY words at CEFR Level B1, B2, C1, or C2.
- **STRICTLY EXCLUDE** basic A1/A2 vocabulary.
- **Blacklist (NEVER Extract)**:
  - common nouns: "money", "time", "year", "people", "way", "day", "thing", "world", "life", "hand", "part", "child", "eye", "woman", "place", "work", "week", "case", "point", "government", "company", "number", "group", "problem", "fact".
  - common verbs: "have", "go", "make", "do", "say", "get", "know", "think", "take", "see", "come", "want", "look", "use", "find", "give", "tell", "work", "call".
  - basic adjectives: "good", "bad", "new", "first", "last", "long", "great", "little", "own", "other", "old", "right", "big", "high", "different", "small", "large".
- When in doubt (e.g., word is A2/B1 borderline), **SKIP IT** unless it has a rare, specific technical meaning in context.

=== Output Constraints ===
1. Output MUST be pure JSON array. No markdown. No commentary.
2. If a field value is unknown, output "" (empty string), NOT null.
3. Every object MUST contain ALL fields: word, lemma, definition, contextDefinition, pos, sentence.

=== Field Requirements ===
For each word, provide:
- "word": Exact word as it appears in text (preserve original case)
- "lemma": Dictionary form, lowercase (e.g., "running" → "run")
- "definition": 通用词典释义 (中文，简洁)
- "contextDefinition": 该文章语境下的精确释义 (中文，必填)
- "pos": Part of speech (Must end with dot: n., v., adj., adv., prep., conj.)
- "sentence": The exact sentence from text containing the word

=== Deduplication Rule ===
CRITICAL: Deduplicate by lemma + pos. 
The same lemma should only appear multiple times if it has DIFFERENT meanings in different sentences.

=== Output Format ===
[
  {
    "word": "curtain",
    "lemma": "curtain",
    "definition": "帘子；幕布",
    "contextDefinition": "铁幕（指政治隔离屏障）",
    "pos": "n.",
    "sentence": "The Silicon Curtain now descends..."
  }
]
```

---

---

## 5. 词库完整性审计与补全 (Dictionary Integrity Audit)

为了确保阅读体验无断点，每次生成新文章后，**必须**执行词库覆盖率审计。

### 5.1 审计脚本 (`audit_dictionary.js`)

脚本默认审计 PocketBase 文章与词典（符合新架构），也支持 `--file` 针对单篇 JSON 审计。

**路径**: `.agent/skills/vocabulary-production-expert/scripts/audit_dictionary.js`

```bash
node .agent/skills/vocabulary-production-expert/scripts/audit_dictionary.js --source=pb --dict=pb --date=2026-01-21
node .agent/skills/vocabulary-production-expert/scripts/audit_dictionary.js --file=temp_article.json --dict=local
```

### 5.2 必选：Pipeline 阶段补全 (Mandatory Backfill)

> [!IMPORTANT]
> **Database Sync (数据库同步)**:
> 新词发现后，必须同步到 Cloud Database，而不仅仅是本地文件。

**标准操作流程 (SOP)**:

1. **生成文章**：完成文章生成。
2. **生成词表**：将文章中提取的新词生成为 JSON 文件 `temp_vocab.json`。
3. **上传入库**：

   ```bash
   node .agent/scripts/upload_vocabulary.js temp_vocab.json
   ```

   *此脚本会自动检查重复，并将新词插入 PocketBase 的 `dictionary` 集合。*

4. **(可选) 更新本地**：如果需要更新离线兜底库，可手动追加到 `simpleDictionary.ts`，但不再作为主要持久化手段。

### 5.3 基础释义生成 Prompt

**System Prompt:**

```text
Role: Dictionary Editor.
Task: Generate JSON entries for missing vocabulary.
Output Format: Pure JSON object.

Example Input: ["ubiquity", "negotiable"]
Example Output:
{
  "ubiquity": { "word": "ubiquity", "phonetic": "/juːˈbɪkwəti/", "definitions": [{ "partOfSpeech": "n.", "meaning": "无处不在；普遍存在" }] },
  "negotiable": { "word": "negotiable", "phonetic": "/nɪˈɡəʊʃiəbl/", "definitions": [{ "partOfSpeech": "adj.", "meaning": "可协商的" }] }
}
```

---

## 7. 质量检查清单

```markdown
## 词汇处理审核清单
- [ ] 所有 Token 正确分类 (word/punctuation/whitespace)
- [ ] 高级词汇 (B1-C2) 均有 GlossaryItem
- [ ] 每个 GlossaryItem 包含 definition + contextDefinition (必填)
- [ ] ID 格式正确: lemma_pos_hash8
- [ ] GlossaryMap key 与 lemma 一致 (normalized)
- [ ] validate_glossary.js 无报错
- [ ] simpleDictionary 覆盖率 = 100% (铁律)
```
