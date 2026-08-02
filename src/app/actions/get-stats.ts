'use server';

import { adminDb } from '@/server/db/firebase-admin';

export interface SiteStats {
  totalScholarships: number;
  totalAmount: number;
}

export async function getSiteStats(): Promise<SiteStats> {
  try {
    const snapshot = await adminDb.collection('scholarships').get();

    let totalAmount = 0;
    snapshot.forEach((doc) => {
      const amount = doc.data().amount;
      if (typeof amount === 'number' && !isNaN(amount)) {
        totalAmount += amount;
      }
    });

    return {
      totalScholarships: snapshot.size,
      totalAmount,
    };
  } catch (error) {
    console.error('[getSiteStats] Failed to fetch stats via Admin SDK:', error);
    // Gracefully degrade — never crash the landing page
    return { totalScholarships: 0, totalAmount: 0 };
  }
}
