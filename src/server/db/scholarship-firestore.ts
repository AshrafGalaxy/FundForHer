import { adminDb } from './firebase-admin';
import type { Scholarship } from '@/lib/types';
import { algoliaClient, ALGOLIA_INDEX_NAME } from '@/lib/algolia-admin';

export const SCHOLARSHIPS_COLLECTION = 'scholarships';
export const SCRAPER_RUNS_COLLECTION = 'scraper_runs';

// ─────────────────────────────────────────────
// VALIDATION
// ─────────────────────────────────────────────

export interface ValidationResult {
    valid: boolean;
    reasons: string[];
}

/**
 * Validates a parsed scholarship before writing to Firestore.
 * Rejects garbage AI output: empty titles, past deadlines, negative amounts.
 */
export function validateScholarship(
    scholarship: Omit<Scholarship, 'id' | 'lastUpdated'>
): ValidationResult {
    const reasons: string[] = [];

    if (!scholarship.title || scholarship.title.trim().length < 5) {
        reasons.push('Title is missing or too short');
    }
    if (!scholarship.provider || scholarship.provider.trim().length < 2) {
        reasons.push('Provider is missing');
    }
    if (scholarship.amount != null && scholarship.amount < 0) {
        reasons.push('Amount is negative');
    }

    // Reject past-deadline scholarships (with 1-day grace period)
    if (scholarship.deadline) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const deadline = scholarship.deadline instanceof Date
            ? scholarship.deadline
            : new Date(scholarship.deadline as any);
        if (!isNaN(deadline.getTime()) && deadline < yesterday) {
            reasons.push(`Deadline already passed: ${deadline.toDateString()}`);
        }
    }

    return { valid: reasons.length === 0, reasons };
}

// ─────────────────────────────────────────────
// FETCH
// ─────────────────────────────────────────────

/**
 * Fetch all scholarships from Firestore.
 * Safely converts Firestore Timestamp objects to JavaScript Date objects.
 */
export async function getAllScholarships(): Promise<Scholarship[]> {
    const snapshot = await adminDb.collection(SCHOLARSHIPS_COLLECTION).get();

    return snapshot.docs.map(doc => {
        const data = doc.data();
        const toDate = (val: any): Date => {
            if (!val) return new Date(0);
            if (val instanceof Date) return val;
            if (val?.toDate) return val.toDate();
            return new Date(val);
        };
        return {
            id: doc.id,
            title: data.title,
            provider: data.provider,
            amount: data.amount,
            deadline: toDate(data.deadline),
            description: data.description,
            eligibility: data.eligibility,
            fieldOfStudy: data.fieldOfStudy || [],
            location: data.location || 'india',
            eligibilityLevel: data.eligibilityLevel || [],
            scholarshipType: data.scholarshipType,
            isFeatured: !!data.isFeatured,
            lastUpdated: toDate(data.lastUpdated),
            status: data.status || 'Live',
            gender: data.gender || 'Female',
            religion: data.religion || 'all',
            officialLink: data.officialLink,
            providerLogo: data.providerLogo,
        } as Scholarship;
    });
}

// ─────────────────────────────────────────────
// DEDUPLICATION
// ─────────────────────────────────────────────

/**
 * Checks if a URL already exists in the database.
 * Prevents burning Firecrawl + Gemini credits on already-processed pages.
 */
export async function isUrlAlreadyKnown(sourceUrl: string): Promise<boolean> {
    if (!sourceUrl) return false;
    const snapshot = await adminDb
        .collection(SCHOLARSHIPS_COLLECTION)
        .where('officialLink', '==', sourceUrl)
        .limit(1)
        .get();
    return !snapshot.empty;
}

// ─────────────────────────────────────────────
// UPSERT (with validation)
// ─────────────────────────────────────────────

export interface UpsertResult {
    id: string;
    action: 'inserted' | 'updated' | 'skipped';
    reason?: string;
}

/**
 * Validates, deduplicates, then inserts or updates a scholarship.
 */
