import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  try {
    if (process.env.FIREBASE_PRIVATE_KEY) {

      let parsedKey = process.env.FIREBASE_PRIVATE_KEY;
      if (parsedKey.startsWith('"') && parsedKey.endsWith('"')) {
        parsedKey = parsedKey.slice(1, -1);
      }
      parsedKey = parsedKey.replace(/\\n/g, '\n');

      // Use explicit credentials if provided via env vars
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: parsedKey,
        }),
      });
      console.log('Firebase Admin initialized with explicit credentials');
    } else {
      // Fall back to application default credentials (e.g. GOOGLE_APPLICATION_CREDENTIALS)
      admin.initializeApp();
      console.log('Firebase Admin initialized with Application Default Credentials');
    }
  } catch (error: any) {
    console.error('Firebase Admin initialization error', error);
  }
}

export const adminDb = admin.firestore();
export const adminAuth = admin.auth();
