
import PocketBase from 'pocketbase';
import { localDictionary } from '../../src/data/simpleDictionary.ts';
// NOTE: Importing TS file in JS script requires 'tsx' or 'ts-node'. 
// We will instruct the user to run this using `npx tsx .agent/scripts/migrate_dictionary.ts`
// So we should name this file .ts

import 'dotenv/config';

// Configuration
const PB_URL = process.env.POCKETBASE_URL || 'http://127.0.0.1:8090';
const PB_EMAIL = process.env.POCKETBASE_EMAIL;
const PB_PASSWORD = process.env.POCKETBASE_PASSWORD;

async function main() {
    console.log(`[Migration] Starting Dictionary Migration...`);
    console.log(`[Migration] Entries to process: ${Object.keys(localDictionary).length}`);

    try {
        const pb = new PocketBase(PB_URL);
        // Disable auto-cancellation
        pb.autoCancellation(false);

        if (PB_EMAIL && PB_PASSWORD) {
            await pb.admins.authWithPassword(PB_EMAIL, PB_PASSWORD);
        }

        let success = 0;
        let skipped = 0;
        let failed = 0;

        const entries = Object.values(localDictionary);

        // Batch processing? PocketBase doesn't support bulk create natively via API yet (batch is transactional but single requests).
        // Validating concurrency.

        const CONCURRENCY = 10;
        for (let i = 0; i < entries.length; i += CONCURRENCY) {
            const chunk = entries.slice(i, i + CONCURRENCY);
            await Promise.all(chunk.map(async (entry) => {
                const cleanWord = entry.word.toLowerCase(); // Simple normalization

                try {
                    // Check existence (optimistic: try create, catch error if unique constraint fails)
                    // Or check first. Checking first is safer.
                    try {
                        await pb.collection('dictionary_new').getFirstListItem(`word="${cleanWord}"`);
                        skipped++;
                        process.stdout.write('.');
                    } catch (err: any) {
                        if (err.status === 404) {
                            await pb.collection('dictionary_new').create({
                                word: cleanWord,
                                original_word: entry.word,
                                phonetic: entry.phonetic,
                                definitions: entry.definitions,
                                source: 'simpleDictionary'
                            });
                            success++;
                            process.stdout.write('+');
                        } else {
                            throw err;
                        }
                    }
                } catch (e: any) {
                    failed++;
                    console.error(`\nFailed ${entry.word}: ${e.message}`);
                }
            }));
        }

        console.log(`\n[Migration] Complete.`);
        console.log(`Success: ${success}`);
        console.log(`Skipped: ${skipped}`);
        console.log(`Failed: ${failed}`);

    } catch (error) {
        console.error('[Migration] Fatal:', error);
    }
}

main();
