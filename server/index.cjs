
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
        const { topic, level = "10" } = req.body;

        // 1. Get API Key
        const envPath = path.join(PROJECT_ROOT, '.env');
        const content = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : '';
        const match = content.match(/GEMINI_API_KEY=(.+)/);
        const apiKey = match ? match[1].trim() : null;

        if (!apiKey) return res.status(400).json({ error: "Missing GEMINI_API_KEY" });

        // 2. Read System Prompt (SKILL.md)
        const skillPath = path.join(SKILLS_DIR, 'article-generator', 'SKILL.md');
        if (!fs.existsSync(skillPath)) {
            return res.status(404).json({ error: "article-generator skill not found" });
        }
        const systemPrompt = fs.readFileSync(skillPath, 'utf-8');

        // 3. Construct User Prompt (Simulating Research Input for MVP)
        // In a real flow, this would come from Step 1's output file
        const userPrompt = `
        Target Topic: ${topic}
        Target Level: ${level}
        
        [Simulated Research Data]
        Latest news indicates that "${topic}" is a trending issue. 
        Key entities involved: Global Tech Giants, Governments.
        Time: ${new Date().toISOString().split('T')[0]}.
        Context: Significant developments have occurred in this field recently.
        
        Task: transform this research into the JSON format defined in the System Prompt.
        IMPORTANT: Return ONLY valid JSON, no markdown code blocks.
        `;

        // 4. Call Gemini
        console.log(`Generating article for topic: ${topic}...`);
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-preview:generateContent?key=${apiKey}`, {
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
            const json = JSON.parse(generatedText.replace(/```json/g, '').replace(/```/g, ''));
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
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-preview:generateContent?key=${apiKey}`, {
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
    const words = new Set();
    const text = JSON.stringify(articleJson);

    // Extract all English words (3+ characters, excludes common words)
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
        'their', 'were', 'will', 'would', 'could', 'should', 'before', 'because'
    ]);

    const matches = text.match(/\b[a-zA-Z]{4,}\b/g) || [];
    matches.forEach(word => {
        const lower = word.toLowerCase();
        if (!commonWords.has(lower)) {
            words.add(lower);
        }
    });

    return Array.from(words).sort();
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
        const articleWords = extractWordsFromArticle(articleJson);

        // Load existing dictionary
        const dictionary = loadDictionary();
        const dictWords = new Set(Object.keys(dictionary).map(w => w.toLowerCase()));

        // Find missing words
        const existingWords = [];
        const missingWords = [];

        articleWords.forEach(word => {
            if (dictWords.has(word)) {
                existingWords.push({ word, inDict: true, entry: dictionary[word] });
            } else {
                missingWords.push({ word, inDict: false });
            }
        });

        res.json({
            totalArticleWords: articleWords.length,
            existingCount: existingWords.length,
            missingCount: missingWords.length,
            existingWords,
            missingWords,
            coveragePercent: articleWords.length > 0
                ? Math.round((existingWords.length / articleWords.length) * 100)
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

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-preview:generateContent?key=${apiKey}`, {
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
                const articleRes = await fetch(`${pbUrl}/api/collections/articles/records`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        ...payload.article,
                        glossary: payload.glossary,
                        podcast_script: payload.podcast_script,
                        podcast_url: payload.podcast_url,
                    })
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

// ================= START SERVER =================
app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
    console.log(`Project Root: ${PROJECT_ROOT}`);
});

