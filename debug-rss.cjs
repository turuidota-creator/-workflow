
const fs = require('fs');
const path = require('path');
const { ProxyAgent } = require('undici');

// Proxy setup
function getProxyUrl() {
    try {
        const envPath = path.resolve(__dirname, '.env');
        if (fs.existsSync(envPath)) {
            const content = fs.readFileSync(envPath, 'utf-8');
            const match = content.match(/HTTPS_PROXY=(.+)/);
            if (match && match[1]) {
                let url = match[1].trim();
                if (!url.startsWith('http://') && !url.startsWith('https://')) {
                    url = `http://${url}`;
                }
                return url;
            }
        }
    } catch (e) { }
    return null;
}

function createProxyDispatcher() {
    const proxyUrl = getProxyUrl();
    if (proxyUrl) {
        console.log(`Using Proxy: ${proxyUrl}`);
        return new ProxyAgent({
            uri: proxyUrl,
            connect: { timeout: 15000 } // Longer timeout
        });
    }
    console.log('No Proxy detected.');
    return undefined;
}

const dispatcher = createProxyDispatcher();

// Feeds to test (Verified ones)
const feeds = [
    { name: 'The Verge', url: 'https://www.theverge.com/rss/index.xml' },
    { name: 'The Guardian', url: 'https://www.theguardian.com/world/rss' },
    { name: 'Politico', url: 'https://rss.politico.com/politics-news.xml' },
    { name: 'Yahoo Finance', url: 'https://finance.yahoo.com/news/rssindex' },
    { name: 'NYTimes Tech', url: 'https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml' }
];

async function debugRSS() {
    console.log('Debugging RSS Parsing...');

    // Copy of regex from server/index.cjs
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    const titleRegex = /<title>([\s\S]*?)<\/title>/;

    for (const feed of feeds) {
        console.log(`\nFetching ${feed.name} (${feed.url})...`);
        try {
            const response = await fetch(feed.url, { dispatcher });
            if (!response.ok) {
                console.error(`FAILED to fetch: ${response.status} ${response.statusText}`);
                continue;
            }

            const text = await response.text();
            console.log(`Fetched ${text.length} bytes.`);

            // Test parsing
            const items = [];
            let match;
            // Reset regex lastIndex
            itemRegex.lastIndex = 0;

            while ((match = itemRegex.exec(text)) !== null) {
                const itemContent = match[1];
                const titleMatch = titleRegex.exec(itemContent);
                if (titleMatch) {
                    items.push(titleMatch[1].substring(0, 50) + "...");
                }
            }

            console.log(`Found ${items.length} items.`);
            if (items.length > 0) {
                console.log('Sample item:', items[0]);
            } else {
                console.log('WARNING: No items found with regex!');
                // Log snippet to see why regex might fail
                console.log('Snippet (first 500 chars):', text.substring(0, 500));
            }

        } catch (e) {
            console.error(`ERROR: ${e.message}`);
        }
    }
}

debugRSS();
