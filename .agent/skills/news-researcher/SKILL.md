---
name: news-researcher
description: 负责全网搜寻最新高价值英语素材，并执行严格的“强制查重”与“时效验证”，输出标准化的研究归档。
---

# News Research Expert Skill

## 1. 核心目标 (Core Objective)

找到**最新（24-72小时内）**、**高质量**且**无重复**的新闻素材，为内容生产提供坚实的事实基础。

## 2. 搜索流程 (Search Workflow)

### 第一步：全网搜寻与溯源 (Mandatory Research & Trace)

> [!IMPORTANT]
> **搜索是必须的 (SEARCH IS MANDATORY)**
> 严禁直接使用训练数据的“历史记忆”编造新闻。所有文章必须基于**最近 24-72 小时内**发生的真实事件。
> 必须调用搜索工具获取真实的时间、数据和细节。

**策略**: 强制验证策略 (Mandatory Verification)

1. **执行搜索 (Execute Search)**:
    - 无论用户是否提供 Topic，都**必须**搜索以确认最新动态。
    - **Query Strategy**:
        - **Type A (News)**: 确认核心事件的最新进展。
          - *Ex*: `"DeepSeek R1 release date latest news"`
        - **Type B (Details)**: 验证具体数据和事实。
          - *Ex*: `"DeepSeek R1 parameter count official"`
    - **禁止**: 禁止仅凭用户的一句话输入就开始生成，必须有搜索结果作为支撑。

2. **归档源信息 (Archive Source)**:
    - **Selection Quantity**: 选取 **Top 3** 最相关的搜索结果。
    - **Selection Quality (Trusted Whitelist)**:
        - **Tier 1 (Global Authority)**: Reuters, AP, Bloomberg, FT, WSJ, NYT, The Economist, BBC.
        - **Tier 2 (Domain Expert)**: TechCrunch/Verge (Tech), Nature/Science (Science), Official Blogs (e.g. OpenAI).
        - **Tier 3 (Alternative)**: 仅当上述不可用时，选取高信誉的独立分析（需人工核查）。
    - **Ban List**: 严禁引用 Content Farms (SEO 垃圾站)、Tabloid (小报)、Wiki (不可作为第一引用源)。

3. **时效验证**:
    - 确认事件发生在**最近**。如果是旧闻（超过1周），需明确告知用户并请求确认是否仍要生成。

### 第二步：强制查重与冲突熔断 (Mandatory Deep Deduplication)

> [!CRITICAL]
> **拒绝重复 (NO DUPLICATES)**
> 在生成任何内容之前，**必须**检查 `src/data/articleIndex.ts`。
> 如果发现**最近 3 天**（含今天）已经覆盖了类似 Topic（即使角度略有不同），**立即停止生成**。

**执行动作 (Actionable Steps)**:

1. **读取索引**: 使用 `view_file` 读取 `src/data/articleIndex.ts` 的前 150 行。
2. **人工比对 (Manual Check)**:
    - 检查 Current Date 往前推 3 天的所有文章 Title 和 Tags。
    - **Case Study**:
        - *Input*: "Google and Apple AI deal"
        - *History (Yesterday)*: "Apple Google Alliance"
        - *Decision*: **ABORT**. 已经写过了，换一个 Topic。
    - **Case Study**:
        - *Input*: "Greenland Crisis"
        - *History (2 days ago)*: "Greenland Ultimatum"
        - *Decision*: **ABORT**.
3. **语义冲突检测 (Semantic Conflict)**:
    - 不仅仅是关键词匹配，而是**核心事件**匹配。
    - "US Chip Ban" 和 "New Export Controls" 是同一个事件 -> **DUPLICATE**。
4. **Result**:
    - **DUPLICATE**: 发现重合 -> **TERMINATE TASK** 并告知用户 "Topic exists in recent history."
    - **UNIQUE**: 确认无重复 -> Proceed.

## 3. 输出产物 (Artifact output)

将所有研究结果保存至 `src/data/sources/{date}/{slug}_research.md`。

**Template**:

```markdown
# Research Archive: [Title]
- **Date**: YYYY-MM-DD
- **News Date**: [Time of event]
- **Slug**: [slug] (URL-friendly string)
- **User Input**: ...
- **Search Logs**:
  - Query: "..." -> Result: [Title](URL) - Snippet...
- **Core Facts**:
  - Fact 1...
  - Fact 2...
```
