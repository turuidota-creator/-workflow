const fetch = require('node-fetch'); // Assuming node-fetch is available or using built-in fetch in Node 18+

async function getSchema() {
    try {
        const response = await fetch('http://localhost:3003/api/schema', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ collection: 'dictionary_new' })
        });
        const data = await response.json();
        console.log(JSON.stringify(data, null, 2));
    } catch (e) {
        console.error(e);
    }
}

getSchema();
