import { inngest } from "./client";
import { parseScholarshipFlow } from '@/server/ai/flows/parse-scholarship-flow';
import {
    upsertScholarship,
    isUrlAlreadyKnown,
    markExpiredScholarships,
    logScraperRun,
    markUrlParsed,
    isUrlParsedRecently,
    type UpsertResult,
} from '@/server/db/scholarship-firestore';
import type { Scholarship } from '@/lib/types';
import { discoverScholarships } from '@/server/scraper/discovery';
import { scrapeUrlWithFirecrawl } from '@/server/scraper/firecrawl-scraper';
import { withRetry } from '@/server/scraper/retry';
import { CURATED_STATIC_URLS, DISCOVERY_QUERIES } from '@/server/scraper/curated-sources';

// ─────────────────────────────────────────────
// V1: Process a single scraped scholarship item (fired from manual triggers / Buddy4Study scraper)
// ─────────────────────────────────────────────
export const processScrapedScholarship = inngest.createFunction(
    {
        id: "process-scraped-scholarship",
        concurrency: { limit: 5 }, // Reduced from 10 to respect Gemini free-tier rate limits
    },
    { event: "scholarship/scraped" },
    async ({ event, step }) => {
        const raw = event.data;

        // Step 1: Use AI to parse the raw scraped data into structured scholarships
        const parsedArray = await step.run("parse-scholarship", async () => {
            return await withRetry(
                () => parseScholarshipFlow({
                    title: raw.title,
                    provider: raw.provider,
                    descriptionSnippet: raw.descriptionSnippet,
                    sourceUrl: raw.sourceUrl,
                    rawHtml: raw.rawHtml,
                }),
                { maxAttempts: 3, baseDelayMs: 2000, timeoutMs: 45_000, label: 'Gemini Parse (V1)' }
            );
        });

        // Step 2: Save validated results to Firestore
        const results: UpsertResult[] = [];
        await step.run("save-to-firestore", async () => {
            for (const parsed of parsedArray) {
                const insertData: Omit<Scholarship, 'id' | 'lastUpdated'> = {
                    title: parsed.title,
                    provider: parsed.provider,
                    amount: parsed.amount,
                    deadline: new Date(parsed.deadline),
                    description: parsed.description,
                    eligibility: parsed.eligibility,
                    fieldOfStudy: parsed.fieldOfStudy || [],
                    location: parsed.location || 'india',
                    eligibilityLevel: parsed.eligibilityLevel || [],
                    scholarshipType: parsed.scholarshipType,
                    gender: parsed.gender || 'Female',
                    religion: parsed.religion || 'all',
                    status: 'Live',
                    officialLink: raw.sourceUrl,
                };
                const result = await upsertScholarship(insertData);
                results.push(result);
            }
        });

        const inserted = results.filter(r => r.action === 'inserted').length;
        const skipped = results.filter(r => r.action === 'skipped').length;
        return { processed: true, inserted, skipped };
    }
);

// ─────────────────────────────────────────────
// V2: Automatic Daily Discovery Cron Job (2 AM IST)
// ─────────────────────────────────────────────
export const dailyDiscoveryCron = inngest.createFunction(
    { id: "daily-discovery-cron" },
    { cron: "TZ=Asia/Kolkata 0 2 * * *" },
    async ({ step }) => {
        const startTime = Date.now();
        const errors: string[] = [];
        let urlsSkippedDuplicate = 0;
        let totalInserted = 0;
        let totalUpdated = 0;
        let totalSkippedInvalid = 0;
        let expiredMarked = 0;

        // Step 1: Use Serper.dev to discover fresh scholarship URLs from Google
        const urls = await step.run("discover-urls", async () => {
            return await withRetry(
                () => discoverScholarships("new scholarships for girls india open 2026"),
                { maxAttempts: 2, baseDelayMs: 3000, timeoutMs: 20_000, label: 'Serper Discovery' }
            );
        });

        // Cap at 10 to avoid Gemini/Firecrawl quota exhaustion
        const cappedUrls = urls.slice(0, 10);
        console.log(`📋 Discovered ${urls.length} URLs. Processing first ${cappedUrls.length}.`);

        // Step 2: Queue each URL for individual processing
        if (cappedUrls.length > 0) {
            const events = cappedUrls.map(url => ({
                name: "scholarship/process-url",
                data: { url }
            }));
            await step.sendEvent("dispatch-url-processing", events);
        }

        // Step 3: Run the expired scholarship cleanup
        expiredMarked = await step.run("mark-expired", async () => {
            return await markExpiredScholarships();
        });

        // Step 4: Log this run to Firestore for observability
        await step.run("log-run", async () => {
            await logScraperRun({
                runAt: new Date(),
                urlsDiscovered: urls.length,
                urlsSkippedDuplicate,
                scholarshipsInserted: totalInserted,
                scholarshipsUpdated: totalUpdated,
                scholarshipsSkippedInvalid: totalSkippedInvalid,
                expiredMarked,
                errorsCount: errors.length,
                errorMessages: errors,
                durationSeconds: Math.round((Date.now() - startTime) / 1000),
            });
        });

        return { discovered: urls.length, dispatched: cappedUrls.length, expiredMarked };
    }
);

