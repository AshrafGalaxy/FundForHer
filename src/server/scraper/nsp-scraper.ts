import * as cheerio from 'cheerio';
import { RawScholarship, ScraperResult } from './types';

/**
 * Scraper for the National Scholarship Portal (NSP) — India's government portal.
 * Very stable, rarely blocks scrapers, and uses structured HTML.
 */
export class NSPScraper {
    static readonly SOURCE_NAME = 'National Scholarship Portal';
    static readonly URL = 'https://scholarships.gov.in/public/schemeGovt/stateSchemes.html';

    async scrape(): Promise<ScraperResult> {
        const scholarships: RawScholarship[] = [];
        const errors: string[] = [];

        try {
            console.log(`Fetching from NSP: ${NSPScraper.URL}`);
            const html = await withRetry(
                () => fetch(NSPScraper.URL, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    },
                }).then(r => {
                    if (!r.ok) throw new Error(`NSP fetch failed: ${r.status}`);
                    return r.text();
                }),
                { maxAttempts: 3, baseDelayMs: 2000, timeoutMs: 20_000, label: 'NSP Fetch' }
            );

            const $ = cheerio.load(html);

            // NSP uses a standard table layout for scholarship listings
            $('table tr, .scheme-list li, .scholarship-item, article').each((_, element) => {
                const el = $(element);
                const title = el.find('a, h3, h4, td:first-child').first().text().replace(/\s+/g, ' ').trim();
                const link = el.find('a').first().attr('href') || NSPScraper.URL;
                const textContent = el.text().replace(/\s+/g, ' ').trim();

                if (title && title.length > 10 && textContent.length > 50) {
                    scholarships.push({
                        title,
                        provider: 'National Scholarship Portal',
                        descriptionSnippet: textContent.substring(0, 800),
                        sourceUrl: link.startsWith('http')
                            ? link
                            : `https://scholarships.gov.in${link.startsWith('/') ? '' : '/'}${link}`,
                    });
                }
            });

            // Fallback: body text chunking if no structured items found
            if (scholarships.length === 0) {
                const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
                const chunks = bodyText.match(/.{1,3000}/g) || [];
                chunks.forEach((chunk, index) => {
                    scholarships.push({
                        title: `NSP Listing Block ${index + 1}`,
                        provider: 'National Scholarship Portal',
                        descriptionSnippet: chunk,
                        sourceUrl: NSPScraper.URL,
                    });
                });
            }
        } catch (error: any) {
            errors.push(`NSP Scraper error: ${error.message}`);
            console.error('NSP Scraper Error:', error);
        }

        return {
            source: NSPScraper.SOURCE_NAME,
            scholarships,
            scrapedAt: new Date(),
            errors: errors.length > 0 ? errors : undefined,
        };
    }
}
