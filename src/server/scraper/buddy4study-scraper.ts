import * as cheerio from 'cheerio';
import { RawScholarship, ScraperResult } from './types';

export class Buddy4StudyScraper {
    static readonly SOURCE_NAME = 'Buddy4Study';
    static readonly GIRLS_URL = 'https://www.buddy4study.com/scholarships/girls';

    async scrape(): Promise<ScraperResult> {
        const scholarships: RawScholarship[] = [];
        const errors: string[] = [];

        try {
            console.log(`Fetching from ${Buddy4StudyScraper.GIRLS_URL}...`);
            const response = await fetch(Buddy4StudyScraper.GIRLS_URL, {
                headers: {
                    'User-Agent':
                        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    Accept:
                        'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                },
            });

            if (!response.ok) {
                throw new Error(
                    `Failed to fetch Buddy4Study: ${response.status} ${response.statusText}`
                );
            }

            const html = await response.text();
            const $ = cheerio.load(html);

            // Target potential scholarship card containers
            const cardSelectors = ['.scholarshipCategory', '.scholarshipList', 'article', '.card', '.sch_card'];
            let cards = $();

            for (const selector of cardSelectors) {
                cards = $(selector);
                if (cards.length > 0) break;
            }

            if (cards.length > 0) {
                cards.each((_, element) => {
                    const el = $(element);
                    const title = el.find('h3, h4, .title, a').first().text().replace(/\s+/g, ' ').trim();
                    const link = el.find('a').first().attr('href') || Buddy4StudyScraper.GIRLS_URL;
                    const textContent = el.text().replace(/\s+/g, ' ').trim();
                    const rawHtml = el.html() || '';

                    // Only keep cards that have substantial text (filters out tiny widgets)
                    if (title && textContent.length > 50) {
                        scholarships.push({
                            title: title || 'Unknown Title',
                            provider: 'Buddy4Study (Aggregated)',
                            descriptionSnippet: textContent.substring(0, 800), // Limit length
                            sourceUrl: link.startsWith('http')
                                ? link
                                : `https://www.buddy4study.com${link}`,
                            rawHtml, // Send full html of the child to Genkit
                        });
                    }
                });
            }

            // Fallback strategy: If no specific cards are found, grab chunks of the body
            // and let the AI parse the unstructured text for scholarships.
            if (scholarships.length === 0) {
                console.log('No specific cards found. Falling back to body text chunking...');
                const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
                // Extract 3000-character chunks
                const chunks = bodyText.match(/.{1,3000}/g) || [];
                chunks.forEach((chunk, index) => {
                    scholarships.push({
                        title: `Buddy4Study Listing Block ${index + 1}`,
                        provider: 'Buddy4Study',
                        descriptionSnippet: chunk,
                        sourceUrl: Buddy4StudyScraper.GIRLS_URL,
                    });
                });
            }
        } catch (error: any) {
            errors.push(`Scraping error: ${error.message}`);
            console.error('Buddy4Study Scraper Error:', error);
        }

        return {
            source: Buddy4StudyScraper.SOURCE_NAME,
            scholarships,
            scrapedAt: new Date(),
            errors: errors.length > 0 ? errors : undefined,
        };
    }
}
