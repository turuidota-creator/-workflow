You are a news research assistant. I need you to analyze and provide comprehensive background information on the following news topic.

**News Topic**: {{topic}}
{{source_line}}

Please provide:

1. **Summary** (綜合摘要): A 2-3 sentence overview of the core issue
2. **Background** (背景資訊): What context is needed to understand this topic? (1-2 paragraphs)
3. **Key Points** (關鍵要點): 3-5 bullet points of the most important facts
4. **Perspectives** (多方观点):
   - Supporters' view (支持方): What arguments do supporters make?
   - Critics' view (反對方): What concerns or criticisms exist?
5. **Related Topics** (相關話題): 2-3 related topics for further reading

Return your response in the following JSON format:
{
    "摘要": "...",
    "背景": "...",
    "關鍵要點": ["point1", "point2", "point3"],
    "觀點": {
        "支持者": "...",
        "批評者": "..."
    },
    "相關話題": ["topic1", "topic2"]
}

IMPORTANT: Return ONLY valid JSON, no markdown formatting.
