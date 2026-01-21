---
name: content-audit-expert
description: 审计生成内容的质量与合规性，确保严苛的词典覆盖率（100%全量单词）和字段规范性。
---

# Content Audit Expert Skill

此 Skill 用于审计 `article-production-expert` 和 `vocabulary-production-expert` 的工作成果，确保生成内容符合 ReadRead App 的最高规范要求。

## 1. 审计维度 (Audit Dimensions)

| # | 审计项 | 脚本 | 说明 |
|---|--------|------|------|
| 1 | **词典覆盖铁律** | `audit_dictionary.js` | **所有**文章正文单词（除纯数字/单字符）必须在 PocketBase `dictionary` 中存在 (100% 覆盖) |
| 2 | **词典键位规范** | `audit_dictionary.js` | PocketBase `dictionary.word` 与本地 `simpleDictionary.ts` 的 **Key 必须全小写** |
| 3 | 中文注释检查 | `audit_articles.js` | `analysis.grammar` 和 `analysis.explanation` 必须为中文 |
| 4 | 字段合规检查 | `audit_articles.js` | 必填字段：meta, intro, title, paragraphs |
| 5 | 时效性检查 | `audit_articles.js` | `briefing.when` 年份需与 `meta.date` 一致 |
| 6 | **字数硬指标** | `audit_articles.js` | 真实字数必须 > 200，并对比 `meta.wordCount` |

---

## 2. 使用方法 (Usage)

### 2.1 全量审计（推荐日常使用）

默认从 PocketBase 读取文章。支持 `--date` 参数过滤特定日期的文章，提高审计效率。

```bash
# 从项目根目录执行

# 1. 审计文章内容结构与中文合规性（PocketBase）
node .agent/skills/content-audit-expert/scripts/audit_articles.js --source=pb --date=2026-01-18

# 2. 审计词典覆盖率（PocketBase + 严苛扫描）
node .agent/skills/content-audit-expert/scripts/audit_dictionary.js --source=pb --dict=pb --date=2026-01-18

# 3. 审计单篇 JSON（生成阶段 / 上传前）
node .agent/skills/content-audit-expert/scripts/audit_articles.js --file=temp_article.json
node .agent/skills/content-audit-expert/scripts/audit_dictionary.js --file=temp_article.json --dict=local
```

### 2.2 词典覆盖审计输出示例

```text
=== 全量单词审计 (极致严苛铁律版) ===

扫描文章: 6 篇
现有词典条目: 1782 个

单词总扫描量: 12053
覆盖率: 100.0%

=== 审计结果: 全量覆盖通过 ✅ ===
```

如果未通过，脚本会输出缺失词汇列表（按频次排序）并生成 `missing_all_words.json`。

---

## 3. 词典维护规范 (Dictionary Standards)

为确保词典查询服务（`dictionary.ts`）正常工作，必须严格遵守以下规范：

### 3.1 键位小写原则 (Key Lowercase Rule)

PocketBase `dictionary.word` 与本地 `simpleDictionary.ts` 的 Key **必须** 是全小写的，而 `original_word`/`word` 字段可以包含大写。这是因为查询服务在查找前会强制将输入转为小写。

- ✅ **正确**:

  ```typescript
  "european": { word: "European", ... }
  "imf": { word: "IMF", ... }
  ```

- ❌ **错误**:

  ```typescript
  "European": { word: "European", ... } // 导致无法查到
  "IMF": { word: "IMF", ... } // 导致无法查到
  ```

### 3.2 100% 覆盖率 (The Iron Law)

- 所有出现在文章正文中的单词（包括基础词 `the`, `is` 等）都必须收录。
- 只有纯数字（`2026`）和单字母（除 `a`, `I` 外）可豁免。
- 遇到单词包含标点（如 `landlord's`, `post-pandemic`），需作为独立词条收录。

---

## 4. 审计检查清单 (Audit Checklist)

在提交新文章前，确保以下检查通过：

```markdown
## 内容审计清单
- [ ] **词典覆盖率 100%**: 运行 `audit_dictionary.js` 无报错
- [ ] **词典键位检查**: PocketBase `dictionary.word` 与本地 Key 为全小写
- [ ] `analysis.grammar` 全部为中文
- [ ] `analysis.explanation` 全部以 "人话：" 或 "潜台词：" 开头
- [ ] `briefing.when` 年份与 `meta.date` 匹配
- [ ] 文章字数 `meta.wordCount` > 200
```

## 5. 常见问题 (FAQ)

### Q: 为什么 "European" 在词典里有但查不到？

A: 检查 `simpleDictionary.ts` 中的 Key 是否为 `"European"`（大写）。必须将其改为 `"european"`（小写）。查询服务会先 `normalizeWord(w).toLowerCase()` 再查找，如果 Key 是大写则永远无法匹配。

### Q: 审计脚本报 "missing words" 但我觉得这些词不需要？

A: 这是“铁律”。即使是简单的词（如 `at`, `on`），为了保证词典的自洽性和离线可用性，也必须收录。使用 `node .agent/scripts/upload_vocabulary.js missing_all_words.json` 或生成 JSON 后批量添加。
