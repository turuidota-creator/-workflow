
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const app = express();
const PORT = 3003;

// ================= PROXY CONFIGURATION =================
// Configure global proxy if HTTPS_PROXY is set
// ================= PROXY CONFIGURATION =================
// Configure proxy dispatcher if HTTPS_PROXY is set
// This requires 'undici' package: npm install undici
let proxyDispatcher = undefined;
try {
    const envPath = path.resolve(__dirname, '..', '.env');
    if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf-8');
        const match = content.match(/HTTPS_PROXY=(.+)/);
        if (match && match[1]) {
            const proxyUrl = match[1].trim();
            const { ProxyAgent } = require('undici');
            proxyDispatcher = new ProxyAgent(proxyUrl);
            console.log(`[Proxy] Proxy dispatcher configured: ${proxyUrl}`);
        }
    }
} catch (e) {
    console.warn('[Proxy] Failed to configure proxy (undici might be missing):', e.message);
}

app.use(cors());
app.use(bodyParser.json());

// ================= CONSTANTS =================
const PROJECT_ROOT = path.resolve(__dirname, '..');
const AGENT_DIR = path.join(PROJECT_ROOT, '.agent');
const SKILLS_DIR = path.join(AGENT_DIR, 'skills');
const SCRIPTS_DIR = path.join(AGENT_DIR, 'scripts');

// ================= POCKETBASE AUTH HELPER =================
let pbAuthToken = null;
let pbAuthExpiry = 0;

async function getPocketBaseAuth() {
    try {
        const envPath = path.join(PROJECT_ROOT, '.env');
        if (!fs.existsSync(envPath)) {
            console.log('[DB Debug] .env file not found');
            return { url: null, token: null };
        }

        const content = fs.readFileSync(envPath, 'utf-8');
        const lines = content.split('\n');

        let pbUrl = null;
        let email = null;
        let password = null;

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) continue;

            if (trimmed.startsWith('POCKETBASE_URL=')) {
                pbUrl = trimmed.substring('POCKETBASE_URL='.length).trim();
            } else if (trimmed.startsWith('POCKETBASE_EMAIL=')) {
                email = trimmed.substring('POCKETBASE_EMAIL='.length).trim();
            } else if (trimmed.startsWith('POCKETBASE_PASSWORD=')) {
                password = trimmed.substring('POCKETBASE_PASSWORD='.length).trim();
            }
        }

        // Handle quotes if present
        if (email && (email.startsWith('"') || email.startsWith("'"))) {
            email = email.slice(1, -1);
        }
        if (password && (password.startsWith('"') || password.startsWith("'"))) {
            password = password.slice(1, -1);
        }

        console.log(`[DB Debug] Auth Config - URL: ${pbUrl}, Email: ${email}, Password Length: ${password ? password.length : 0}`);

        if (!pbUrl) return { url: null, token: null };

        // Check if token is still valid (cache for 1 hour)
        if (pbAuthToken && Date.now() < pbAuthExpiry) {
            return { url: pbUrl, token: pbAuthToken };
        }

        // Login to PocketBase
        if (email && password) {
            try {
                console.log('Authenticating with PocketBase...');
                // Try users collection first
                const response = await fetch(`${pbUrl}/api/collections/users/auth-with-password`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ identity: email, password: password })
                });

                if (response.ok) {
                    const data = await response.json();
                    pbAuthToken = data.token;
                    pbAuthExpiry = Date.now() + 3600000; // 1 hour
                    console.log('PocketBase user auth successful');
                    return { url: pbUrl, token: pbAuthToken };
                } else {
                    console.log(`[DB Debug] User Auth Failed: ${response.status} ${await response.text()}`);
                }

                // Try admin auth (using _superusers collection for PB v0.23+)
                console.log('Trying admin/superuser auth...');
                const adminResponse = await fetch(`${pbUrl}/api/collections/_superusers/auth-with-password`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ identity: email, password: password })
                });

                if (adminResponse.ok) {
                    const data = await adminResponse.json();
                    pbAuthToken = data.token;
                    pbAuthExpiry = Date.now() + 3600000;
                    console.log('PocketBase superuser auth successful');
                    return { url: pbUrl, token: pbAuthToken };
                } else {
                    console.log(`[DB Debug] Superuser Auth Failed: ${adminResponse.status} ${await adminResponse.text()}`);
                }

                console.log('PocketBase auth failed - no valid credentials');
            } catch (authError) {
                console.error('PocketBase auth error:', authError.message);
            }
        }

        return { url: pbUrl, token: null };
    } catch (e) {
        console.error('getPocketBaseAuth error:', e.message);
        return { url: null, token: null };
    }
}

// ================= API ROUTES =================

/**
 * GET /api/config
 * Read .env file
 */