export async function upsertScholarship(
    scholarship: Omit<Scholarship, 'id' | 'lastUpdated'>
): Promise<UpsertResult> {

    // Gate 1: Validate scholarship quality
    const validation = validateScholarship(scholarship);
    if (!validation.valid) {
        console.warn(`⚠️ Skipping invalid scholarship "${scholarship.title}": ${validation.reasons.join(', ')}`);
        return { id: '', action: 'skipped', reason: validation.reasons.join(', ') };
    }

    // Gate 2: Deduplicate by title + provider
    const querySnapshot = await adminDb
        .collection(SCHOLARSHIPS_COLLECTION)
        .where('title', '==', scholarship.title)
        .where('provider', '==', scholarship.provider)
        .limit(1)
        .get();

    const insertData = { ...scholarship, lastUpdated: new Date() };

    if (querySnapshot.empty) {
        const docRef = await adminDb.collection(SCHOLARSHIPS_COLLECTION).add(insertData);
        await syncToAlgolia(docRef.id, insertData);
        console.log(`✅ Inserted: "${scholarship.title}"`);
        return { id: docRef.id, action: 'inserted' };
    } else {
        const docId = querySnapshot.docs[0].id;
        await adminDb.collection(SCHOLARSHIPS_COLLECTION).doc(docId).update(insertData);
        await syncToAlgolia(docId, insertData);
        console.log(`🔄 Updated: "${scholarship.title}"`);
        return { id: docId, action: 'updated' };
    }
}

// ─────────────────────────────────────────────
// CLEANUP CRON SUPPORT
// ─────────────────────────────────────────────

/**
 * Marks past-deadline scholarships as 'Expired' in a single Firestore batch.
 * Called by the nightly cleanup cron (3 AM IST).
 */
export async function markExpiredScholarships(): Promise<number> {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const snapshot = await adminDb
        .collection(SCHOLARSHIPS_COLLECTION)
        .where('status', '==', 'Live')
        .where('deadline', '<', yesterday)
        .get();

    if (snapshot.empty) return 0;

    const batch = adminDb.batch();
    snapshot.docs.forEach(doc => {
        batch.update(doc.ref, { status: 'Expired', lastUpdated: new Date() });
    });
    await batch.commit();

    console.log(`🗑️ Marked ${snapshot.size} scholarships as Expired.`);
    return snapshot.size;
}

// ─────────────────────────────────────────────
// OBSERVABILITY / RUN LOGGING
// ─────────────────────────────────────────────

export interface ScraperRunLog {
    runAt: Date;
    urlsDiscovered: number;
    urlsSkippedDuplicate: number;
    scholarshipsInserted: number;
    scholarshipsUpdated: number;
    scholarshipsSkippedInvalid: number;
    expiredMarked: number;
    errorsCount: number;
    errorMessages: string[];
    durationSeconds: number;
}

/**
 * Writes a pipeline run summary to the `scraper_runs` Firestore collection.
 */
export async function logScraperRun(log: ScraperRunLog): Promise<void> {
    try {
        await adminDb.collection(SCRAPER_RUNS_COLLECTION).add(log);
        console.log(`📊 Pipeline run logged.`);
    } catch (err) {
        console.error('Failed to log scraper run:', err);
    }
}

// ─────────────────────────────────────────────
// ALGOLIA SYNC (internal)
// ─────────────────────────────────────────────

async function syncToAlgolia(objectID: string, data: any) {
    if (!algoliaClient) return;
    try {
        const algoliaRecord = {
            ...data,
            objectID,
            deadline: data.deadline instanceof Date ? data.deadline.getTime() : data.deadline,
            lastUpdated: data.lastUpdated instanceof Date ? data.lastUpdated.getTime() : data.lastUpdated,
        };
        await algoliaClient.saveObject({ indexName: ALGOLIA_INDEX_NAME, body: algoliaRecord });
        console.log(`🔎 Synced [${objectID}] to Algolia.`);
    } catch (e) {
        console.error(`Algolia sync failed for ${objectID}`, e);
    }
}
