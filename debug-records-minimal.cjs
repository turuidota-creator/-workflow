const fs = require('fs');
const path = require('path');

async function testFetchRecordsMinimal() {
    console.log('--- Minimal Records Fetch Test (No Params) ---');

    const envPath = path.join(process.cwd(), '.env');
    if (!fs.existsSync(envPath)) return console.error('No .env');

    const content = fs.readFileSync(envPath, 'utf-8');
    let url, email, password;
    content.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed.startsWith('POCKETBASE_URL=')) url = trimmed.split('=')[1].trim().replace(/['"]/g, '');
        if (trimmed.startsWith('POCKETBASE_EMAIL=')) email = trimmed.split('=')[1].trim().replace(/['"]/g, '');
        if (trimmed.startsWith('POCKETBASE_PASSWORD=')) password = trimmed.split('=')[1].trim().replace(/['"]/g, '');
    });

    if (url.endsWith('/')) url = url.slice(0, -1);
    console.log(`Target: ${url}`);

    // Auth as Superuser
    let token = null;
    try {
        console.log('\n[1] Authenticating...');
        const res = await fetch(`${url}/api/collections/_superusers/auth-with-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identity: email, password: password })
        });

        if (res.ok) {
            const data = await res.json();
            token = data.token;
            console.log('✅ Auth Success');
        } else {
            console.error(`❌ Auth Failed: ${res.status} ${await res.text()}`);
            return;
        }
    } catch (e) {
        console.error('Auth Error:', e.message);
        return;
    }

    // Fetch Records with NO PARAMS
    try {
        const collection = 'articles';
        const fetchUrl = `${url}/api/collections/${collection}/records`; // No params!
        console.log(`\n[2] Fetching records (no params): ${fetchUrl}`);

        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = token;

        const res = await fetch(fetchUrl, { headers });
        console.log(`Status: ${res.status} ${res.statusText}`);

        if (!res.ok) {
            const text = await res.text();
            console.error(`❌ Error Body: ${text}`);
        } else {
            const data = await res.json();
            console.log(`✅ Success! Found ${data.totalItems} items.`);
            if (data.items && data.items.length > 0) {
                console.log('First item keys:', Object.keys(data.items[0]).join(', '));
            }
        }

    } catch (e) {
        console.error('Fetch Error:', e.message);
    }
}

testFetchRecordsMinimal();