app.get('/api/config', (req, res) => {
    try {
        const envPath = path.join(PROJECT_ROOT, '.env');
        if (!fs.existsSync(envPath)) return res.json({});

        const content = fs.readFileSync(envPath, 'utf-8');
        const config = {};
        content.split('\n').forEach(line => {
            const [key, val] = line.split('=');
            if (key && val) config[key.trim()] = val.trim();
        });
        res.json(config);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

/**
 * POST /api/config
 * Write to .env file
 */
app.post('/api/config', (req, res) => {
    try {
        const newConfig = req.body; // { GEMINI_API_KEY: "..." }
        const envPath = path.join(PROJECT_ROOT, '.env');

        let content = '';
        if (fs.existsSync(envPath)) {
            content = fs.readFileSync(envPath, 'utf-8');
        }

        // Simple update logic (append or replace)
        // For MVP, we'll just rewrite the keys we know, maintaining others is harder without parsing lib
        // Let's just append/replace simply
        const lines = content.split('\n');
        Object.keys(newConfig).forEach(key => {
            const idx = lines.findIndex(l => l.startsWith(key + '='));
            if (idx !== -1) {
                lines[idx] = `${key}=${newConfig[key]}`;
            } else {
                lines.push(`${key}=${newConfig[key]}`);
            }
        });

        fs.writeFileSync(envPath, lines.join('\n').replace(/\n+/g, '\n').trim(), 'utf-8');
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

/**
 * GET /api/prompts
 * Get prompt content by key
 */
app.get('/api/prompts', (req, res) => {
    try {
        const { key } = req.query;
        let filePath = '';

        if (key === 'article-system') {
            filePath = path.join(SKILLS_DIR, 'article-generator', 'SKILL.md');
        } else if (key === 'research-template') {
            filePath = path.join(AGENT_DIR, 'prompts', 'research.md');
        } else if (key === 'vocabulary-system') {
            filePath = path.join(SKILLS_DIR, 'vocabulary-production-expert', 'SKILL.md');
        } else if (key === 'style-old-editor') {
            filePath = path.join(AGENT_DIR, 'prompts', 'style_old_editor.md');
        } else if (key === 'style-show-off') {
            filePath = path.join(AGENT_DIR, 'prompts', 'style_show_off.md');
        } else {
            return res.status(400).json({ error: "Invalid key" });
        }

        if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf-8');
            res.json({ content });
        } else {
            res.json({ content: '' });
        }
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

/**
 * POST /api/prompts
 * Save prompt content
 */
app.post('/api/prompts', (req, res) => {
    try {
        const { key, content } = req.body;
        let filePath = '';

        if (key === 'article-system') {
            filePath = path.join(SKILLS_DIR, 'article-generator', 'SKILL.md');
        } else if (key === 'research-template') {
            filePath = path.join(AGENT_DIR, 'prompts', 'research.md');
        } else if (key === 'vocabulary-system') {
            filePath = path.join(SKILLS_DIR, 'vocabulary-production-expert', 'SKILL.md');
        } else if (key === 'style-old-editor') {
            filePath = path.join(AGENT_DIR, 'prompts', 'style_old_editor.md');
        } else if (key === 'style-show-off') {
            filePath = path.join(AGENT_DIR, 'prompts', 'style_show_off.md');
        } else {
            return res.status(400).json({ error: "Invalid key" });
        }

        // Ensure directory exists
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(filePath, content, 'utf-8');
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

/**
 * POST /api/test-gemini
 * Simple test call to Gemini (using fetch in Node 18+)
 */
app.post('/api/test-gemini', async (req, res) => {
    try {
        const envPath = path.join(PROJECT_ROOT, '.env');
        const content = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : '';
        const match = content.match(/GEMINI_API_KEY=(.+)/);
        const apiKey = match ? match[1].trim() : null;

        if (!apiKey) return res.status(400).json({ error: "Missing GEMINI_API_KEY in .env" });

        // Simple prompt
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-preview:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: "Hello! Reply with 'Gemini is Online'." }] }]
            }),
            dispatcher: proxyDispatcher
        });

        const data = await response.json();
        res.json(data);
    } catch (e) {
        res.status(500).json({ error: e.message, stack: e.stack });
    }
});

/**
 * POST /api/generate
 * Generate article using Gemini and SKILL.md prompt
 */
app.post('/api/generate', async (req, res) => {
    try {
        const { topic, level = "10", researchContext, targetDate } = req.body;

        // 1. Get API Key and Model from config
        const envPath = path.join(PROJECT_ROOT, '.env');
        const content = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : '';
        const apiKeyMatch = content.match(/GEMINI_API_KEY=(.+)/);
        const modelMatch = content.match(/ARTICLE_MODEL=(.+)/);
        const apiKey = apiKeyMatch ? apiKeyMatch[1].trim() : null;
        const modelName = modelMatch ? modelMatch[1].trim() : 'gemini-3-pro-preview';

        if (!apiKey) return res.status(400).json({ error: "Missing GEMINI_API_KEY" });

        // Use targetDate if provided, otherwise use today
        const articleDate = targetDate || new Date().toISOString().split('T')[0];
        console.log(`[Generate] Using model: ${modelName}, Article Date: ${articleDate}`);

        // 2. Read System Prompt (SKILL.md)
        const skillPath = path.join(SKILLS_DIR, 'article-generator', 'SKILL.md');
        if (!fs.existsSync(skillPath)) {
            return res.status(404).json({ error: "article-generator skill not found" });
        }
        const systemPrompt = fs.readFileSync(skillPath, 'utf-8');

        // 3. Construct User Prompt with optional research context
        let userPrompt = `
        Target Topic: ${topic}
        Target Level: ${level}
        Article Date (meta.date): ${articleDate}
        IMPORTANT: Use this exact date for the meta.date field in the output JSON.
        `;

        // If we have research context, include it for richer content generation
        if (researchContext && typeof researchContext === 'object') {
            userPrompt += `
        
        [Deep Research Results - Use this to enrich the article]
        
        Summary: ${researchContext.summary || 'N/A'}
        
        Background Context: ${researchContext.background || 'N/A'}
        
        Key Points:
        ${(researchContext.keyPoints || []).map((p, i) => `${i + 1}. ${p}`).join('\n        ')}
        
        Different Perspectives:
        - Supporters' View: ${researchContext.perspectives?.supporters || 'N/A'}
        - Critics' View: ${researchContext.perspectives?.critics || 'N/A'}
        
        Related Topics: ${(researchContext.relatedTopics || []).join(', ') || 'N/A'}
        
        IMPORTANT: Use the above research to create a balanced, informative article that:
        1. Includes relevant background context
        2. Presents multiple perspectives (both supporting and critical views)
        3. References the key points discovered
        `;
        } else {
            // Fallback to simulated research for basic generation
            userPrompt += `
        [Basic Research Data]
        Latest news indicates that "${topic}" is a trending issue. 
        Key entities involved: Global Tech Giants, Governments.
        Context: Significant developments have occurred in this field recently.
        `;
        }

        // Read Style Prompts
        const promptsDir = path.join(AGENT_DIR, 'prompts');
        const style = req.body.style; // 'A' or 'B'
        if (style === 'A') {
            const stylePath = path.join(promptsDir, 'style_old_editor.md');
            if (fs.existsSync(stylePath)) stylePrompt = fs.readFileSync(stylePath, 'utf-8');
        } else if (style === 'B') {
            const stylePath = path.join(promptsDir, 'style_show_off.md');
            if (fs.existsSync(stylePath)) stylePrompt = fs.readFileSync(stylePath, 'utf-8');
        }

        userPrompt += `
        Task: Transform this research into the JSON format defined in the System Prompt.
        
        ${stylePrompt}
        `;

        // Refinement Logic (Rewrite with Feedback)
        const { previousDraft, feedback } = req.body;
        if (previousDraft && feedback) {
            userPrompt += `
            
            [Refinement Task - CRITICAL]
            The previous draft failed specific audit checks. You must fix these errors while maintaining the required style.
            
            Previous Draft (JSON):
            ${JSON.stringify(previousDraft).substring(0, 15000)} ... (truncated if too long) ...

            Audit Feedback / Errors to Fix:
            ${feedback}

            Action: Rewrite the article to fix these errors.
            CRITICAL REQUIREMENT: You MUST regenerate the full 'tokens' array for every sentence. The 'tokens' array contains the English text and MUST NOT be empty. Do not omit the English tokens.
            `;
        }

        userPrompt += `
        IMPORTANT: Return ONLY valid JSON, no markdown code blocks.
        `;

        // 4. Call Gemini
        console.log(`Generating article for topic: ${topic}...`);
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [
                    { role: "user", parts: [{ text: systemPrompt + "\n\n" + userPrompt }] }
                ],
                generationConfig: {
                    temperature: 0.7,
                    responseMimeType: "application/json"
                }
            }),
            dispatcher: proxyDispatcher
        });

        const data = await response.json();

        if (data.error) {
            console.error("Gemini Error:", data.error);
            return res.status(500).json({ error: data.error.message });
        }

        const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!generatedText) {
            return res.status(500).json({ error: "No content generated" });
        }

        // 5. Parse JSON (Validation)
        try {
            // Robust JSON extraction
            let jsonString = generatedText;

            // Try to find markdown block first
            const markdownMatch = jsonString.match(/```json\s*([\s\S]*?)\s*```/);
            if (markdownMatch) {
                jsonString = markdownMatch[1];
            } else {
                // If no markdown block, try to find the outer-most JSON object
                const firstBrace = jsonString.indexOf('{');
                const lastBrace = jsonString.lastIndexOf('}');

                if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
                    jsonString = jsonString.substring(firstBrace, lastBrace + 1);
                }
            }

            const json = JSON.parse(jsonString);
            res.json(json);
        } catch (e) {
            console.error("JSON Parse Error:", e);
            // Return raw text if parse fails, so user can debug
            res.json({ error: "Invalid JSON format", raw: generatedText });
        }

    } catch (e) {
        console.error("Server Error:", e);
        res.status(500).json({ error: e.message });
    }
});

/**
 * GET /api/health
 * Health check
 */
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
});

/**
 * POST /api/research
 * Deep research on a topic - fetch additional background info, perspectives, etc.
 * Uses Gemini with grounding to search for related information
 */
