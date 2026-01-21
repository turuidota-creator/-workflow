const fs = require('fs');
const path = require('path');

async function testAuthV3() {
    console.log('--- PocketBase Superuser Auth Test ---');

    const envPath = path.join(process.cwd(), '.env');
    if (!fs.existsSync(envPath)) {
        console.error('❌ .env file missing');
        return;
    }

    const content = fs.readFileSync(envPath, 'utf-8');
    let url, email, password;

    content.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed.startsWith('POCKETBASE_URL=')) url = trimmed.split('=')[1].trim();
        if (trimmed.startsWith('POCKETBASE_EMAIL=')) email = trimmed.split('=')[1].trim();
        if (trimmed.startsWith('POCKETBASE_PASSWORD=')) password = trimmed.split('=')[1].trim();
    });

    if (url && (url.startsWith('"') || url.startsWith("'"))) url = url.slice(1, -1);
    if (email && (email.startsWith('"') || email.startsWith("'"))) email = email.slice(1, -1);
    if (password && (password.startsWith('"') || password.startsWith("'"))) password = password.slice(1, -1);

    if (url.endsWith('/')) url = url.slice(0, -1);

    console.log(`Target: ${url}`);
    console.log(`Endpoint: /api/collections/_superusers/auth-with-password`);

    // Test Admin/Superuser Auth (POST)
    try {
        console.log('\n Authenticating as SUPERUSER...');
        const res = await fetch(`${url}/api/collections/_superusers/auth-with-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identity: email, password: password })
        });
        console.log(`    Status: ${res.status} ${res.statusText}`);
        const text = await res.text();
        console.log(`    Response: ${text.slice(0, 150)}...`); // Truncate token
    } catch (e) {
        console.error(`    ❌ Failed: ${e.message}`);
    }

    console.log('\n--- Diagnostic End ---');
}

testAuthV3();
