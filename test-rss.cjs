
const fs = require('fs');
const path = require('path');
const { ProxyAgent } = require('undici');

// ================= PROXY CONFIGURATION =================
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
            connect: { timeout: 10000 }
        });
    }
    return undefined;
}

const dispatcher = createProxyDispatcher();

const feeds = [
    // Previous attempts
    { name: 'CNBC (Alt 1)', url: 'https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=100003114' }, // Top News
    { name: 'CNBC (Alt 2)', url: 'https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=10000664' }, // Finance
    { name: 'Washington Post', url: 'https://feeds.washingtonpost.com/rss/politics' },
    { name: 'Reuters (Business)', url: 'https://www.reutersagency.com/feed/?best-topics=business-finance&post_type=best' }, // Agency feed (might be robust)
    { name: 'Yahoo Finance', url: 'https://finance.yahoo.com/news/rssindex' }
];

async function testFeeds() {
    console.log('Retesting RSS Feeds...\n');

    for (const feed of feeds) {
        try {
            const start = Date.now();
            const response = await fetch(feed.url, { dispatcher, method: 'HEAD' });
            if (!response.ok && response.status === 405) {
                await fetch(feed.url, { dispatcher });
            }
            const time = Date.now() - start;
            if (response.ok) {
                console.log(`[PASS] ${feed.name}: ${response.status} (${time}ms)`);
            } else {
                console.log(`[FAIL] ${feed.name}: ${response.status}`);
            }
        } catch (e) {
            console.log(`[ERROR] ${feed.name}: ${e.message}`);
        }
    }
}

testFeeds();