app.post('/api/research', async (req, res) => {
    try {
        const { topic, newsTitle, newsSource, targetDate } = req.body;

        if (!topic && !newsTitle) {
            return res.status(400).json({ error: "Missing topic or newsTitle" });
        }

        // 1. Get API Key and Model from config
        const envPath = path.join(PROJECT_ROOT, '.env');
        const content = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : '';
        const apiKeyMatch = content.match(/GEMINI_API_KEY=(.+)/);
        const modelMatch = content.match(/RESEARCH_MODEL=(.+)/);
        const apiKey = apiKeyMatch ? apiKeyMatch[1].trim() : null;
        const researchModel = modelMatch ? modelMatch[1].trim() : 'gemini-3-flash-preview';

        if (!apiKey) return res.status(400).json({ error: "Missing GEMINI_API_KEY" });

        const searchTopic = newsTitle || topic;
        const dateContext = targetDate ? `Focus on news and events from ${targetDate}.` : '';
        console.log(`[Research] Starting deep research on: ${searchTopic} (Date: ${targetDate || 'any'}) using model: ${researchModel}`);

        // 2. Construct research prompt
        const promptsDir = path.join(AGENT_DIR, 'prompts');
        const researchPromptPath = path.join(promptsDir, 'research.md');
        let researchPrompt = '';

        if (fs.existsSync(researchPromptPath)) {
            researchPrompt = fs.readFileSync(researchPromptPath, 'utf-8');
        } else {
            // Fallback if file missing
            researchPrompt = `
You are a news research assistant. I need you to analyze and provide comprehensive background information on the following news topic.

**News Topic**: {{topic}}
{{source_line}}
{{date_context}}

Please provide:
1. **Summary** (综合摘要): A 2-3 sentence overview of the core issue
2. **Background** (背景信息): What context is needed to understand this topic? (1-2 paragraphs)
3. **Key Points** (关键要点): 3-5 bullet points of the most important facts
4. **Perspectives** (多方观点):
   - Supporters' view (支持方): What arguments do supporters make?
   - Critics' view (反对方): What concerns or criticisms exist?
5. **Related Topics** (相关话题): 2-3 related topics for further reading

Return your response in the following JSON format:
{
    "summary": "...",
    "background": "...",
    "keyPoints": ["point1", "point2", "point3"],
    "perspectives": {
        "supporters": "...",
        "critics": "..."
    },
    "relatedTopics": ["topic1", "topic2"]
}

IMPORTANT: Return ONLY valid JSON, no markdown formatting.
`;
        }

        // Replace placeholders
        researchPrompt = researchPrompt.replace('{{topic}}', searchTopic);
        const sourceLine = newsSource ? `**Original Source**: ${newsSource}` : '';
        researchPrompt = researchPrompt.replace('{{source_line}}', sourceLine);
        researchPrompt = researchPrompt.replace('{{date_context}}', dateContext);



        // 3. Call Gemini with grounding
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${researchModel}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [
                    { role: "user", parts: [{ text: researchPrompt }] }
                ],
                tools: [{
                    googleSearch: {}
                }],
                generationConfig: {
                    temperature: 0.3,
                    responseMimeType: "application/json"
                }
            }),
            dispatcher: proxyDispatcher
        });

        const data = await response.json();

        if (data.error) {
            console.error("[Research] Gemini Error:", data.error);
            return res.status(500).json({ error: data.error.message });
        }

        const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

        // Extract grounding metadata if available
        const groundingMetadata = data.candidates?.[0]?.groundingMetadata;
        const searchSuggestions = groundingMetadata?.webSearchQueries || [];
        const groundingChunks = groundingMetadata?.groundingChunks || [];

        if (!generatedText) {
            return res.status(500).json({ error: "No research content generated" });
        }

        // 4. Parse and return results
        try {
            const researchResult = JSON.parse(generatedText.replace(/```json/g, '').replace(/```/g, ''));

            // Add source information from grounding
            researchResult.sources = groundingChunks.map(chunk => ({
                title: chunk.web?.title || 'Unknown',
                url: chunk.web?.uri || ''
            })).filter(s => s.url);

            researchResult.searchQueries = searchSuggestions;
            researchResult.topic = searchTopic;

            console.log(`[Research] Completed research with ${researchResult.sources?.length || 0} sources`);
            res.json(researchResult);
        } catch (e) {
            console.error("[Research] JSON Parse Error:", e);
            res.json({
                error: "Invalid JSON format",
                raw: generatedText,
                topic: searchTopic
            });
        }

    } catch (e) {
        console.error("[Research] Server Error:", e);
        res.status(500).json({ error: e.message });
    }
});

/**
 * POST /api/vocabulary
 * Extract vocabulary from article and generate glossary
 */
app.post('/api/vocabulary', async (req, res) => {
    try {
        const { articleJson } = req.body;

        // 1. Get API Key
        const envPath = path.join(PROJECT_ROOT, '.env');
        const content = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : '';
        const match = content.match(/GEMINI_API_KEY=(.+)/);
        const apiKey = match ? match[1].trim() : null;

        if (!apiKey) return res.status(400).json({ error: "Missing GEMINI_API_KEY" });

        // 2. Read SKILL.md for vocabulary-production-expert
        const skillPath = path.join(SKILLS_DIR, 'vocabulary-production-expert', 'SKILL.md');
        let systemPrompt = "";
        if (fs.existsSync(skillPath)) {
            systemPrompt = fs.readFileSync(skillPath, 'utf-8');
        } else {
            // Fallback prompt if skill not exists
            systemPrompt = `
            You are a vocabulary extraction expert for English learners.
            Given an article JSON, identify all important vocabulary words for intermediate/advanced learners.
            For each word, provide:
            - word: the word itself (lowercase)
            - phonetic: IPA pronunciation
            - definitions: array of { pos: "noun"|"verb"|etc, zh: "中文释义", en: "English definition" }
            - example: a sentence from the article using this word
            Return JSON format: { "glossary": { "wordKey": { definition object } } }
            `;
        }

        // 3. Construct User Prompt
        const userPrompt = `
        Extract vocabulary from the following article.
        Focus on words that:
        - Are Level 7-10 (intermediate-advanced)
        - Are key to understanding the article
        - May be challenging for non-native speakers
        
        Article JSON:
        ${JSON.stringify(articleJson, null, 2)}
        
        Return ONLY valid JSON with glossary map.
        `;

        // 4. Call Gemini
        console.log('Generating vocabulary glossary...');
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [
                    { role: "user", parts: [{ text: systemPrompt + "\n\n" + userPrompt }] }
                ],
                generationConfig: {
                    temperature: 0.3,
                    responseMimeType: "application/json"
                }
            }),
            dispatcher: proxyDispatcher
        });

        const data = await response.json();

        if (data.error) {
            console.error("Gemini Error:", data.error);
            return res.status(500).json({ error: data.error.message });
        }

        const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!generatedText) {
            return res.status(500).json({ error: "No content generated" });
        }

        // 5. Parse JSON
        try {
            const json = JSON.parse(generatedText.replace(/```json/g, '').replace(/```/g, ''));
            res.json(json);
        } catch (e) {
            console.error("JSON Parse Error:", e);
            res.json({ error: "Invalid JSON format", raw: generatedText });
        }

    } catch (e) {
        console.error("Server Error:", e);
        res.status(500).json({ error: e.message });
    }
});

// ================= DICTIONARY SYNC APIs =================

// Local dictionary storage (JSON file)
const DICTIONARY_PATH = path.join(PROJECT_ROOT, 'data', 'dictionary.json');

// Helper: Load dictionary from file
function loadDictionary() {
    try {
        if (fs.existsSync(DICTIONARY_PATH)) {
            return JSON.parse(fs.readFileSync(DICTIONARY_PATH, 'utf-8'));
        }
    } catch (e) {
        console.error('Error loading dictionary:', e);
    }
    return {};
}

// Helper: Save dictionary to file
function saveDictionary(dict) {
    const dir = path.dirname(DICTIONARY_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DICTIONARY_PATH, JSON.stringify(dict, null, 2), 'utf-8');
}

