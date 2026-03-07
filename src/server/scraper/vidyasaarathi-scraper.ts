import * as cheerio from 'cheerio';
import { RawScholarship, ScraperResult } from './types';

/**
 * Scraper for Vidyasaarathi — India's private scholarship aggregator.
 * Targets the women-specific scholarship section.
 */
export class VidyasaarathiScraper {
    static readonly SOURCE_NAME = 'Vidyasaarathi';
    static readonly URL = 'https://www.vidyasaarathi.co.in/Vidyasaarathi/scholarship-list';

    async scrape(): Promise<ScraperResult> {
        const scholarships: RawScholarship[] = [];
        const errors: string[] = [];

        try {
            console.log(`Fetching from Vidyasaarathi: ${VidyasaarathiScraper.URL}`);
            const html = await withRetry(
                () => fetch(VidyasaarathiScraper.URL, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    },
                }).then(r => {
                    if (!r.ok) throw new Error(`Vidyasaarathi fetch failed: ${r.status}`);
                    return r.text();
                }),
                { maxAttempts: 3, baseDelayMs: 2500, timeoutMs: 20_000, label: 'Vidyasaarathi Fetch' }
            );

            const $ = cheerio.load(html);

            // Common card-based selectors used by scholarship aggregators
            const cardSelectors = ['.scholarship-card', '.scheme-card', 'article', '.card', '.list-item'];
            let cards = $();
            for (const sel of cardSelectors) {
                cards = $(sel);
                if (cards.length > 0) break;
            }

            if (cards.length > 0) {
                cards.each((_, element) => {
                    const el = $(element);
                    const title = el.find('h3, h4, h2, .title, a').first().text().replace(/\s+/g, ' ').trim();
                    const link = el.find('a').first().attr('href') || VidyasaarathiScraper.URL;
                    const textContent = el.text().replace(/\s+/g, ' ').trim();

                    if (title && title.length > 5 && textContent.length > 50) {
                        scholarships.push({
                            title,
                            provider: 'Vidyasaarathi',
                            descriptionSnippet: textContent.substring(0, 800),
                            sourceUrl: link.startsWith('http')
                                ? link
                                : `https://www.vidyasaarathi.co.in${link.startsWith('/') ? '' : '/'}${link}`,
                        });
                    }
                });
            }

            // Fallback: body text chunking
            if (scholarships.length === 0) {
                console.log('[Vidyasaarathi] No cards found. Falling back to body text chunking.');
                const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
                const chunks = bodyText.match(/.{1,3000}/g) || [];
                chunks.slice(0, 5).forEach((chunk, index) => {
                    scholarships.push({
                        title: `Vidyasaarathi Listing Block ${index + 1}`,
                        provider: 'Vidyasaarathi',
                        descriptionSnippet: chunk,
                        sourceUrl: VidyasaarathiScraper.URL,
                    });
                });
            }
        } catch (error: any) {
            errors.push(`Vidyasaarathi Scraper error: ${error.message}`);
            console.error('Vidyasaarathi Scraper Error:', error);
        }

        return {
            source: VidyasaarathiScraper.SOURCE_NAME,
            scholarships,
            scrapedAt: new Date(),
            errors: errors.length > 0 ? errors : undefined,
        };
    }
}
