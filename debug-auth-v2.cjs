const fs = require('fs');
const path = require('path');

async function testAuthV2() {
    console.log('--- PocketBase Connectivity Diagnostic ---');

    const envPath = path.join(process.cwd(), '.env');
    if (!fs.existsSync(envPath)) {
        console.error('❌ .env file missing');
        return;
    }

    const content = fs.readFileSync(envPath, 'utf-8');
    let url = '';
    content.split('\n').forEach(line => {
        if (line.trim().startsWith('POCKETBASE_URL=')) {
            url = line.split('=')[1].trim().replace(/['"]/g, '');
        }
    });

    if (!url) {
        console.error('❌ POCKETBASE_URL not found in .env');
        return;
    }

    // Remove trailing slash if present
    if (url.endsWith('/')) url = url.slice(0, -1);

    console.log(`Target: ${url}`);

    // Test 1: Health Check (GET)
    try {
        console.log('\n[1] Checking /api/health...');
        const res = await fetch(`${url}/api/health`);
        console.log(`    Status: ${res.status} ${res.statusText}`);
        const text = await res.text();
        console.log(`    Response: ${text.slice(0, 100)}...`);
    } catch (e) {
        console.error(`    ❌ Failed: ${e.message}`);
    }

    // Test 2: Users Auth (POST)
    try {
        console.log('\n[2] Checking /api/collections/users/auth-with-password...');
        // We will just check if it returns 400 (Method Allowed but invalid creds) vs 404 (Not Found)
        // Sending dummy data first to check route existence
        const res = await fetch(`${url}/api/collections/users/auth-with-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identity: 'test', password: 'test' })
        });
        console.log(`    Status: ${res.status} ${res.statusText}`);
        const text = await res.text();
        console.log(`    Response: ${text}`);
    } catch (e) {
        console.error(`    ❌ Failed: ${e.message}`);
    }

    console.log('\n--- Diagnostic End ---');
}

testAuthV2();
