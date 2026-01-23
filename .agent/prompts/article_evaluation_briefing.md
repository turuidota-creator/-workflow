[Briefing Partial Update - CRITICAL]
You must regenerate ONLY meta.briefing.{{BRIEFING_TARGET}} ({{BRIEFING_LABEL}}).
Keep every other field EXACTLY the same as the previous draft (title, intro, paragraphs, tokens, meta, etc.).
DO NOT alter any other content or structure.

Previous Draft (JSON):
{{PREVIOUS_DRAFT_TRUNCATED}}

Requirements:

- Return full JSON in the exact schema.
- briefings are in meta.briefing.
- briefing.grammar_analysis MUST start with Chinese characters.
- Output ONLY valid JSON, no markdown.