// Helper: Extract words from article
function extractWordsFromArticle(articleJson) {
    const uniqueWords = new Set();
    let rawCount = 0;

    // Navigate the structure safely
    const data = articleJson.article || articleJson;
    const paragraphs = data.paragraphs || [];

    // Common stop words to exclude from GLOSSARY (but count in Total)
    const commonWords = new Set([
        'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had',
        'her', 'was', 'one', 'our', 'out', 'has', 'his', 'how', 'its', 'may',
        'new', 'now', 'old', 'see', 'way', 'who', 'boy', 'did', 'get', 'let',
        'put', 'say', 'she', 'too', 'use', 'this', 'that', 'with', 'have', 'from',
        'they', 'been', 'call', 'come', 'each', 'find', 'first', 'just', 'know',
        'like', 'long', 'make', 'many', 'more', 'most', 'name', 'number', 'only',
        'other', 'part', 'people', 'than', 'them', 'then', 'time', 'very', 'when',
        'which', 'word', 'would', 'write', 'about', 'after', 'also', 'back', 'been',
        'being', 'could', 'down', 'even', 'give', 'good', 'here', 'into', 'look',
        'made', 'much', 'must', 'over', 'said', 'same', 'should', 'some', 'still',
        'such', 'take', 'these', 'thing', 'think', 'those', 'through', 'under',
        'well', 'what', 'where', 'while', 'will', 'work', 'year', 'your', 'there',
        'their', 'were', 'will', 'would', 'could', 'should', 'before', 'because',
        'into', 'just', 'more', 'over', 'some', 'then', 'time', 'very', 'when',
        'your', 'from', 'have', 'make', 'said', 'that', 'they', 'this', 'want'
    ]);

    paragraphs.forEach(p => {
        // Handle nested structure from generated article
        const sentences = p.paragraph?.tokenizedSentences || (Array.isArray(p) ? p : []);

        sentences.forEach(s => {
            if (s.tokens && Array.isArray(s.tokens)) {
                s.tokens.forEach(t => {
                    // 1. Get Text
                    const text = t.text || t.value || t.word || '';
                    if (!text) return;

                    // 2. Raw Count Rule (Same as Frontend Audit): English Check
                    // Must contain English letters and NO Chinese
                    if (/[a-zA-Z]/.test(text) && !/[\u4e00-\u9fa5]/.test(text)) {
                        rawCount++;

                        // 3. Vocabulary Extraction Rule:
                        // - 3+ chars (relaxed from 4 to include key words like 'war', 'act')
                        // - Not in stop words
                        // - Clean punctuation (e.g., "tour," -> "tour")
                        const cleanWord = text.replace(/[^a-zA-Z-]/g, '').toLowerCase();
                        if (cleanWord.length >= 3 && !commonWords.has(cleanWord)) {
                            uniqueWords.add(cleanWord);
                        }
                    }
                });
            }
        });
    });

    return {
        rawCount,
        vocabularyList: Array.from(uniqueWords).sort()
    };
}

/**
 * POST /api/dictionary/scan
 * Scan article for words and check against dictionary
 */
app.post('/api/dictionary/scan', async (req, res) => {
    try {
        const { articleJson } = req.body;

        if (!articleJson) {
            return res.status(400).json({ error: "Missing articleJson" });
        }

        // Extract words from article
        const { rawCount, vocabularyList } = extractWordsFromArticle(articleJson);

        // Load existing dictionary
        const dictionary = loadDictionary();
        const dictWords = new Set(Object.keys(dictionary).map(w => w.toLowerCase()));

        // Find missing words
        const existingWords = [];
        const missingWords = [];

        vocabularyList.forEach(word => {
            if (dictWords.has(word)) {
                existingWords.push({ word, inDict: true, entry: dictionary[word] });
            } else {
                missingWords.push({ word, inDict: false });
            }
        });

        res.json({
            totalArticleWords: rawCount, // Now using the standard raw count
            scannableWords: vocabularyList.length,
            existingCount: existingWords.length,
            missingCount: missingWords.length,
            existingWords,
            missingWords,
            coveragePercent: vocabularyList.length > 0
                ? Math.round((existingWords.length / vocabularyList.length) * 100)
                : 100
        });

    } catch (e) {
        console.error("Server Error:", e);
        res.status(500).json({ error: e.message });
    }
});

/**
 * POST /api/dictionary/generate
 * Generate definitions for missing words using Gemini
 */
app.post('/api/dictionary/generate', async (req, res) => {
    try {
        const { words } = req.body;

        if (!words || !Array.isArray(words) || words.length === 0) {
            return res.status(400).json({ error: "Missing words array" });
        }

        // Get API Key
        const envPath = path.join(PROJECT_ROOT, '.env');
        const content = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : '';
        const match = content.match(/GEMINI_API_KEY=(.+)/);
        const apiKey = match ? match[1].trim() : null;

        if (!apiKey) return res.status(400).json({ error: "Missing GEMINI_API_KEY" });

        const prompt = `
        Generate dictionary entries for the following English words.
        For each word, provide:
        - word: the word itself (lowercase)
        - phonetic: IPA pronunciation
        - definitions: array of { pos: "n."|"v."|"adj."|"adv.", zh: "中文释义", en: "English definition" }
        
        Words: ${words.join(', ')}
        
        Return JSON format:
        {
            "entries": {
                "word1": { "word": "word1", "phonetic": "...", "definitions": [...] },
                "word2": { ... }
            }
        }
        
        IMPORTANT: Return ONLY valid JSON.
        `;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ role: "user", parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.3, responseMimeType: "application/json" }
            }),
            dispatcher: proxyDispatcher
        });

        const data = await response.json();

        if (data.error) {
            return res.status(500).json({ error: data.error.message });
        }

        const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!generatedText) {
            return res.status(500).json({ error: "No content generated" });
        }

        try {
            const result = JSON.parse(generatedText.replace(/```json/g, '').replace(/```/g, ''));
            res.json(result);
        } catch (e) {
            res.json({ error: "Invalid JSON format", raw: generatedText });
        }

    } catch (e) {
        console.error("Server Error:", e);
        res.status(500).json({ error: e.message });
    }
});

/**
 * POST /api/dictionary/add
 * Add new words to the dictionary
 */
app.post('/api/dictionary/add', (req, res) => {
    try {
        const { entries } = req.body;

        if (!entries || typeof entries !== 'object') {
            return res.status(400).json({ error: "Missing entries object" });
        }

        const dictionary = loadDictionary();
        let addedCount = 0;

        Object.entries(entries).forEach(([word, entry]) => {
            const key = word.toLowerCase();
            if (!dictionary[key]) {
                dictionary[key] = entry;
                addedCount++;
            }
        });

        saveDictionary(dictionary);

        res.json({
            success: true,
            addedCount,
            totalWords: Object.keys(dictionary).length
        });

    } catch (e) {
        console.error("Server Error:", e);
        res.status(500).json({ error: e.message });
    }
});

/**
 * GET /api/dictionary/stats
 * Get dictionary statistics
 */
