import { NextResponse } from 'next/server';
import { getAllScholarships } from '@/server/db/scholarship-firestore';
import { algoliaClient, ALGOLIA_INDEX_NAME } from '@/lib/algolia-admin';

// Prevent caching for live data
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const scholarships = await getAllScholarships();

        // Optional query parameter filtering
        const { searchParams } = new URL(request.url);
        const q = searchParams.get('q');
        const gender = searchParams.get('gender');
        const status = searchParams.get('status');
        const location = searchParams.get('location');

        let filtered = scholarships;

        // 1. Text Search (Algolia or Fallback)
        if (q) {
            console.log(`--> Query param 'q' is set to: ${q}`);
            try {
                if (algoliaClient) {
                    console.log(`--> 🔎 Searching Algolia for: "${q}"`);
                    const response = await algoliaClient.searchSingleIndex({
                        indexName: ALGOLIA_INDEX_NAME,
                        searchParams: { query: q, hitsPerPage: 50 }
                    });
                    // Map Algolia hits back to our Scholarship type
                    const hits = response.hits || [];
                    // We extract the objectIDs to filter our fresh Firestore dataset
                    const matchedIds = new Set(hits.map((h: any) => h.objectID));
                    filtered = filtered.filter(s => matchedIds.has(s.id));
                } else {
                    // Free/Fallback fuzzy search
                    const query = q.toLowerCase();
                    filtered = filtered.filter(s =>
                        s.title.toLowerCase().includes(query) ||
                        s.provider.toLowerCase().includes(query) ||
                        (s.description && s.description.toLowerCase().includes(query))
                    );
                }
            } catch (searchErr) {
                console.error("Algolia Search Failed, using fallback", searchErr);
                const query = q.toLowerCase();
                filtered = filtered.filter(s =>
                    s.title.toLowerCase().includes(query) ||
                    s.provider.toLowerCase().includes(query) ||
                    (s.description && s.description.toLowerCase().includes(query))
                );
            }
        }

        // 2. Exact Filters
        if (gender && gender !== 'all') {
            filtered = filtered.filter(s => s.gender?.toLowerCase() === gender.toLowerCase() || s.gender?.toLowerCase() === 'all');
        }

        if (status && status !== 'all') {
            filtered = filtered.filter(s => s.status?.toLowerCase() === status.toLowerCase());
        }

        if (location && location !== 'india') {
            filtered = filtered.filter(s => s.location?.toLowerCase() === location.toLowerCase() || s.location?.toLowerCase() === 'india');
        }

        console.log(`--> Sending back ${filtered.length} filtered scholarships.`);
        return NextResponse.json(filtered);
    } catch (error: any) {
        console.error('--> ❌ OUTER FATAL ERROR in GET /api/scholarships:', error);
        return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 });
    }
}
