const { getSignedAudioUrl } = require('../lib/r2.cjs');
const fs = require('fs');
const path = require('path');

// Helper to get PocketBase auth (reused logic could be imported if modularized, 
// but for now we'll duplicate the simple config read or rely on shared scope if integrated in index.cjs.
// Ideally, this module should just export the router function and accept PB helpers/config.)
// 
// For simplicity in this "module", we will assume the caller (index.cjs) passes the necessary context or we read env again.
// We'll read env locally to be self-contained for basic config.

function setupAudioRoutes(app, getPocketBaseAuth) {
    /**
     * GET /api/audio-url
     * Securely get signed URL for an article's audio
     * Query: ?id=<articleId>
     */
    app.get('/api/audio-url', async (req, res) => {
        try {
            const { id } = req.query;

            if (!id) {
                return res.status(400).json({ error: 'Missing article id' });
            }

            // 1. Authenticate check (Optional: depends on app policy - is audio public? 
            //    Request says "Permission check", verifying articleId against DB is the check.)

            // 2. Lookup Article in PocketBase
            // We need PB URL
            const projectRoot = path.resolve(__dirname, '..', '..');
            const envPath = path.join(projectRoot, '.env');
            let pbUrl = null;
            if (fs.existsSync(envPath)) {
                const content = fs.readFileSync(envPath, 'utf-8');
                const match = content.match(/POCKETBASE_URL=(.+)/);
                pbUrl = match ? match[1].trim() : null;
            }

            if (!pbUrl) {
                return res.status(500).json({ error: 'PocketBase not configured' });
            }

            // Get Auth Token for PB Admin/User
            const { token } = await getPocketBaseAuth();
            const headers = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = token;

            // Fetch Article
            const articleRes = await fetch(`${pbUrl}/api/collections/articles/records/${id}`, {
                headers
            });

            if (!articleRes.ok) {
                if (articleRes.status === 404) {
                    return res.status(404).json({ error: 'Article not found' });
                }
                return res.status(403).json({ error: 'Access denied or invalid ID' });
            }

            const article = await articleRes.json();
            const audioKey = article.audioKey;

            if (!audioKey) {
                return res.status(404).json({ error: 'Audio not available for this article' });
            }

            // 3. Generate Signed URL
            const result = await getSignedAudioUrl(audioKey);

            if (!result) {
                return res.status(500).json({ error: 'Failed to generate audio URL' });
            }

            res.json(result);

        } catch (e) {
            console.error('[Audio API] Error:', e);
            res.status(500).json({ error: e.message });
        }
    });

    console.log('[Routes] Audio routes registered');
}

module.exports = { setupAudioRoutes };
