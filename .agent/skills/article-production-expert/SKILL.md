---
name: article-production-expert
description: (Deprecated) 此 Skill 已拆分为多个原子 Skill，请查看 content-production-workflow。
---

# Article Production Expert (DEPRECATED)

> [!WARNING]
> **此 Skill 已重构拆分**
> 为了提供更好的错误定位和模块化维护，此 Skill 已被拆分为以下独立 Skill。

## 新架构 (New Architecture)

请根据需要直接调用对应的原子 Skill：

1. **`news-researcher`**: 负责搜索新闻、查重、生成 `_research.md`。
2. **`article-generator`**: 负责基于研究生成文章 JSON (Level 10)。
3. **`article-publisher`**: 负责上传文章到数据库。
4. **`content-production-workflow`**: 串联上述所有步骤的总入口。

请查阅 `.agent/skills/content-production-workflow/SKILL.md` 获取最新工作流指引。