// ─────────────────────────────────────────────
// V2: Universal URL Processor (Firecrawl → Gemini → Firestore)
// ─────────────────────────────────────────────
export const processDiscoveredUrl = inngest.createFunction(
    {
        id: "process-discovered-url",
        concurrency: { limit: 2 }, // Strict: only 2 URLs processed simultaneously
        retries: 2,               // Inngest-level retries for transient failures
    },
    { event: "scholarship/process-url" },
    async ({ event, step }) => {
        const { url } = event.data;
        const errors: string[] = [];

        // Gate: Skip this URL if it already exists in our database
        const isDuplicate = await step.run("check-duplicate-url", async () => {
            return await isUrlAlreadyKnown(url);
        });

        if (isDuplicate) {
            console.log(`⏭️ Skipping already-known URL: ${url}`);
            return { skipped: true, reason: 'URL already in database', url };
        }

        // Gate 2: Skip if parsed recently (URL parse cache — 30 day TTL)
        const recentlyCached = await step.run("check-parse-cache", async () => {
            return await isUrlParsedRecently(url);
        });

        if (recentlyCached) {
            console.log(`⏭️ Skipping recently-parsed URL (cache hit): ${url}`);
            return { skipped: true, reason: 'URL in parse cache (30d TTL)', url };
        }

        // Step 1: Scrape the URL via Firecrawl (with free cheerio fallback)
        const markdownText = await step.run("extract-markdown", async () => {
            return await withRetry(
                () => scrapeUrlWithFirecrawl(url),
                { maxAttempts: 2, baseDelayMs: 3000, timeoutMs: 35_000, label: `Firecrawl(${url.slice(0, 50)})` }
            );
        });

        if (!markdownText || markdownText.trim().length < 100) {
            return { skipped: true, reason: "No substantial text extracted", url };
        }

        // Step 2: Send raw text to Gemini for structured parsing
        const parsedArray = await step.run("parse-markdown-with-ai", async () => {
            return await withRetry(
                () => parseScholarshipFlow({
                    title: "Unknown",
                    provider: "Unknown",
                    descriptionSnippet: "",
                    sourceUrl: url,
                    rawHtml: markdownText,
                }),
                { maxAttempts: 3, baseDelayMs: 2000, timeoutMs: 60_000, label: `Gemini Parse(${url.slice(0, 40)})` }
            );
        });

        if (!parsedArray || parsedArray.length === 0) {
            return { skipped: true, reason: "AI returned no parsed scholarships", url };
        }

        // Step 3: Validate + save each parsed scholarship to Firestore
        const results: UpsertResult[] = [];
        await step.run("save-discovered-to-firestore", async () => {
            for (const parsed of parsedArray) {
                try {
                    const insertData: Omit<Scholarship, 'id' | 'lastUpdated'> = {
                        title: parsed.title,
                        provider: parsed.provider,
                        amount: parsed.amount,
                        deadline: new Date(parsed.deadline),
                        description: parsed.description,
                        eligibility: parsed.eligibility,
                        fieldOfStudy: parsed.fieldOfStudy || [],
                        location: parsed.location || 'india',
                        eligibilityLevel: parsed.eligibilityLevel || [],
                        scholarshipType: parsed.scholarshipType,
                        gender: parsed.gender || 'Female',
                        religion: parsed.religion || 'all',
                        status: 'Live',
                        officialLink: url,
                    };
                    const result = await upsertScholarship(insertData);
                    results.push(result);
                } catch (err: any) {
                    errors.push(`Save failed for "${parsed.title}": ${err.message}`);
                    console.error(err);
                }
            }
        });

        const inserted = results.filter(r => r.action === 'inserted').length;
        const updated = results.filter(r => r.action === 'updated').length;
        const skipped = results.filter(r => r.action === 'skipped').length;

        // Mark this URL as parsed in the 30-day cache
        await step.run("mark-url-cached", async () => {
            await markUrlParsed(url, parsedArray.length);
        });

        return {
            success: true,
            url,
            scholarshipsFound: parsedArray.length,
            inserted,
            updated,
            skippedInvalid: skipped,
            errors,
        };
    }
);

