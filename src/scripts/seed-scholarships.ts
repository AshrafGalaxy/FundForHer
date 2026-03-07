import * as dotenv from 'dotenv';
// Load environment variables from .env.local file so firebase-admin can pick them up
dotenv.config({ path: '.env.local' });

import { getMockScholarships } from '../lib/scholarship-data';
import { upsertScholarship } from '@/server/db/scholarship-firestore';

async function seed() {
    console.log('🌱 Starting to seed scholarships from mock data to Firestore...');
    const scholarships = getMockScholarships();

    let count = 0;
    for (const scholarship of scholarships) {
        try {
            // Remove 'id' and 'lastUpdated' as upsertScholarship handles them
            const { id, lastUpdated, ...data } = scholarship;

            const insertData = {
                ...data,
                status: data.status as 'Live' | 'Upcoming' | 'Always Open'
            };

            await upsertScholarship(insertData);
            console.log(`✅ Seeded: ${scholarship.title}`);
            count++;
        } catch (error) {
            console.error(`❌ Failed to seed: ${scholarship.title}`, error);
        }
    }

    console.log(`\n🎉 Successfully seeded ${count} scholarships out of ${scholarships.length}.`);
    process.exit(0);
}

seed();
