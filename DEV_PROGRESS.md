
# 开发进度追踪 (DEV_PROGRESS)

## 🎯 项目目标 (Project Goal)

**核心目标**: 构建一个全自动的英语内容生产工作流应用，通过可视化界面触发并监控以下管线：

1. **选题搜索 (Topic Discovery)**: 扫描全网新闻，选出高价值话题。
2. **文章生成 (Article Generation)**: 使用 AI (Gemini) 生成符合 ReadRead 规范的 Level 10/7 文章 JSON。
3. **词汇补全 (Vocabulary Completion)**: 提取重点词汇，生成释义，构建文章词汇表。
4. **播客脚本 (Podcast Script)**: 将文章转化为中英双语播客脚本。
5. **音频合成 (Audio Synthesis)**: 接入 TTS 引擎，合成播客 MP3。
6. **发布预览 (Publish Preview)**: 查看并编辑最终上传数据。
7. **发布同步 (Publishing)**: 将文章、词汇、音频打包上传至 PocketBase 后端。

**最终产物**: 自动化生成的完整文章和配套音频，可直接用于 ReadRead App 的内容更新。

---

## 🟢 已完成 (Done)

- [x] **项目初始化**
  - [x] Vite + React + TypeScript 脚手架
  - [x] Tailwind CSS 配置 (v3.4 稳定版)
  - [x] Node.js 后端服务 (Express, Port 3003)
- [x] **基础架构**
  - [x] Master-Detail 侧边栏布局
  - [x] 状态管理 (WorkflowContext)
  - [x] 全局设置页 (Settings Page)
  - [x] Gemini API 集成与测试
- [x] **Step 1: 选题搜索 (Topic Discovery)**
  - [x] 搜索界面 UI
  - [x] 模拟新闻扫描逻辑
  - [x] 中文汉化
- [x] **Step 2: 文章生成 (Article Generation)**
  - [x] 后端实现 `/api/generate` 接口 (调用 Gemini)
  - [x] 前端实现 A/B 双风格对比
  - [x] 前端实现 JSON 预览与选择
- [x] **Step 3: 词汇补全 (Vocabulary)**
  - [x] 后端：构建 `/api/vocabulary` 接口 (提取候选词 + 生成释义)
  - [x] 前端：交互式词汇卡片 (展示、删除)
  - [x] **词典同步功能** [NEW]
    - [x] 后端：`/api/dictionary/scan` (扫描文章单词)
    - [x] 后端：`/api/dictionary/generate` (生成释义)
    - [x] 后端：`/api/dictionary/add` (添加到词典)
    - [x] 前端：扫描按钮 + 覆盖率进度条
    - [x] 前端：缺失单词列表 + 一键添加
- [x] **Step 4: 播客脚本 (Podcast Script)**
  - [x] 后端：构建 `/api/podcast-script` 接口 (基于文章/词汇生成脚本)
  - [x] 前端：脚本编辑器 (可编辑 textarea)
  - [x] 前端：复制到剪贴板功能
- [x] **Step 5: 音频合成 (Audio Synthesis)**
  - [x] 后端：`/api/synthesize` 接口 (调用 Python TTS 脚本)
  - [x] 后端：临时文件存储与静态服务
  - [x] 前端：音频播放器 (试听 + 调速)
  - [x] 前端：进度条与下载按钮
  - [x] 音频合成仅保留真实 TTS 结果与错误处理
- [x] **Step 6: 发布预览与编辑 (Publish Preview)**
  - [x] 数据聚合：汇总 Article, Glossary, Script, Audio URL
  - [x] 服务器字段同步：`/api/schema` 接口 (PocketBase)
  - [x] 可视化编辑：左栏字段列表 + 右栏 JSON 预览
  - [x] 必填字段验证
- [x] **Step 7: 发布与同步 (Publishing)** ✅ 完成!
  - [x] 后端：`/api/publish` 接口 (PocketBase 或本地存储)
  - [x] 前端：发布确认页面
  - [x] 前端：成功/失败状态显示

## 🎉 项目核心功能已全部完成

所有 7 个步骤的工作流已实现，包括：

- 前端 UI 组件
- 后端 API 接口
- 生产路径已移除测试数据入口

