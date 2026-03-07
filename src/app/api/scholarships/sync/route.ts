import { NextResponse } from 'next/server';
import { ScraperOrchestrator } from '@/server/scraper/scraper-config';
import { inngest } from '@/server/jobs/client';

// Prevent Next.js from caching or timing out too early (max 300s requires Vercel Pro, but works locally)
export const maxDuration = 300;
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        // Basic security for cron (optional but highly recommended)
        const { searchParams } = new URL(request.url);
        const secret = searchParams.get('secret');
        const expectedSecret = process.env.CRON_SECRET;

        if (expectedSecret && secret !== expectedSecret) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const orchestrator = new ScraperOrchestrator();
        console.log('--- Starting Scholarship Sync ---');
        const results = await orchestrator.runAll();

        let queuedCount = 0;
        const events = [];

        for (const result of results) {
            for (const raw of result.scholarships) {
                events.push({
                    name: "scholarship/scraped",
                    data: raw,
                });
                queuedCount++;
            }
        }

        if (events.length > 0) {
            await inngest.send(events);
            console.log(`Sent ${events.length} jobs to Inngest queue`);
        }

        console.log(`--- Sync Complete. Queued ${queuedCount} records for processing. ---`);

        return NextResponse.json({
            success: true,
            scrapedSources: results.map(r => r.source),
            queuedItems: queuedCount,
        });
    } catch (error: any) {
        console.error('Critical Sync Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
