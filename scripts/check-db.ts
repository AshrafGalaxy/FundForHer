import { adminDb } from '../src/server/db/firebase-admin';

async function checkDatabase() {
    console.log("=== CHECKING FIRESTORE FOR NEW SCHOLARSHIPS ===");
    
    // Check scraper runs
    const runsSnapshot = await adminDb.collection('scraper_runs').orderBy('runAt', 'desc').limit(3).get();
    console.log(`\nRecent Scraper Runs: ${runsSnapshot.size}`);
    runsSnapshot.forEach(doc => {
        const data = doc.data();
        console.log(`- Run at: ${data.runAt.toDate()}`);
        console.log(`  Inserted: ${data.scholarshipsInserted}, Updated: ${data.scholarshipsUpdated}`);
        console.log(`  Discovered: ${data.urlsDiscovered}, Errors: ${data.errorsCount}`);
    });

    // Check recent scholarships
    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - 1); // last 24 hours
    
    const scholarshipsSnapshot = await adminDb.collection('scholarships')
        .orderBy('lastUpdated', 'desc')
        .limit(5)
        .get();
        
    console.log(`\nRecently Updated Scholarships:`);
    if (scholarshipsSnapshot.empty) {
        console.log("No scholarships found.");
    } else {
        scholarshipsSnapshot.forEach(doc => {
            const data = doc.data();
            console.log(`- [${data.provider}] ${data.title}`);
            console.log(`  Status: ${data.status} | Last Updated: ${data.lastUpdated.toDate()}`);
        });
    }
}

checkDatabase().catch(console.error);