app.get('/api/dictionary/stats', (req, res) => {
    try {
        const dictionary = loadDictionary();
        res.json({
            totalWords: Object.keys(dictionary).length,
            lastUpdated: fs.existsSync(DICTIONARY_PATH)
                ? fs.statSync(DICTIONARY_PATH).mtime.toISOString()
                : null
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

/**
 * POST /api/podcast-script
 * Generate podcast script from article and glossary
 */
app.post('/api/podcast-script', async (req, res) => {
    try {
        const { articleJson, glossary } = req.body;

        // 1. Get API Key
        const envPath = path.join(PROJECT_ROOT, '.env');
        const content = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : '';
        const match = content.match(/GEMINI_API_KEY=(.+)/);
        const apiKey = match ? match[1].trim() : null;

        if (!apiKey) return res.status(400).json({ error: "Missing GEMINI_API_KEY" });

        // 2. Read SKILL.md for podcast-script-expert
        const skillPath = path.join(SKILLS_DIR, 'podcast-script-expert', 'SKILL.md');
        let systemPrompt = "";
        if (fs.existsSync(skillPath)) {
            systemPrompt = fs.readFileSync(skillPath, 'utf-8');
        } else {
            // Fallback prompt if skill not exists
            systemPrompt = `
            You are a podcast script writer for English learners.
            Given an article JSON and glossary, generate a bilingual (Chinese + English) podcast script.
            
            The script should:
            1. Start with an English greeting and Chinese introduction
            2. For each paragraph:
               - Provide Chinese context
               - Read the English original sentence
               - Explain grammar points in Chinese
               - Highlight vocabulary with definitions
            3. End with a thank you and goodbye
            
            Output pure text only, no markdown formatting.
            Use newlines for pacing (each newline = 600ms pause in TTS).
            `;
        }

        // 3. Construct User Prompt
        const userPrompt = `
        Generate a podcast script based on the following article.
        
        Article JSON:
        ${JSON.stringify(articleJson, null, 2)}
        
        Glossary:
        ${JSON.stringify(glossary || {}, null, 2)}
        
        Requirements:
        1. Output pure text only (no markdown, no speaker labels)
        2. Use Chinese for explanations, English for original quotes
        3. Include grammar analysis and vocabulary explanation
        4. Use newlines to control pacing
        5. Aim for 3-5 minutes of content
        
        Return the script as plain text.
        `;

        // 4. Call Gemini
        console.log('Generating podcast script...');
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-preview:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [
                    { role: "user", parts: [{ text: systemPrompt + "\n\n" + userPrompt }] }
                ],
                generationConfig: {
                    temperature: 0.7,
                }
            }),
            dispatcher: proxyDispatcher
        });

        const data = await response.json();

        if (data.error) {
            console.error("Gemini Error:", data.error);
            return res.status(500).json({ error: data.error.message });
        }

        const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!generatedText) {
            return res.status(500).json({ error: "No content generated" });
        }

        // Return the script
        res.json({ script: generatedText });

    } catch (e) {
        console.error("Server Error:", e);
        res.status(500).json({ error: e.message });
    }
});

// ... (previous code)

/**
 * GET /api/news/scan
 * Fetch latest news from RSS feeds
 */
app.get('/api/news/scan', async (req, res) => {
    try {
        console.log('Scanning news from RSS...');
        const feeds = [
            {
                name: 'Hacker News',
                category: '科技',
                url: 'https://news.ycombinator.com/rss',
                maxItems: 6
            },
            {
                name: 'NYTimes Politics',
                category: '政治',
                url: 'https://rss.nytimes.com/services/xml/rss/nyt/Politics.xml',
                maxItems: 4
            },
            {
                name: 'BBC Politics',
                category: '政治',
                url: 'https://feeds.bbci.co.uk/news/politics/rss.xml',
                maxItems: 4
            },
            {
                name: 'NYTimes Business',
                category: '财经',
                url: 'https://rss.nytimes.com/services/xml/rss/nyt/Business.xml',
                maxItems: 4
            },
            {
                name: 'WSJ Markets',
                category: '财经',
                url: 'https://feeds.a.dj.com/rss/RSSMarketsMain.xml',
                maxItems: 4
            }
        ];

        const itemRegex = /<item>([\s\S]*?)<\/item>/g;
        const titleRegex = /<title>([\s\S]*?)<\/title>/;
        const linkRegex = /<link>([\s\S]*?)<\/link>/;
        // Hacker News uses <comments> for the discussion link, actual article is often in <link>
        const commentsRegex = /<comments>([\s\S]*?)<\/comments>/;

        const fetchResults = await Promise.allSettled(
            feeds.map(async (feed) => {
                const response = await fetch(feed.url, { dispatcher: proxyDispatcher });
                if (!response.ok) {
                    throw new Error(`Failed to fetch RSS (${feed.name}): ${response.status}`);
                }
                const text = await response.text();
                const items = [];
                let match;
                while ((match = itemRegex.exec(text)) !== null) {
                    if (items.length >= feed.maxItems) break;
                    const itemContent = match[1];
                    const titleMatch = itemContent.match(titleRegex);
                    const linkMatch = itemContent.match(linkRegex);

                    if (titleMatch) {
                        let title = titleMatch[1].trim();
                        title = title.replace(/^<!\[CDATA\[|\]\]>$/g, '');

                        let link = '';
                        if (linkMatch) {
                            link = linkMatch[1].trim();
                            link = link.replace(/^<!\[CDATA\[|\]\]>$/g, '');
                        }

                        items.push({
                            category: feed.category,
                            source: feed.name,
                            title: title,
                            link: link,
                            raw: `【${feed.category} | ${feed.name}】${title}`
                        });
                    }
                }
                return items;
            })
        );

        const newsItems = fetchResults.flatMap((result) => {
            if (result.status === 'fulfilled') return result.value;
            console.warn('RSS fetch failed:', result.reason?.message || result.reason);
            return [];
        });

        if (!newsItems.length) {
            throw new Error('No RSS items fetched');
        }

        const trimmedItems = newsItems.slice(0, 22);
        console.log(`Found ${trimmedItems.length} news items`);

        // 返回结构化数据，同时保留 topics 字段以兼容旧版前端
        res.json({
            items: trimmedItems,
            topics: trimmedItems.map(item => item.raw)
        });
    } catch (e) {
        console.error("News Scan Error:", e);
        // Fallback to static items if network fails
        const fallbackItems = [
            { category: '科技', source: 'Tech News', title: 'SpaceX Starship Latest Updates', link: '', raw: '【科技 | Tech News】SpaceX Starship Latest Updates' },
            { category: '科技', source: 'AI News', title: 'New AI Models Released This Week', link: '', raw: '【科技 | AI News】New AI Models Released This Week' },
            { category: '财经', source: 'Finance', title: 'Global Economic Trends 2026', link: '', raw: '【财经 | Finance】Global Economic Trends 2026' },
            { category: '科技', source: 'Tech News', title: 'Quantum Computing Breakthroughs', link: '', raw: '【科技 | Tech News】Quantum Computing Breakthroughs' },
            { category: '科技', source: 'Auto News', title: 'Electric Vehicle Market Analysis', link: '', raw: '【科技 | Auto News】Electric Vehicle Market Analysis' }
        ];
        res.json({
            items: fallbackItems,
            topics: fallbackItems.map(item => item.raw),
            error: e.message
        });
    }
});

/**
 * POST /api/synthesize
 * Synthesize audio from podcast script using Volcengine TTS
 */
app.post('/api/synthesize', async (req, res) => {
    try {
        const { script } = req.body;

        if (!script) {
            return res.status(400).json({ error: "Missing script content" });
        }

        // 1. Save script to temporary file
        const timestamp = Date.now();
        const tempDir = path.join(PROJECT_ROOT, 'temp');
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

        const inputFile = path.join(tempDir, `script_${timestamp}.txt`);
        const outputFile = path.join(tempDir, `audio_${timestamp}.mp3`);

        fs.writeFileSync(inputFile, script, 'utf-8');
        console.log(`Saved script to: ${inputFile}`);

        // 2. Call the Python TTS script
        const ttsScript = path.join(SKILLS_DIR, 'podcast-script-expert', 'scripts', 'generate_podcast.py');

        if (!fs.existsSync(ttsScript)) {
            console.log('TTS script not found');
            return res.status(500).json({
                error: 'TTS script not found. Please install the TTS dependencies and ensure the script exists.'
            });
        }

        console.log(`Running TTS: python ${ttsScript} ${inputFile} ${outputFile}`);

        const pythonProcess = spawn('python', [ttsScript, inputFile, outputFile], {
            cwd: PROJECT_ROOT
        });

        let stdout = '';
        let stderr = '';

        pythonProcess.stdout.on('data', (data) => {
            stdout += data.toString();
            console.log(`[TTS stdout] ${data}`);
        });

        pythonProcess.stderr.on('data', (data) => {
            stderr += data.toString();
            console.error(`[TTS stderr] ${data}`);
        });

        pythonProcess.on('close', (code) => {
            console.log(`TTS process exited with code ${code}`);

            if (code === 0 && fs.existsSync(outputFile)) {
                // Success - return the file path or serve it
                // For now, we'll serve it as a static file
                const audioUrl = `/temp/audio_${timestamp}.mp3`;
                res.json({
                    success: true,
                    audioUrl,
                    localPath: outputFile
                });
            } else {
                console.error('TTS failed:', stderr || stdout);
                res.status(500).json({
                    error: stderr || stdout || 'TTS synthesis failed'
                });
            }
        });

    } catch (e) {
        console.error("Server Error:", e);
        res.status(500).json({ error: e.message });
    }
});

