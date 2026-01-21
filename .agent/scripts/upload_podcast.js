
import PocketBase from 'pocketbase';
import fs from 'fs/promises'; // Use fs/promises for file reading
import { createReadStream } from 'fs';
// import { FormData } from 'formdata-node'; // Use native FormData (Node 18+)
// PB Client uses native fetch. In Node 18+ FormData is native.
// However, passing a fs.ReadStream to native FormData in Node might need 'file-from-path' or similar.
// PocketBase JS SDK in Node usually works with FormData + Blob/File.
// A simpler way for Node is to pass the file object if using the 'form-data' package, or just raw bytes + filename?

// Actually, PocketBase SDK documentation says:
// "For Node.js you can load the file using fs.createReadStream('./...')"
// provided we are submitting as FormData.

import 'dotenv/config';

// Configuration
const PB_URL = process.env.POCKETBASE_URL || 'http://127.0.0.1:8090';
const PB_EMAIL = process.env.POCKETBASE_EMAIL;
const PB_PASSWORD = process.env.POCKETBASE_PASSWORD;

async function main() {
    const args = process.argv.slice(2);
    if (args.length < 2) {
        console.error('Usage: node upload_podcast.js <article_title_or_slug_fragment> <path_to_audio.mp3>');
        process.exit(1);
    }

    const query = args[0]; // e.g. "2026-01-20" or "DeepSeek"
    const filePath = args[1];

    console.log(`[Upload Podcast] Query: "${query}", File: ${filePath}`);

    try {
        const pb = new PocketBase(PB_URL);
        if (PB_EMAIL && PB_PASSWORD) {
            await pb.admins.authWithPassword(PB_EMAIL, PB_PASSWORD);
        }

        // 1. Find the article
        // We start by searching for the article.
        // We'll try to match title_en or date.
        let articleRecord;
        try {
            // First try as exact date
            const list = await pb.collection('articles').getList(1, 1, {
                filter: `date = "${query}" || title_en ~ "${query}"`,
                sort: '-created'
            });
            if (list.items.length > 0) {
                articleRecord = list.items[0];
            }
        } catch (e) {
            console.error('Search failed', e);
        }

        if (!articleRecord) {
            throw new Error(`Article not found for query: ${query}`);
        }
        console.log(`[Upload Podcast] Found Article: ${articleRecord.title_en} (${articleRecord.id})`);

        // 2. Upload the file
        // To upload a file to an existing record, we update it.
        const formData = new FormData();

        // Use 'file-from-path' approach or just read buffer? 
        // PocketBase SDK helper logic:
        // For node, we can import { File } from 'undici' or similar if needed, 
        // BUT current PB SDK (v0.20+) often handles fs.createReadStream if we use 'form-data' package.
        // Let's assume standard Blob/File compatibility.

        // Simplest Node approach: Read full buffer.
        const fileBuffer = await fs.readFile(filePath);
        const fileName = filePath.split(/[\\/]/).pop();

        // Create a File-like object
        const file = new File([fileBuffer], fileName, { type: 'audio/mpeg' });

        formData.append('podcast_file', file);

        const result = await pb.collection('articles').update(articleRecord.id, formData);

        console.log(`[Upload Podcast] Success! Podcast attached to ${result.title_en}`);

    } catch (error) {
        console.error('[Upload Podcast] Failed:', error);
        process.exit(1);
    }
}

main();
