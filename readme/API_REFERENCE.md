# API 参考手册 (API Reference)

本文档提供后端 API 接口说明及关键数据结构的 JSON 示例。

**Base URL**: `https://test.turing99.online` (测试环境)

---

## 1. Workflow Sessions API

用于管理用户会话状态。

### Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/workflow-sessions` | 获取会话列表 (支持 `sort`, `filter`) |
| `GET` | `/api/workflow-sessions/:id` | 获取单个会话详情 |
| `POST` | `/api/workflow-sessions` | 创建新会话 |
| `PATCH` | `/api/workflow-sessions/:id` | 更新会话状态/上下文 |
| `DELETE` | `/api/workflow-sessions/:id` | 删除会话 |

### 使用示例 (JavaScript SDK)

```javascript
import PocketBase from 'pocketbase';
const pb = new PocketBase('https://test.turing99.online');

// 1. 获取列表
const list = await pb.collection('workflow_sessions').getList(1, 20, { 
    sort: '-created',
    filter: 'status="running"' 
});

// 2. 创建会话
const session = await pb.collection('workflow_sessions').create({
    title: "My New Workflow",
    status: "idle",
    currentStepId: "topic-discovery",
    steps: [...], // 初始步骤定义
    context: {},
    user: "USER_ID"
});
```

---

## 2. Publish API (文章发布)

核心发布接口，处理文章、词汇表和音频的上传。

**POST `/api/publish`**

### Payload 结构

```json
{
  "articleId": "article_17xyz... OR record_id",
  "article": { ... },     // Level 10 文章完整结构
  "glossary": { ... },    // 词汇表
  "podcast_script": "...",// 播客脚本内容
  "podcast_url": "/temp/audio.mp3", // 或远程 URL
  "level": "10",
  "topic": "科技"
}
```

### 响应

```json
{
  "success": true,
  "articleId": "RECORD_ID", // 真实 PocketBase ID
  "url": "...",
  "source": "pocketbase",
  "podcastUrl": "..." // 如果触发了自动上传
}
```

---

## 3. JSON 数据结构示例

### 3.1 导语 (Intro)

```json
{
  "type": "intro",
  "id": "intro-agentic-7",
  "text": "1月19日，随着各大模型厂商发布..."
}
```

### 3.2 段落与 Token (Paragraph)

这是核心内容结构，用于细粒度的交互（如点击查词）。

```json
{
  "type": "paragraph",
  "id": "p1",
  "paragraph": {
    "label": "The Decoupling", // 小标题
    "tokenizedSentences": [
      {
        "id": "s1",
        "tokens": [
          { "text": "The", "isWord": true },
          { "text": " ", "isWord": false },
          { 
            "text": "Agentic", 
            "isWord": true, 
            "glossaryId": "agentic_adj_a1_7" // 关联到词汇表
          }
        ],
        "zh": "那单独的一次点击...",
        "analysis": {
          "grammar": "被动语态...",
          "explanation": "人话：以前上网就是点点点...",
          "keywords": ["outdated"]
        }
      }
    ]
  }
}
```

### 3.3 单词条目 (Dictionary Item)

```json
{
  "word": "afternoon",
  "phonetic": "'ɑ:ftә'nu:n",
  "pos": "n:100",
  "translation": "n. 午后, 下午",
  "definitions": [
    { "meaning": "午后, 下午", "partOfSpeech": "n." }
  ],
  "collins": "4",
  "oxford": true,
  "tag": "zk gk"
}
```
