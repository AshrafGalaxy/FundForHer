import { Buddy4StudyScraper } from './buddy4study-scraper';
import { NSPScraper } from './nsp-scraper';
import { VidyasaarathiScraper } from './vidyasaarathi-scraper';
import { ScraperResult } from './types';
import { withRetry } from './retry';

export class ScraperOrchestrator {
    private scrapers = [
        new Buddy4StudyScraper(),
        new NSPScraper(),
        new VidyasaarathiScraper(),
    ];

    async runAll(): Promise<ScraperResult[]> {
        console.log(`🕷️ Starting scraper orchestrator with ${this.scrapers.length} sources...`);
        const results: ScraperResult[] = [];

        for (const scraper of this.scrapers) {
            try {
                // Each individual scraper run is itself wrapped in retry + timeout at source level
                const result = await withRetry(
                    () => scraper.scrape(),
                    { maxAttempts: 2, baseDelayMs: 3000, timeoutMs: 60_000, label: `Scraper run` }
                );
                results.push(result);
                console.log(`✅ Scraper [${result.source}] completed. Found ${result.scholarships.length} raw items.`);
                if (result.errors?.length) {
                    console.warn(`⚠️ Scraper [${result.source}] had ${result.errors.length} non-fatal errors:`, result.errors);
                }
            } catch (error: any) {
                console.error(`❌ Scraper failed permanently:`, error.message);
                results.push({
                    source: 'Unknown',
                    scholarships: [],
                    scrapedAt: new Date(),
                    errors: [error.message],
                });
            }
        }

        return results;
    }
}