// ─────────────────────────────────────────────
// Nightly Cleanup Cron (3 AM IST — runs AFTER discovery)
// ─────────────────────────────────────────────
export const nightlyCleanupCron = inngest.createFunction(
    { id: "nightly-cleanup-cron" },
    { cron: "TZ=Asia/Kolkata 0 3 * * *" },
    async ({ step }) => {
        const expiredCount = await step.run("mark-expired-scholarships", async () => {
            return await markExpiredScholarships();
        });
        return { expiredMarked: expiredCount };
    }
);

// ─────────────────────────────────────────────
// Main Discovery Pipeline (triggered via GitHub Action or manual)
// ─────────────────────────────────────────────
export const triggerDiscoveryPipeline = inngest.createFunction(
    { id: 'trigger-discovery-pipeline', retries: 1 },
    { event: 'scholarship/trigger-discovery' },
    async ({ event, step }) => {
        const startTime = Date.now();
        console.log(`🚀 Discovery pipeline started. Source: ${event.data?.source ?? 'manual'}`);

        // Step 1: Dispatch curated static URLs immediately (no Serper needed)
        const { CURATED_STATIC_URLS } = await import('@/server/scraper/curated-sources');
        const curatedEvents = CURATED_STATIC_URLS.map(url => ({
            name: 'scholarship/process-url' as const,
            data: { url },
        }));
        await step.sendEvent('dispatch-curated-urls', curatedEvents);
        console.log(`📌 Dispatched ${curatedEvents.length} curated static URLs for processing.`);

        // Step 2: Run multiple Serper discovery queries for fresh URLs
        const { DISCOVERY_QUERIES } = await import('@/server/scraper/curated-sources');
        const discoveredUrls = await step.run('serper-discovery', async () => {
            if (!process.env.SERPER_API_KEY) {
                console.warn('⚠️ SERPER_API_KEY not set — skipping discovery queries.');
                return [];
            }
            const allUrls = new Set<string>();
            for (const query of DISCOVERY_QUERIES) {
                try {
                    const urls = await discoverScholarships(query);
                    urls.forEach(u => allUrls.add(u));
                } catch (e: any) {
                    console.warn(`Serper query failed for "${query}": ${e.message}`);
                }
            }
            // Deduplicate against curated set to avoid double processing
            const uniqueDiscovered = Array.from(allUrls).filter(
                u => !CURATED_STATIC_URLS.includes(u)
            );
            console.log(`🔍 Serper discovered ${allUrls.size} URLs, ${uniqueDiscovered.length} unique after dedup.`);
            return uniqueDiscovered.slice(0, 15); // Cap to 15 fresh URLs per run
        });

        // Step 3: Dispatch discovered URLs
        if (discoveredUrls.length > 0) {
            const discoveredEvents = discoveredUrls.map(url => ({
                name: 'scholarship/process-url' as const,
                data: { url },
            }));
            await step.sendEvent('dispatch-discovered-urls', discoveredEvents);
            console.log(`📤 Dispatched ${discoveredEvents.length} Serper-discovered URLs.`);
        }

        // Step 4: Log the trigger run
        await step.run('log-trigger-run', async () => {
            await logScraperRun({
                runAt: new Date(),
                urlsDiscovered: discoveredUrls.length,
                urlsSkippedDuplicate: 0,
                scholarshipsInserted: 0, // Actual counts logged by processDiscoveredUrl
                scholarshipsUpdated: 0,
                scholarshipsSkippedInvalid: 0,
                expiredMarked: 0,
                errorsCount: 0,
                errorMessages: [],
                durationSeconds: Math.round((Date.now() - startTime) / 1000),
            });
        });

        return {
            curatedDispatched: curatedEvents.length,
            freshDiscovered: discoveredUrls.length,
            totalDispatched: curatedEvents.length + discoveredUrls.length,
        };
    }
);

// ─────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────
export const functions = [
    processScrapedScholarship,
    dailyDiscoveryCron,
    processDiscoveredUrl,
    nightlyCleanupCron,
    triggerDiscoveryPipeline,
];
