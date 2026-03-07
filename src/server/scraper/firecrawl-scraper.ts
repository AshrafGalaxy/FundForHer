import FirecrawlApp from '@mendable/firecrawl-js';
import * as cheerio from 'cheerio';

// Lazily create FirecrawlApp only when an API key is present.
// A module-level `new FirecrawlApp(undefined)` throws at import time, which
// would crash every test that imports this file even when using the free fallback.
let _firecrawlApp: FirecrawlApp | null = null;
function getFirecrawlApp(): FirecrawlApp | null {
    const key = process.env.FIRECRAWL_API_KEY;
    if (!key) return null;
    if (!_firecrawlApp) {
        _firecrawlApp = new FirecrawlApp({ apiKey: key });
    }
    return _firecrawlApp;
}

/** For testing only — clears the cached FirecrawlApp instance. */
export function _resetFirecrawlForTesting() { _firecrawlApp = null; }

export async function scrapeUrlWithFirecrawl(url: string): Promise<string> {
    if (!process.env.FIRECRAWL_API_KEY) {
        return await fallbackFreeScrape(url);
    }

    try {
        console.log(`🔥 Scraping with Firecrawl: ${url}`);
        const firecrawl = getFirecrawlApp()!;
        const scrapeResult = await (firecrawl as any).scrapeUrl(url, {
            formats: ['markdown'],
        });

        if (!scrapeResult.success) {
            throw new Error(`Failed to scrape: ${scrapeResult.error}`)
        }

        return scrapeResult.markdown || scrapeResult.html || "";
    } catch (error: any) {
        console.warn("🔥 Firecrawl Error or Limit Reached. Falling back to free scraper.", error.message);
        return await fallbackFreeScrape(url);
    }
}

/**
 * A 100% free fallback scraper that extracts raw text from a webpage and strips out noise.
 * It does not render JavaScript, but because Gemini 2.0 is extremely smart,
 * we can just feed it the raw text of the HTML and it can extract scholarship details perfectly.
 */
async function fallbackFreeScrape(url: string): Promise<string> {
    console.log(`🆓 Scraping with Free Fallback Extractor: ${url}`);
    try {
        const response = await fetch(url, {
            headers: {
                // Mimic a real browser to avoid basic blocks
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        if (!response.ok) {
            throw new Error(`Fallback fetch failed with status ${response.status}`);
        }

        const html = await response.text();
        const $ = cheerio.load(html);

        // Remove useless noise elements to save token limits for Gemini
        $('script, style, noscript, iframe, img, svg, header, footer, nav, .menu, .sidebar, #sidebar').remove();

        // Extract plain text and normalize whitespace
        let pureText = $('body').text();
        pureText = pureText.replace(/\s+/g, ' ').trim();

        return pureText;
    } catch (error) {
        console.error("Free Fallback Scraper Error:", error);
        return "";
    }
}
