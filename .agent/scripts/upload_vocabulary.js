
import PocketBase from 'pocketbase';
import fs from 'fs/promises';
import { stripPunctuation } from '../../src/services/dictionary'; // We might need to duplicate this logic if we can't import TS in JS directly easily without compile.
// Let's duplicate the simple normalization logic to avoid TS-node dependency complexity.

const normalizeWord = (word) => {
    return word.replace(/[.,!?;:"'()\[\]{}]|[“”‘’«»„‟‹›]|[—–]|…/g, '').trim().toLowerCase();
};

import 'dotenv/config';

// Configuration
const PB_URL = process.env.POCKETBASE_URL || 'http://127.0.0.1:8090';
const PB_EMAIL = process.env.POCKETBASE_EMAIL;
const PB_PASSWORD = process.env.POCKETBASE_PASSWORD;

async function main() {
    const args = process.argv.slice(2);
    if (args.length < 1) {
        console.error('Usage: node upload_vocabulary.js <path_to_vocabulary.json> [overwrite=false]');
        process.exit(1);
    }

    const filePath = args[0];
    const overwrite = args[1] === 'true';

    console.log(`[Upload Vocab] File: ${filePath}`);

    try {
        const fileContent = await fs.readFile(filePath, 'utf-8');
        const vocabData = JSON.parse(fileContent); // Expecting array of { word, phonetic, definitions: [] } or simple object map

        const pb = new PocketBase(PB_URL);
        if (PB_EMAIL && PB_PASSWORD) {
            await pb.admins.authWithPassword(PB_EMAIL, PB_PASSWORD);
        }

        // Normalize input: Convert to Array if it's Object
        let entries = [];
        if (Array.isArray(vocabData)) {
            entries = vocabData;
        } else {
            entries = Object.values(vocabData);
        }

        console.log(`[Upload Vocab] Processing ${entries.length} entries...`);

        let successCount = 0;
        let skipCount = 0;

        for (const entry of entries) {
            if (!entry.word) continue;

            const cleanWord = normalizeWord(entry.word);

            // 1. Check existence
            try {
                // Assuming 'dictionary' collection has a 'word' field that is unique
                const existing = await pb.collection('dictionary').getFirstListItem(`word="${cleanWord}"`);

                if (overwrite) {
                    // Update
                    await pb.collection('dictionary').update(existing.id, {
                        ...entry,
                        word: cleanWord, // ensure normalized key
                        original_word: entry.word // keep original casing
                    });
                    process.stdout.write('U');
                    successCount++;
                } else {
                    process.stdout.write('.');
                    skipCount++;
                }
            } catch (e) {
                if (e.status === 404) {
                    // Create
                    await pb.collection('dictionary').create({
                        ...entry,
                        word: cleanWord,
                        original_word: entry.word
                    });
                    process.stdout.write('+');
                    successCount++;
                } else {
                    console.error(`\nError on ${cleanWord}:`, e.message);
                }
            }
        }

        console.log(`\n[Upload Vocab] Done. Added/Updated: ${successCount}, Skipped: ${skipCount}`);

    } catch (error) {
        console.error('[Upload Vocab] Failed:', error);
        process.exit(1);
    }
}

main();