## 🔴 已知问题 (Issues)

- [x] ~~新闻标签硬编码显示"科技"~~ (2026-01-22 已修复)
- [ ] 部分组件存在未使用变量的 lint 警告 (不影响功能)
- [ ] TTS 依赖 Python 环境配置

---

### 新闻标签与分组排序修复 (2026-01-22)

**问题**：扫描新闻后，标题显示"政治 | NYTimes Politics"，但标签固定显示"科技"。

**原因**：`TopicDiscovery.tsx` 第99行硬编码 `<span>科技</span>`。

**解决**：

1. 新增 `parseNewsTopic()` 函数解析 `【类别 | 来源】标题` 格式
2. 按类别分组显示（科技 > 政治 > 财经 > 其他）
3. 动态渲染类别标签，每个类别有独特颜色

### 新增"查看原文"功能 (2026-01-22)

**需求**：用户希望能够点击进入新闻原文。

**实现**：

1. 后端 `/api/news/scan` 新增链接提取，返回结构化数据 `{ items: [...], topics: [...] }`
2. 前端新增 `ExternalLink` 图标按钮，点击在新窗口打开原文
3. 使用 `e.stopPropagation()` 阻止冒泡，避免误触选择

## 📚 踩坑记录 (Lessons Learned)

### PocketBase v0.23+ API 变更 (2026-01-22)

> [!CAUTION]
> PocketBase v0.23+ 废弃了旧的 Admin Auth API！

**问题**：Admin 登录返回 404，无法获取 Token。

**原因**：

- ❌ 旧接口：`POST /api/admins/auth-with-password` (v0.23+ 已移除)
- ✅ 新接口：`POST /api/collections/_superusers/auth-with-password`

**解决**：更新 `server/index.cjs` 中的 Admin 认证端点。

---

### PocketBase 查询参数格式

> [!WARNING]
> 错误的查询参数会导致 400 Bad Request！

**常见陷阱**：

1. **Sort 字段名错误**：`sort=-created` 但字段可能叫 `createdAt` 或根本不存在
2. **Filter 语法**：必须用双引号 `filter=title="abc"`，不是单引号
3. **perPage 拼写**：必须是 `perPage`，不是 `per_page`

**调试技巧**：先不带任何参数测试 `/api/collections/xxx/records`，成功后再逐个添加参数。

---

### .env 特殊字符处理

**问题**：密码包含 `#` 符号被截断。

**原因**：`#` 在 `.env` 中被当作注释起始符。

**解决**：

```env
POCKETBASE_PASSWORD="1qaz@WSX#EDC"  # 用双引号包裹
```

后端代码需要正确解析引号：

```javascript
if (password.startsWith('"')) password = password.slice(1, -1);
```

---

### 大数据量分页

**问题**：Dictionary 有几千条记录，一次性返回导致超时/OOM。

**解决**：添加分页支持 `?page=1&perPage=500`。

---

### 文章生成修复与优化 (2026-01-22)

**需求**：

1. **Bug修复**：切换 Workflow 时文章生成状态丢失。
2. **体验优化**：生成结果框太小，难以阅读。
3. **功能完善**：实现 Old Editor (Style A) 和 Show-off (Style B) 的实际提示词差异。

**实现**：

1. **状态持久化**：
   - 扩展 `WorkflowSession.context` 类型，增加 `generationState` 字段。
   - `ArticleGeneration` 组件现在从 Session Context 初始化状态，并在生成完成后自动保存。
2. **样式提示词**：
   - 创建 `.agent/prompts/style_old_editor.md` 和 `.agent/prompts/style_show_off.md`。
   - 后端 `/api/generate` 接口根据 `style` 参数读取对应提示词文件并注入 Prompt。
3. **UI 调整**：
   - 文章生成结果框最小高度调整为 `600px`。

### 提示词配置升级 (2026-01-22)

**需求**：将文章生成风格 (Style A/B) 的提示词放入设置页面以便修改。

**实现**：

1. **后端 `/api/prompts` 扩展**：支持 `style-old-editor` 和 `style-show-off` 键值。
2. **Settings 页面更新**：在提示词下拉菜单中新增对应选项。
