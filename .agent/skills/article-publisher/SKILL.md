---
name: article-publisher
description: 负责将生成的 Article JSON 上传至数据库，并清理临时文件。
---

# Article Publisher Skill

## 1. 核心目标 (Core Objective)

将 `article-generator` 生成的 `temp_article.json` 上传到 PocketBase 数据库。

---

## 2. 前提条件 (Prerequisites)

1. **PocketBase 运行中**: 本地 `http://127.0.0.1:8090` 或生产环境。
2. **`.env` 配置**:

   ```env
   POCKETBASE_URL=http://127.0.0.1:8090
   POCKETBASE_EMAIL=admin@example.com
   POCKETBASE_PASSWORD=your-password
   ```

3. **Schema 已创建**: Collection `articles` 存在（通过 App 内 "Initialize Backend Data" 或手动创建）。

---

## 3. 执行步骤 (Execution Steps)

### Step 1: 检查文件

确认 `temp_article.json` 存在且格式正确：

```json
{
  "article": { "meta": {...}, "intro": {...}, "title": {...}, "paragraphs": [...] },
  "glossary": { ... }
}
```

### Step 2: 运行上传脚本

```bash
node .agent/scripts/upload_article.js temp_article.json
```

**脚本行为**:

1. 读取 JSON 文件。
2. 认证 PocketBase Admin。
3. 检查是否存在相同 `date` + `title_en` 的记录。
4. **Create** (新建) 或 **Update** (覆盖)。
5. 输出 `Success! Record ID: xxx`。

### Step 3: 验证结果

- 登录 PocketBase Admin UI (`/api/`) 检查记录。
- 或运行 App 查看文章是否出现。

### Step 4: 清理

仅当上传**成功**后，删除 `temp_article.json`。

---

## 4. PocketBase 字段映射 (Field Mapping)

| PB Field | Type | Source in JSON |
| :--- | :--- | :--- |
| `date` | Date | `article.meta.date` |
| `level` | Select | `article.meta.level` |
| `topic` | Select | `article.meta.topic` |
| `title_zh` | Text | `article.title.zh` |
| `title_en` | Text | `article.title.en` |
| `intro` | JSON | `article.intro` |
| `content` | JSON | `{ meta: article.meta, paragraphs: article.paragraphs }` |
| `glossary` | JSON | `glossary` |
| `podcast_url` | Text | `article.podcastUrl` (可选) |
| `podcast_file` | File | 单独上传 (见 `upload_podcast.js`) |

---

## 5. 常见报错 (Troubleshooting)

| 错误 | 原因 | 解决 |
| :--- | :--- | :--- |
| `Missing article.meta` | JSON 格式错误 | 检查 `temp_article.json` 结构 |
| `400 Validation Error` | 字段类型不匹配 (e.g., `level` 必须是 `'7'` 而非 `7`) | 确保值为字符串 |
| `Network Error` | PocketBase 未启动 | 启动 PB 或检查 `.env` URL |
| `Unauthorized` | 凭据错误/缺失 | 检查 `.env` 中的 `POCKETBASE_EMAIL`/`PASSWORD` |
