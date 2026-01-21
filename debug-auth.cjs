const fs = require('fs');
const path = require('path');

async function testAuth() {
    console.log('--- Starting Auth Debug ---');

    // 1. Read .env manually to be sure
    const envPath = path.join(process.cwd(), '.env');
    if (!fs.existsSync(envPath)) {
        console.error('No .env file found!');
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

    // Cleanup quotes
    if (url && (url.startsWith('"') || url.startsWith("'"))) url = url.slice(1, -1);
    if (email && (email.startsWith('"') || email.startsWith("'"))) email = email.slice(1, -1);
    if (password && (password.startsWith('"') || password.startsWith("'"))) password = password.slice(1, -1);

    console.log(`Target URL: ${url}`);
    console.log(`Email: ${email}`);
    console.log(`Password: ${password ? password.substring(0, 2) + '*'.repeat(password.length - 2) : 'MISSING'}`);

    if (!url || !email || !password) {
        console.error('Missing credentials in .env');
        return;
    }

    // 2. Try User Auth
    try {
        console.log('\n[Attempt 1] Authenticating as USER (collections/users)...');
        const res = await fetch(`${url}/api/collections/users/auth-with-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identity: email, password: password })
        });
        console.log(`Status: ${res.status} ${res.statusText}`);
        const text = await res.text();
        console.log(`Body: ${text}`);
    } catch (e) {
        console.error('User Auth Req Failed:', e.message);
    }

    // 3. Try Admin Auth
    try {
        console.log('\n[Attempt 2] Authenticating as ADMIN (admins)...');
        const res = await fetch(`${url}/api/admins/auth-with-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identity: email, password: password })
        });
        console.log(`Status: ${res.status} ${res.statusText}`);
        const text = await res.text();
        console.log(`Body: ${text}`);
    } catch (e) {
        console.error('Admin Auth Req Failed:', e.message);
    }

    console.log('\n--- End Auth Debug ---');
}

testAuth();
