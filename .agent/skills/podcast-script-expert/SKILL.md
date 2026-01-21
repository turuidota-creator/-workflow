---
name: podcast-script-expert
description: 基于 ReadRead App 文章内容生成中英双语播客脚本，适用于火山引擎等 TTS 软件直接合成。
---

# Podcast Script Expert Skill

此 Skill 用于指导 AI 将 ReadRead App 的 `Article` 数据结构转化为可直接输入 TTS 软件的高质量播客脚本。核心目标是产出具有 **"深度语法解析 + 逆向翻译挑战"** 教学逻辑的音频内容。

## 1. 核心原则 (Core Principles)

### 1.1 纯文本格式规范 (Text Format Compliance)

必须严格遵循火山引擎 (Volcengine/Doubao) TTS 文本输入规范：

1. **纯净文本**：只包含可朗读的文字和基础标点。
2. **严禁 Markdown**：绝对禁止 `**粗体**`, `_斜体_`, `titles`, `lists` 等标记。
3. **严禁非朗读符号**：绝对禁止 `(括号备注)`, `[标签]`, `{注释}` 或 `Leo:` 说话人标签。
4. **字符限制**：确保所有字符均为标准的中英文字符，移除所有 emoji 或特殊排版符号。
5. **全覆盖讲解**：必须对文章中的每一句话进行讲解，禁止节选。每一句都要完成“中文铺垫 -> 英文原文 -> 知识点解析”的完整闭环。

### 1.2 节奏与停顿控制 (Pacing Control)

利用**物理格式**控制 TTS 的呼吸感：

- **强制停顿**：使用**换行符 (Newlines)**。脚本中的**每一次换行**，系统会自动插入 `600ms` 的静音。
- **句内微停顿**：恰当使用中文逗号 `，` 或英文逗号 `,`。
- **从容感**：避免超长段落。将 long sentences 按意群切分为多行，以获得更自然的讲解节奏。

## 2. 脚本结构 (Script Structure)

### 2.1 黄金结构：开场 + N 个段落解析 + 收尾

```text
┌─────────────────────────────────────────────┐
│  Part 1: Opening Hook (开场白)               │
│  - 问候 + 自我介绍                           │
│  - 今日文章标题                              │
│  - 时政背景铺垫 (Background Context)         │
├─────────────────────────────────────────────┤
│  Part 2: Paragraph Analysis Loop (循环)      │
│  For each paragraph:                        │
│    1. 中文铺垫 (Chinese Context)            │
│    2. 逆向挑战 (Translation Challenge)        │
│    3. 英文揭晓 (English Reveal)              │
│    4. 语法深度解析 (Grammar Analysis)        │
│    5. 词汇即时释义 (Instant Gloss)           │
├─────────────────────────────────────────────┤
│  Part 3: Closing (收尾)                      │
│  - 总结金句                                  │
│  - 感谢 + 再见                               │
└─────────────────────────────────────────────┘
```

## 3. 教学逻辑：逆向思维 (Reverse Thinking)

**核心理念**：先给中文，挑战听众如何用英语表达，然后揭晓"地道写法"，让听众产生"原来如此"的顿悟感。

### 3.1 执行流程

**Step 1: 中文铺垫 (Chinese Context)**
用流畅的中文描述这句话想表达的意思。

```text
比如作者开篇想说：随着冰层融化，大国们开始疯狂抢夺资源，把气候悲剧变成了战略竞赛。
```

**Step 2: 逆向挑战 (Translation Challenge)**
轻推听众思考："如果让你来写呢？"

```text
如果让你来写，你可能会说 "Countries are fighting for resources"。
但作者为了强调那种混乱和急迫感，用了一个更形象的词：Scramble。
请听原文：
```

**Step 3: 英文揭晓 (English Reveal)**
读出原文英文句子。

```text
As the polar ice recedes, the littoral powers are engaged in a frantic scramble for what lies beneath, turning a climate tragedy into a strategic contest.
```

> [!IMPORTANT]
> **格式要求**：
>
> 1. 英文引用前必须有一个**空行**，强制 TTS 停顿。
> 2. 英文引用后也必须有一个**空行**。
> 3. 引用中不得有省略号 `...`。

**Step 4: 语法深度解析 (Grammar Analysis)**
用通俗中文讲解高级句法。

```text
这句话在语法上也非常紧凑。
句尾那个逗号后面的 turning，这叫作"现在分词短语作结果状语"。
作者没有用 and turns 这种平铺直叙的写法，而是用 turning 创造了一种"必然发生且紧随其后"的因果感。
```

**语法术语要求**：

- 必须准确使用术语（定语从句、状语从句、独立主格、分词短语、倒装等）。
- 术语后紧跟大白话解释，降低理解门槛。

**Step 5: 词汇即时释义 (Instant Gloss)**
每句拆解完毕后，自然地带出 1-3 个高级词汇的含义。

> [!WARNING]
> **严禁死板重复**：绝对禁止每句都用 "所以，[单词]..." 开头。

**推荐句式（需随机变换）**：

- "这里的 [word] 用得很妙，意思是..."
- "大家注意 [word] 这个词，它侧重于..."
- "[Word]，在这个语境下，指的是..."
- "作者特意选了 [word]，而不是 [synonym]，是为了强调..."

**Step 6: 英文回味 (Re-read)**
讲解透彻后，用一句自然的过渡语，引导听众再听一遍原文。

> [!WARNING]
> **严禁机械重复**：绝对禁止每次都说 "分析完了，我们再完整听一遍原文"。

**推荐过渡语（需随机变换）**：

