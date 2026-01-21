
import PocketBase from 'pocketbase';
import fs from 'fs/promises';
import path from 'path';
import 'dotenv/config'; // Load environment variables from .env file

// Configuration
const PB_URL = process.env.POCKETBASE_URL || 'http://127.0.0.1:8090'; // Default to local
const PB_EMAIL = process.env.POCKETBASE_EMAIL;
const PB_PASSWORD = process.env.POCKETBASE_PASSWORD;

async function main() {
    const args = process.argv.slice(2);
    if (args.length < 1) {
        console.error('Usage: node upload_article.js <path_to_article.json>');
        process.exit(1);
    }

    const filePath = args[0];
    console.log(`[Upload] Processing: ${filePath}`);

    try {
        // 1. Read JSON file
        const fileContent = await fs.readFile(filePath, 'utf-8');
        const data = JSON.parse(fileContent);

        // Destructure expected format: { article: Article, glossary: GlossaryMap }
        // Or handle direct Article object if that's what's passed
        const article = data.article || data;
        const glossary = data.glossary || article.glossary || {};

        if (!article || !article.meta) {
            throw new Error('Invalid JSON format: Missing article.meta');
        }

        const meta = article.meta;
        const slug = meta.slug || meta.id; // Fallback

        console.log(`[Upload] Target Article: ${meta.title} (${slug})`);

        // 2. Authenticate
        const pb = new PocketBase(PB_URL);
        if (PB_EMAIL && PB_PASSWORD) {
            await pb.admins.authWithPassword(PB_EMAIL, PB_PASSWORD);
        } else {
            console.warn('[Upload] No credentials provided. Assuming public/anonymous access (likely to fail for writes).');
        }

        // 3. Check for existing article by slug or specific ID field query
        // Assuming we store original ID in a field, e.g., 'original_id' or just verify by slug
        let recordId = null;
        try {
            // Try to find if an article with this slug already exists
            // filtering by some unique field. Let's assume 'slug' is unique or 'title_en' + 'date'
            const existing = await pb.collection('articles').getFirstListItem(`date="${meta.date}" && title_en="${meta.title}"`);
            recordId = existing.id;
            console.log(`[Upload] Found existing record: ${recordId}, updating...`);
        } catch (e) {
            if (e.status !== 404) throw e;
            console.log(`[Upload] New article, creating...`);
        }

        // 4. Prepare Record Data
        // Map frontend Article structure to PocketBase ArticleCollection structure
        const recordData = {
            date: meta.date,
            level: meta.level,
            topic: meta.topic,
            title_zh: article.title.zh,
            title_en: article.title.en,
            intro: article.intro,       // Store as JSON
            content: {                  // Store structured content as JSON
                meta: meta,
                paragraphs: article.paragraphs
            },
            glossary: glossary,         // Store glossary as JSON
            // podcast_url: article.podcastUrl // Optional, might be uploaded later via separate script
        };

        // 5. Create or Update
        let result;
        if (recordId) {
            result = await pb.collection('articles').update(recordId, recordData);
        } else {
            result = await pb.collection('articles').create(recordData);
        }

        console.log(`[Upload] Success! Record ID: ${result.id}`);

    } catch (error) {
        console.error('[Upload] Failed:', error);
        process.exit(1);
    }
}

main();
