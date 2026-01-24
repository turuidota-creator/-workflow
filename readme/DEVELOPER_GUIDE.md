# 开发者指南 (Developer Guide)

本文档是“内容工作流”系统的核心开发手册，整合了扩展指南、底层数据机制和字段定义。旨在帮助开发者快速理解系统运作方式并进行功能扩展。

---

## 📚 目录

1. [扩展开发指南 (Extension Guide)](#1-扩展开发指南-extension-guide) - **必读：如何添加新功能/字段**
2. [核心机制：上传与持久化](#2-核心机制上传与持久化) - **理解 Session、ID 管理和数据流**
3. [数据 Schema 定义](#3-数据-schema-definition) - **字段字典**

---

## 1. 扩展开发指南 (Extension Guide)

**适用场景**：您需要往工作流中添加一个新的数据字段（例如：`video_url`，`cover_image`），并希望它能被正确保存、上传并在前端显示、存储。

### 🛑 扩展字段 Checklist

在提交代码前，请按照此清单检查每一项：

- [ ] **1. Context 定义**: 在 `WorkflowContext.tsx` 的类型定义中添加了新字段吗？
- [ ] **2. 序列化/反序列化**: 在 `serializeSession` 和 `deserializeSession` 中处理了该字段吗？（注意：如果是大字段，是否需要打包？）
- [ ] **3. 后端 API**: 在 `server/index.cjs` 的 `/api/publish` 接口中，是否将该字段从 payload 映射到了 PocketBase 的 payload？
- [ ] **4. 数据库 Schema**: PocketBase 的 `articles` 或 `workflow_sessions` 表中是否创建了对应字段？

### 🛠️ 手把手实战：添加 `video_url`

假设我们要为文章增加一个视频链接字段 `video_url`。

#### 第 1 步：前端 Context 定义

修改 `src/context/WorkflowContext.tsx`。确保 Context 类型定义包含新字段。

#### 第 2 步：序列化逻辑 (关键！)

修改 `src/context/WorkflowContext.tsx` 中的 `serializeSession`。

```typescript
const serializeSession = useCallback((session: WorkflowSession) => {
    const contextClone = { ...session.context };
    // 如果字段需要存储在 workflow_sessions 表的独立列中（便于索引），提取出来
    // 否则直接保留在 context JSON 中即可
    return { ..., context: contextClone };
}, []);
```

#### 第 3 步：后端发布逻辑 `/api/publish`

修改 `server/index.cjs`。在构建 PocketBase Payload 时映射新字段。

```javascript
// server/index.cjs
const pbPayload = {
    // ...
    video_url: payload.video_url || '', // [NEW]
};
// Patch payload
if (payload.video_url !== undefined) updatePayload.video_url = payload.video_url;
```

#### 第 4 步：数据库 Schema 变更

在 PocketBase Admin (`/_/`) -> `articles` 集合 -> 添加 `video_url` 字段 (URL 类型)。

### 📡 高级：添加文件上传 (如 `cover_image`)

如果您要添加的是**文件**（二进制），流程如下：

1. **前端**：生成或获取文件，暂时保存在本地磁盘（`/temp/xxx.png`）。
2. **Payload**：将 `/temp/xxx.png` 这个路径作为 URL 传给后端。
3. **后端**：修改 `server/index.cjs` 中 `/api/publish` 的自动上传逻辑。

```javascript
// server/index.cjs
const fileFields = ['podcast_url', 'cover_image_url']; // 支持的字段列表
for (const field of fileFields) {
    const tempUrl = payload[field] || '';
    if (tempUrl.startsWith('/temp/')) {
        // 读取本地文件 -> FormData -> Patch Upload -> update URL
    }
}
```

---

## 2. 核心机制：上传与持久化

本节解释系统如何处理 Session 状态、ID 关联 以及 数据持久化。

### 2.1 Session 状态管理 (Stale Closure)

在处理异步上传时，**严禁使用组件渲染时捕获的 Session 变量**。必须使用 `getActiveSession()` 获取最新状态。

```tsx
// ✅ 正确写法
const handleUpload = async () => {
    const latestSession = getActiveSession(); // 获取最新引用
    const id = latestSession.context.articleId;
}
```

### 2.2 ID 关联与更新机制

系统支持 **PocketBase (远程)** 和 **本地文件系统** 双重存储。

- **PocketBase ID**: 15位字母数字 (e.g., `5ktp6adj133pz6m`)
- **本地临时 ID**: `article_` + 时间戳 (e.g., `article_1769154158401`)

**转正逻辑**：
当 `/api/publish` 返回真实 PB ID 时，前端必须立即调用 `updateSession` 将本地临时 ID 替换为真实 ID。后续步骤（如音频上传）依赖真实 ID。

### 2.3 字段存储与 Context Offloading

为了数据库性能，大字段在存储到 `workflow_sessions` 表时会被拆分。

| Context 字段 (内存) | Database 字段 (DB) | 说明 |
| :--- | :--- | :--- |
| `context.generationState.B` | `context2` | 备选生成结果 |
| `context.podcastScript` | `podcast_script_wf` | Level 10 脚本 |
| `context.articleJson7` | `context_7` (打包) | Level 7 文章数据 |
| `context.glossary7` | `context_7` (打包) | Level 7 词汇表 |

**注意**：`context_7` 是一个 JSON 字段，打包存储了 Level 7 的所有大对象，避免表列数膨胀。

---

## 3. 数据 Schema Definition

### 单词对象 (Glossary Item)

用于 `dictionary` 或 `glossary` 上下文及其 PocketBase 集合。

| 字段 | 类型 | 说明 | 示例 |
| :--- | :--- | :--- | :--- |
| `word` | String | 单词本身 | "afternoon" |
| `phonetic` | String | IPA 音标 | "'ɑ:ftә'nu:n" |
| `definitions` | Array | 释义数组 | `[{"pos":"n.","zh":"下午","en":"..."}]` |
| `collins` | String | 柯林斯星级 | "4" |
| `oxford` | Boolean | 牛津三千词 | true |
| `tag` | String | 标签 (空格分割) | "zk gk cet4" |
| `bnc` | Number | BNC 词频排名 | 1118 |
| `frq` | Number | Coca 词频排名 | 1191 |
| `exchange` | String | 形态变换 | "s:afternoons/p:..." |
| `detail` | JSON | 扩展信息(例句) | `{}` |

### 文章对象 (Article)

主要字段说明：

- **intro**: 导语对象 `{ type: "intro", text: "..." }`
- **paragraphs**: 段落数组。每个段落包含 `tokenizedSentences`，用于细粒度控制。
- **meta**: 元数据 `topic`, `level`, `date`。

(详细 JSON 结构请参考 `API_REFERENCE.md` 中的示例)