- "带着这个理解，我们再来听一遍。"
- "明白了这层逻辑，这句话听起来就顺多了："
- "我们再细细品味一下作者的节奏："
- "现在，这些词是不是听起来清晰多了？"
- "再听一次，感受一下那种[情绪/语气]："

```text
带着这个理解，我们再来听一遍：

As the polar ice recedes, the littoral powers are engaged in a frantic scramble for what lies beneath, turning a climate tragedy into a strategic contest.
```

## 4. 风格指南 (Style Guide)

### 4.1 语气 (Tone)

- **客观分析**：像一个冷静但敏锐的语言观察者。
- **禁止过度吹捧**：删除"顶级外刊笔力"、"神来之笔"、"太漂亮了"等主观感叹。
- **允许适度认可**：可以使用"这种写法很紧凑"、"对比感很强"等功能性描述。

### 4.2 中英文比例 (Language Ratio)

- **主语言**：中文
- **英文出现场景**：读引用句、解释词汇
- **目标**：让听众感觉是在"用中文听懂一篇英文文章"

### 4.3 单人模式 (Single Host Only)

- **唯一模式**：仅支持单人讲解。
- **角色**：资深英语老师 (Leo)。
- **格式**：全程独白，**不需要**在行首添加 `Leo:` 标签。直接输出讲解内容即可。

## 5. 输入数据 (Input Data)

此 Skill 接受 ReadRead App 的 `Article` 对象作为输入。

**关键字段**：

- `meta.briefing`: 用于生成开场白的时政背景。
- `paragraphs[].paragraph.tokenizedSentences[]`: 核心英文句子。
- `paragraphs[].paragraph.tokenizedSentences[].zh`: 中文翻译。
- `paragraphs[].paragraph.tokenizedSentences[].analysis.grammar`: 语法点拨。
- `paragraphs[].paragraph.tokenizedSentences[].analysis.explanation`: 大白话解读。
- `glossary`: 词汇表。

## 6. 示例输出 (Example Output)

```text
Hello everyone, welcome to ReadRead Daily. I'm Leo.
今天我们要解读 1月19日 的头条文章：北极争夺战。

先给大家交代一下背景：就在1月19日，最新的卫星图像显示，北极海冰的覆盖面积创下了历史新低。
这对环保主义者来说是坏消息，但对于沿海大国来说，这却是发令枪响——意味着原本封冻的资源和航道可以被开发了。
于是，一场针对石油、天然气和战略支点的地缘争夺战正式开打。

比如作者开篇想说：随着冰层融化，大国们开始疯狂抢夺资源，把气候悲剧变成了战略竞赛。
如果让你来写，你可能会说 "Countries are fighting for resources"。
但作者为了强调那种混乱和急迫感，用了一个更形象的词：Scramble。
请听原文：

As the polar ice recedes, the littoral powers are engaged in a frantic scramble for what lies beneath, turning a climate tragedy into a strategic contest.

这句话在语法上也非常紧凑。
句尾那个逗号后面的 turning，这叫作"现在分词短语作结果状语"。
这是一句非常地道的 user-friendly 表达。
"Rendering..." 是分词作结果状语，表示“导致...变得”。
这里的 obsolete 选词很准，指不仅仅是旧了，而是彻底被淘汰、废弃了。
带着这种历史被翻页的沧桑感，我们再听一遍：

The solitary click, once the fundamental atom of digital interaction, is being definitively split by the arrival of the Agentic Web, rendering the traditional browser increasingly obsolete.

...

Thanks for listening. See you next time!
```

## 7. 触发方式 (Activation)

当用户请求为某篇文章生成播客脚本时，AI 应：

1. 读取目标 `Article` 文件。
2. 提取 `briefing` 生成开场白。
3. 遍历 `paragraphs`，对每个 `TokenizedSentence` 执行"逆向思维"流程。
4. 生成纯文本脚本，输出到 `podcast_script_demo.md` 或用户指定路径。
5. **自我审查 (Self-Audit)**：
    - 检查是否包含了文章中**所有的**句子。
    - 如果发现遗漏，必须重新生成，直到覆盖率为 100%。
6. 使用 `notify_user` 工具请求用户审阅。

## 8. 音频生成 (Audio Generation)

脚本确认通过后，使用以下脚本调用火山引擎 TTS 生成最终音频。

### 8.1 默认配置

- **模型**: `seed-tts-2.0`
- **音色**: `zh_male_taocheng_uranus_bigtts` (资深男老师)
- **语速**: `-15` (适中偏慢，适合教学)
- **Prompt**: 资深英语老师，轻松幽默，娓娓道来。
- **停顿控制**: 脚本中每个**换行符**会自动增加 `600ms` 的静音停顿。

### 8.2 生成命令

```powershell
python .agent/skills/podcast-script-expert/scripts/generate_podcast.py "path/to/script.txt" "path/to/output.mp3"
```

### 8.3 集成工作流

1. **生成**: 使用 TTS 生成 MP3 文件 (e.g. `temp_audio.mp3`)。
2. **上传**: 运行上传脚本将音频关联到文章。

   ```bash
   node .agent/scripts/upload_podcast.js "文章标题或通过Slug" "path/to/temp_audio.mp3"
   ```

   *脚本会自动查找对应文章并上传文件至 PocketBase 存储，同时更新 `podcast_file` 字段。*

3. **验证**: 确认脚本输出 "Success! Podcast attached to..."。

> [!CRITICAL]
> **无需手动修改 .ts 文件**：
> 由于文章已迁移至数据库，**严禁**尝试修改本地 `src/data/articles/*.ts` 文件。所有的数据更新必须通过 Database Script 完成。
