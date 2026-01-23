[Sentence Analysis Partial Update - CRITICAL]
You must regenerate ONLY sentence-level analysis fields (analysis.grammar and analysis.explanation) in paragraph.tokenizedSentences.
Keep every other field EXACTLY the same as the previous draft (title, intro, paragraphs, tokens, meta, etc.).
DO NOT alter any other content or structure.

Previous Draft (JSON):
{{PREVIOUS_DRAFT_TRUNCATED}}

Requirements:

- Return full JSON in the exact schema.
- All analysis.grammar and analysis.explanation entries MUST start with Chinese characters.
- Output ONLY valid JSON, no markdown.