// Serve temp files as static
app.use('/temp', express.static(path.join(PROJECT_ROOT, 'temp')));

/**
 * POST /api/schema
 * Get collection schema from PocketBase
 */
app.post('/api/schema', async (req, res) => {
    try {
        const { collection = 'articles' } = req.body;

        // Try to fetch from PocketBase if configured
        const envPath = path.join(PROJECT_ROOT, '.env');
        const content = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : '';
        const pbUrlMatch = content.match(/POCKETBASE_URL=(.+)/);
        const pbUrl = pbUrlMatch ? pbUrlMatch[1].trim() : null;

        if (!pbUrl) {
            return res.status(400).json({ error: 'POCKETBASE_URL is not configured.' });
        }

        // Attempt to get schema from PocketBase admin API
        const response = await fetch(`${pbUrl}/api/collections/${collection}`, {
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
            return res.status(502).json({ error: 'Failed to fetch schema from PocketBase.' });
        }

        const data = await response.json();
        const schema = data.schema?.map(field => ({
            name: field.name,
            type: field.type,
            required: field.required || false,
            description: field.options?.maxSize ? `Max: ${field.options.maxSize}` : ''
        })) || [];

        return res.json({ schema, source: 'pocketbase' });

    } catch (e) {
        console.error("Server Error:", e);
        res.status(500).json({ error: e.message });
    }
});

/**
 * GET /api/skills
 * List all available skills and their prompts (SKILL.md content)
 */
app.get('/api/skills', (req, res) => {
    try {
        if (!fs.existsSync(SKILLS_DIR)) {
            return res.json([]);
        }

        const skills = fs.readdirSync(SKILLS_DIR, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => {
                const name = dirent.name;
                const skillPath = path.join(SKILLS_DIR, name, 'SKILL.md');
                let content = '';
                if (fs.existsSync(skillPath)) {
                    content = fs.readFileSync(skillPath, 'utf-8');
                }
                return { name, content };
            });

        res.json(skills);
    } catch (err) {
        console.error("Error reading skills:", err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /api/skills/:name
 * Update a skill's SKILL.md content (Prompt Editing)
 */
app.post('/api/skills/:name', (req, res) => {
    try {
        const { name } = req.params;
        const { content } = req.body;

        if (!content) return res.status(400).json({ error: 'Content is required' });

        const skillPath = path.join(SKILLS_DIR, name, 'SKILL.md');

        // Ensure directory exists (though it should)
        const dir = path.dirname(skillPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        fs.writeFileSync(skillPath, content, 'utf-8');
        console.log(`Updated skill: ${name}`);

        res.json({ success: true });
    } catch (err) {
        console.error("Error updating skill:", err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /api/run
 * Execute a workflow script
 */
app.post('/api/run', (req, res) => {
    const { script, args = [] } = req.body;

    // Security check: Only allow scripts from the .agent/scripts folder
    // For now, we allow running raw node commands if script is 'node'
    // But better to map specific abstract actions to scripts

    console.log(`Request to run: ${script} with args: ${args.join(' ')}`);

    // Only allow specific known safe scripts or logic
    // For MVP, we will assume the frontend sends the relative path to the script inside .agent
    // e.g. script = "scripts/gen_sovereign_10.js"

    // Validate path traversal
    if (script.includes('..')) {
        return res.status(403).json({ error: "Invalid script path" });
    }

    const scriptPath = path.join(AGENT_DIR, script);

    // If it's a JS file, run with node
    const cmd = 'node';
    const cmdArgs = [scriptPath, ...args];

    console.log(`Spawning: ${cmd} ${cmdArgs.join(' ')}`);

    const child = spawn(cmd, cmdArgs, { cwd: PROJECT_ROOT });

    let output = '';

    child.stdout.on('data', (data) => {
        output += data.toString();
        // Here we could emit WebSocket events for real-time streaming
        console.log(`[stdout] ${data}`);
    });

    child.stderr.on('data', (data) => {
        output += `[stderr] ${data.toString()}`;
        console.error(`[stderr] ${data}`);
    });

    child.on('close', (code) => {
        console.log(`Child process exited with code ${code}`);
        res.json({ success: code === 0, output, code });
    });
});

/**
 * POST /api/publish
 * Publish article data to PocketBase or local storage
 */
app.post('/api/publish', async (req, res) => {
    try {
        const payload = req.body;

        if (!payload) {
            return res.status(400).json({ error: "Missing payload" });
        }

        const normalizeJsonField = (value) => {
            if (typeof value === 'string') {
                try {
                    return JSON.parse(value);
                } catch {
                    return value;
                }
            }
            return value;
        };

        // Get PocketBase URL from env
        const envPath = path.join(PROJECT_ROOT, '.env');
        const content = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : '';
        const pbUrlMatch = content.match(/POCKETBASE_URL=(.+)/);
        const pbUrl = pbUrlMatch ? pbUrlMatch[1].trim() : null;

        const timestamp = Date.now();
        const articleId = `article_${timestamp}`;

        // If PocketBase is configured, try to publish there
        if (pbUrl) {
            try {
                console.log(`Publishing to PocketBase: ${pbUrl}`);

                // Create article record
                // Map frontend article JSON to PocketBase schema
                // Handle both flat structure (legacy) and nested structure (article-generator skill)
                const isDirectPayload = !payload.article && (payload.title_zh || payload.title_en || payload.content || payload.intro);
                const articleRoot = payload.article || {};
                const articleData = articleRoot.article || articleRoot;

                const pbPayload = isDirectPayload
                    ? {
                        title_zh: payload.title_zh || '无标题',
                        title_en: payload.title_en || 'Untitled',
                        date: payload.date || new Date().toISOString(),
                        level: payload.level || '10',
                        topic: payload.topic || '科技',
                        intro: normalizeJsonField(payload.intro) || null,
                        content: normalizeJsonField(payload.content) || {},
                        glossary: normalizeJsonField(payload.glossary) || {},
                        podcast_script: payload.podcast_script || '',
                        podcast_url: payload.podcast_url || '',
                    }
                    : {
                        // Required fields
                        title_zh: articleData.title?.zh || articleData.title?.cn || '无标题',
                        title_en: articleData.title?.en || 'Untitled',
                        date: articleData.meta?.date || new Date().toISOString(),
                        level: articleData.meta?.level || "10",
                        topic: articleData.meta?.topic || "科技",

                        // Content fields
                        intro: articleData.intro || (articleData.briefing ? { text: articleData.briefing } : null),
                        content: {
                            meta: articleData.meta,
                            paragraphs: articleData.paragraphs
                        },

                        // Other fields from payload
                        glossary: payload.glossary || articleRoot.glossary,
                        podcast_script: payload.podcast_script,
                        podcast_url: payload.podcast_url || articleData.podcastUrl,
                    };

                // Try to map topic more accurately if possible
                if (articleData.topic && ["国际", "财经", "科技"].includes(articleData.topic)) {
                    pbPayload.topic = articleData.topic;
                }

                // Get auth token
                const { token } = await getPocketBaseAuth();
                const headers = { 'Content-Type': 'application/json' };
                if (token) headers['Authorization'] = token;

                const updatePayload = {};
                if (payload.podcast_script !== undefined) updatePayload.podcast_script = payload.podcast_script;
                if (payload.podcast_url !== undefined) updatePayload.podcast_url = payload.podcast_url;
                if (payload.glossary !== undefined) {
                    updatePayload.glossary = normalizeJsonField(payload.glossary) || {};
                }

                if (payload.articleId && Object.keys(updatePayload).length > 0) {
                    const updateRes = await fetch(`${pbUrl}/api/collections/articles/records/${payload.articleId}`, {
                        method: 'PATCH',
                        headers: headers,
                        body: JSON.stringify(updatePayload)
                    });

                    if (updateRes.ok) {
                        return res.json({
                            success: true,
                            articleId: payload.articleId,
                            glossaryCount: Object.keys(payload.glossary || {}).length,
                            url: `${pbUrl}/articles/${payload.articleId}`,
                            source: 'pocketbase'
                        });
                    } else {
                        const updateError = await updateRes.text();
                        console.error('PocketBase update error:', updateError);
                        // Fall through to create if update failed
                    }
                }

                const articleRes = await fetch(`${pbUrl}/api/collections/articles/records`, {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify(pbPayload)
                });

                if (articleRes.ok) {
                    const data = await articleRes.json();
                    return res.json({
                        success: true,
                        articleId: data.id,
                        glossaryCount: Object.keys(payload.glossary || {}).length,
                        url: `${pbUrl}/articles/${data.id}`,
                        source: 'pocketbase'
                    });
                } else {
                    const error = await articleRes.text();
                    console.error('PocketBase error:', error);
                    // Fall through to local save
                }
            } catch (e) {
                console.error('PocketBase publish failed:', e);
                // Fall through to local save
            }
        }

        // Fallback: Save locally
        const outputDir = path.join(PROJECT_ROOT, 'output', 'articles');
        if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

        const outputPath = path.join(outputDir, `${articleId}.json`);
        fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2), 'utf-8');

        console.log(`Article saved locally: ${outputPath}`);

        res.json({
            success: true,
            articleId,
            glossaryCount: Object.keys(payload.glossary || {}).length,
            localPath: outputPath,
            source: 'local'
        });

    } catch (e) {
        console.error("Server Error:", e);
        res.status(500).json({ error: e.message });
    }
});

// ================= DATABASE BROWSER APIs =================

/**
 * GET /api/database/articles
 * List all published articles from PocketBase or local storage
 */
app.get('/api/database/articles', async (req, res) => {
    try {
        // Try PocketBase first with auth
        const { url: pbUrl, token } = await getPocketBaseAuth();

        if (pbUrl) {
            try {
                const headers = { 'Content-Type': 'application/json' };
                if (token) headers['Authorization'] = token;

                console.log(`Fetching articles from ${pbUrl}/api/collections/articles/records`);
                const response = await fetch(`${pbUrl}/api/collections/articles/records?perPage=100`, { headers });

                if (response.ok) {
                    const data = await response.json();
                    console.log(`Found ${data.items?.length || 0} articles`);
                    return res.json({ articles: data.items || [], source: 'pocketbase', authenticated: !!token });
                } else {
                    const errorText = await response.text();
                    console.log('PocketBase articles fetch failed:', response.status, errorText);
                    // If collection doesn't exist, fall through to local
                }
            } catch (fetchError) {
                console.log('PocketBase fetch error:', fetchError.message);
            }
        }

        // Fallback: Read from local storage
        console.log('Falling back to local storage');
        const outputDir = path.join(PROJECT_ROOT, 'output', 'articles');
        if (!fs.existsSync(outputDir)) {
            return res.json({ articles: [], source: 'local', message: 'No local articles yet' });
        }

        const files = fs.readdirSync(outputDir).filter(f => f.endsWith('.json'));
        const articles = files.map(file => {
            try {
                const content = fs.readFileSync(path.join(outputDir, file), 'utf-8');
                const data = JSON.parse(content);
                return { id: file.replace('.json', ''), ...data };
            } catch (parseError) {
                return { id: file.replace('.json', ''), error: 'Parse error' };
            }
        });

        res.json({ articles, source: 'local' });
    } catch (e) {
        console.error('Database articles error:', e);
        res.status(500).json({ error: e.message, stack: e.stack });
    }
});

/**
 * GET /api/database/test
 * Test PocketBase connection
 */
app.get('/api/database/test', async (req, res) => {
    try {
        const { url: pbUrl, token } = await getPocketBaseAuth();

        if (!pbUrl) {
            return res.json({ connected: false, message: 'No POCKETBASE_URL configured' });
        }

        // Test health endpoint
        const healthRes = await fetch(`${pbUrl}/api/health`);
        const healthData = await healthRes.json();

        // Try to list collections
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = token;

        let collections = [];
        try {
            const collectionsRes = await fetch(`${pbUrl}/api/collections`, { headers });
            if (collectionsRes.ok) {
                collections = await collectionsRes.json();
            }
        } catch (e) {
            console.log('Could not list collections:', e.message);
        }

        res.json({
            connected: healthRes.ok,
            url: pbUrl,
            authenticated: !!token,
            health: healthData,
            collectionsCount: collections.length || 0,
            collections: (collections || []).map(c => c.name)
        });
    } catch (e) {
        res.json({ connected: false, error: e.message });
    }
});

/**
 * DELETE /api/database/articles/:id
 * Delete an article
 */
app.delete('/api/database/articles/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Try local delete first
        const filePath = path.join(PROJECT_ROOT, 'output', 'articles', `${id}.json`);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            return res.json({ success: true, source: 'local' });
        }

        // Try PocketBase
        const envPath = path.join(PROJECT_ROOT, '.env');
        const content = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : '';
        const pbUrlMatch = content.match(/POCKETBASE_URL=(.+)/);
        const pbUrl = pbUrlMatch ? pbUrlMatch[1].trim() : null;

        if (pbUrl) {
            const response = await fetch(`${pbUrl}/api/collections/articles/records/${id}`, {
                method: 'DELETE'
            });
            if (response.ok) {
                return res.json({ success: true, source: 'pocketbase' });
            }
        }

        res.status(404).json({ error: 'Article not found' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

/**
 * GET /api/database/dictionary
 * Get the entire dictionary
 */
app.get('/api/database/dictionary', (req, res) => {
    try {
        const dictionary = loadDictionary();
        res.json({ dictionary, count: Object.keys(dictionary).length });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ================= GENERIC DATABASE API =================

/**
 * GET /api/database/collections
 * List all available collections
 */
app.get('/api/database/collections', async (req, res) => {
    try {
        const { url: pbUrl, token } = await getPocketBaseAuth();

        if (!pbUrl) {
            // If no PocketBase, return metadata about local storage
            return res.json({
                source: 'local',
                collections: [{ name: 'articles', type: 'base' }, { name: 'dictionary', type: 'local' }]
            });
        }

        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = token;

        const response = await fetch(`${pbUrl}/api/collections`, { headers });
        console.log(`[DB Debug] Collections fetch status: ${response.status}`);
        if (response.ok) {
            const data = await response.json();
            // Handle both array and {items: [...]} response formats
            const collections = Array.isArray(data) ? data : (data.items || []);
            // Don't add local dictionary - PocketBase already has it
            const result = collections.map(c => ({ name: c.name, type: c.type }));
            return res.json({ source: 'pocketbase', collections: result });
        } else {
            // If fetching collections failed (e.g. 403), return default list
            return res.json({
                source: 'pocketbase_restricted',
                collections: [{ name: 'articles', type: 'base' }, { name: 'users', type: 'auth' }, { name: 'dictionary', type: 'base' }]
            });
        }
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

/**
 * GET /api/database/collections/:name/records
 * Get records for a specific collection
 */
app.get('/api/database/collections/:name/records', async (req, res) => {
    try {
        const { name } = req.params;
        console.log(`[DB Debug] Request for collection: ${name}`);

        // All collections (including dictionary) go through PocketBase
        const { url: pbUrl, token } = await getPocketBaseAuth();
        if (!pbUrl && name === 'articles') {
            const outputDir = path.join(PROJECT_ROOT, 'output', 'articles');
            if (!fs.existsSync(outputDir)) return res.json({ items: [], source: 'local' });

            const files = fs.readdirSync(outputDir).filter(f => f.endsWith('.json'));
            const items = files.map(file => {
                try {
                    return { id: file.replace('.json', ''), ...JSON.parse(fs.readFileSync(path.join(outputDir, file), 'utf-8')) };
                } catch (e) { return null; }
            }).filter(Boolean);

            return res.json({ items, totalItems: items.length, source: 'local' });
        }

        if (pbUrl) {
            console.log(`[DB Debug] Fetching from PB: ${pbUrl}/api/collections/${name}/records`);
            const headers = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = token;

            const response = await fetch(`${pbUrl}/api/collections/${name}/records?perPage=200`, { headers });
            console.log(`[DB Debug] PB Response Status: ${response.status}`);

            if (response.ok) {
                const data = await response.json();
                return res.json({ items: data.items, totalItems: data.totalItems, source: 'pocketbase' });
            } else {
                const errorText = await response.text();
                console.error(`[DB Debug] PB Error: ${errorText}`);

                try {
                    // Try to parse PB error and return it directly if possible, or wrap it
                    const errorJson = JSON.parse(errorText);
                    return res.status(response.status).json(errorJson);
                } catch (e) {
                    return res.status(response.status).json({ error: errorText });
                }
            }
        }

        return res.json({ items: [], source: 'unknown' });

    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

/**
 * Workflow sessions (use PocketBase admin auth).
 */
app.get('/api/workflow-sessions', async (req, res) => {
    try {
        const { url: pbUrl, token } = await getPocketBaseAuth();
        const clientToken = req.get('Authorization');
        const authToken = clientToken || token;

        console.log(`[Workflow-Session Debug] Client Token Present: ${!!clientToken}`);
        console.log(`[Workflow-Session Debug] Using Token Type: ${clientToken ? 'Client' : 'Server (Superuser)'}`);

        if (!pbUrl) {
            return res.status(500).json({ error: 'PocketBase URL not configured' });
        }
        if (!authToken) {
            return res.status(401).json({ error: 'PocketBase authentication failed' });
        }

        const endpoint = new URL(`${pbUrl}/api/collections/workflow_sessions/records`);
        endpoint.searchParams.set('perPage', '200');
        if (req.query.sort) {
            endpoint.searchParams.set('sort', req.query.sort);
        }

        console.log(`[Workflow-Session Debug] Fetching from: ${endpoint.toString()}`);

        const headers = { 'Content-Type': 'application/json', Authorization: authToken };
        let response = await fetch(endpoint.toString(), { method: 'GET', headers });

        console.log(`[Workflow-Session Debug] PB Response Status: ${response.status}`);

        // Retry with superuser token if client token failed
        if (!response.ok && (response.status === 401 || response.status === 403) && clientToken && token && clientToken !== token) {
            console.log('[Workflow-Session Debug] Client token failed (401/403). Retrying with Superuser token...');
            headers.Authorization = token;
            response = await fetch(endpoint.toString(), { method: 'GET', headers });
            console.log(`[Workflow-Session Debug] Retry Response Status: ${response.status}`);
        }

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[Workflow-Session Debug] PB Error: ${errorText}`);

            // Retry without sort/filter params if 400 (likely invalid sort field)
            if (response.status === 400) {
                console.log('[Workflow-Session Debug] 400 Bad Request. Retrying without query parameters...');
                try {
                    // Try with just perPage, no sort
                    const retryEndpoint = new URL(`${pbUrl}/api/collections/workflow_sessions/records?perPage=200`);
                    const retryRes = await fetch(retryEndpoint.toString(), { headers: { Authorization: authToken } });

                    if (retryRes.ok) {
                        const retryData = await retryRes.json();
                        console.log(`[Workflow-Session Debug] Retry success! Found ${retryData.items?.length} items.`);
                        return res.json({ items: retryData.items || [] });
                    } else {
                        console.log(`[Workflow-Session Debug] Retry failed: ${retryRes.status} ${await retryRes.text()}`);
                    }
                } catch (e) {
                    console.error('[Workflow-Session Debug] Retry exception:', e);
                }
            }

            // [Debug logic for listing collections - keeping this for now]
            try {
                const collectionsRes = await fetch(`${pbUrl}/api/collections`, { headers: { Authorization: token } });
                if (collectionsRes.ok) {
                    const collections = await collectionsRes.json();
                    const availableNames = (Array.isArray(collections) ? collections : collections.items).map(c => c.name);
                    console.log(`[Workflow-Session Debug] Available Collections: ${availableNames.join(', ')}`);
                }
            } catch (err) {
                console.error('[Workflow-Session Debug] Failed to list collections:', err.message);
            }

            return res.status(response.status).json({ error: errorText });
        }
        const data = await response.json();
        console.log(`[Workflow-Session Debug] Found ${data.items ? data.items.length : 0} sessions`);
        return res.json({ items: data.items || [] });
    } catch (e) {
        console.error(`[Workflow-Session Debug] Exception: ${e.message}`);
        return res.status(500).json({ error: e.message });
    }
});

app.post('/api/workflow-sessions', async (req, res) => {
    try {
        const { url: pbUrl, token } = await getPocketBaseAuth();
        const clientToken = req.get('Authorization');
        const authToken = clientToken || token;
        if (!pbUrl) {
            return res.status(500).json({ error: 'PocketBase URL not configured' });
        }
        if (!authToken) {
            return res.status(401).json({ error: 'PocketBase authentication failed' });
        }

        const response = await fetch(`${pbUrl}/api/collections/workflow_sessions/records`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: authToken },
            body: JSON.stringify(req.body)
        });
        if (!response.ok) {
            return res.status(response.status).json({ error: await response.text() });
        }
        const data = await response.json();
        return res.json(data);
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
});

app.patch('/api/workflow-sessions/:id', async (req, res) => {
    try {
        const { url: pbUrl, token } = await getPocketBaseAuth();
        const clientToken = req.get('Authorization');
        const authToken = clientToken || token;
        if (!pbUrl) {
            return res.status(500).json({ error: 'PocketBase URL not configured' });
        }
        if (!authToken) {
            return res.status(401).json({ error: 'PocketBase authentication failed' });
        }

        const response = await fetch(`${pbUrl}/api/collections/workflow_sessions/records/${req.params.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Authorization: authToken },
            body: JSON.stringify(req.body)
        });
        if (!response.ok) {
            return res.status(response.status).json({ error: await response.text() });
        }
        const data = await response.json();
        return res.json(data);
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
});

app.delete('/api/workflow-sessions/:id', async (req, res) => {
    try {
        const { url: pbUrl, token } = await getPocketBaseAuth();
        const clientToken = req.get('Authorization');
        const authToken = clientToken || token;
        if (!pbUrl) {
            return res.status(500).json({ error: 'PocketBase URL not configured' });
        }
        if (!authToken) {
            return res.status(401).json({ error: 'PocketBase authentication failed' });
        }

        const response = await fetch(`${pbUrl}/api/collections/workflow_sessions/records/${req.params.id}`, {
            method: 'DELETE',
            headers: { Authorization: authToken }
        });
        if (!response.ok) {
            return res.status(response.status).json({ error: await response.text() });
        }
        return res.status(204).send();
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
});

// ================= START SERVER =================
app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
    console.log(`Project Root: ${PROJECT_ROOT}`);
});
