import { NextResponse } from 'next/server';
import { inngest } from '@/server/jobs/client';

export const dynamic = 'force-dynamic';
// Safe for Vercel Hobby (10s hard limit) — this route only fires one Inngest event
export const maxDuration = 10;

export async function POST(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const secret = searchParams.get('secret');
        const expectedSecret = process.env.CRON_SECRET;

        if (expectedSecret && secret !== expectedSecret) {
            console.error('Unauthorized sync attempt. Invalid or missing secret parameter.');
            return NextResponse.json(
                { error: 'Unauthorized', message: 'Invalid or missing secret parameter' },
                { status: 401 }
            );
        }

        // Fire a single lightweight event to Inngest and return immediately.
        // All heavy lifting (scraping, AI, Firestore writes) happens asynchronously
        // inside the triggerDiscoveryPipeline Inngest function.
        await inngest.send({
            name: 'scholarship/trigger-discovery',
            data: { triggeredAt: new Date().toISOString(), source: 'github-action' },
        });

        console.log('✅ Discovery pipeline triggered via Inngest event.');
        return NextResponse.json({
            success: true,
            message: 'Discovery pipeline triggered. Processing is async — check Inngest dashboard for results.',
        });
    } catch (error: any) {
        console.error('Failed to trigger discovery pipeline:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
