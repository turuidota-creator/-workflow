# 数据库浏览器 (Database Browser) 功能文档

## 概述

数据库浏览器是一个内置于内容工作流应用中的组件，旨在允许用户直接查看、管理和调试 PocketBase 数据库或本地存储的内容。

## 功能特性

1. **通用集合浏览**：
    - 自动获取 PocketBase 中的所有集合列表。
    - 支持查看本地存储的特殊集合（如 `articles` 和 `dictionary`）。
    - 显示数据源状态（PocketBase 或 Local Storage）。

2. **详情查看**：
    - 左侧显示记录列表，支持智能标题推断（尝试查找 `title`, `name`, `id` 等字段）。
    - 右侧显示完整的 JSON 数据。
    - 支持预览关键字段（如 email, briefing 等）。

3. **数据管理**：
    - 支持删除 `articles` 集合中的记录。
    - 支持查看 `dictionary` (本地 JSON) 内容。

## 技术实现

### 后端 API (`server/index.cjs`)

后端提供了一组通用的 API 接口来代理前端与 PocketBase 或本地文件系统的交互。

- **`GET /api/database/collections`**
  - 尝试连接 PocketBase 获取所有集合列表。
  - 如果连接失败或未配置，返回本地支持的集合列表 (`articles`, `dictionary`)。
  - 返回格式包含 `source` 字段指示数据来源。

- **`GET /api/database/collections/:name/records`**
  - 获取指定集合的记录列表。
  - **特殊处理**：
    - `:name = 'dictionary'`：读取本地 `data/dictionary.json`。
    - `:name = 'articles'` 且无 PocketBase：读取 `output/articles/` 目录下的 JSON 文件。
  - **通用处理**：
    - 如果连接了 PocketBase，代理请求到 `/api/collections/:name/records`。

- **`DELETE /api/database/articles/:id`**
  - (目前保留旧接口) 用于删除文章。支持删除本地文件或 PocketBase 记录。

### 前端组件 (`src/components/DatabaseBrowser.tsx`)

- 使用 React `useEffect` 初始化时加载集合列表。
- 维护 `collections`, `activeCollection`, `records` 等状态。
- **智能标题显示** (`getDisplayTitle`)：
  - 为了在列表中友好地显示不同类型的记录，组件会按优先级尝试读取：`word` > `title` > `name` > `email` > `username` > `meta.title` > `id`。

## 配置

在 `.env` 文件中配置 PocketBase 连接信息：

```env
POCKETBASE_URL=https://test.turing99.online
POCKETBASE_EMAIL=your-email
POCKETBASE_PASSWORD=your-password
```

如果未配置，将默认回退到本地文件模式。
