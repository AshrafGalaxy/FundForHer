

import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator, type Firestore } from 'firebase/firestore';
import { getAuth, type Auth } from 'firebase/auth';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import { useFirebaseContext } from './provider';

// Re-export providers and context hooks
export { FirebaseProvider } from './provider';
export { FirebaseClientProvider } from './client-provider';
export { useUser } from './auth/use-user';
export { useCollection } from './firestore/use-collection';
export { useDoc } from './firestore/use-doc';
export { useMemoFirebase } from './hooks/use-memo-firebase';


// Your web app's Firebase configuration - loaded from environment variables
// NEVER hardcode these values — they are read from .env.local (local) or Vercel env vars (prod)
const requiredEnvVars = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID',
] as const;

if (typeof window !== 'undefined') {
  // Only validate on client side at runtime
  for (const key of requiredEnvVars) {
    if (!process.env[key]) {
      console.error(`⚠️ Missing Firebase env var: ${key}. Check your .env.local file.`);
    }
  }
}

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID, // optional
};


// Singleton instance holder
let firebaseInstance: { app: FirebaseApp; auth: Auth; db: Firestore; storage: FirebaseStorage } | null = null;

export const initializeFirebase = () => {
  // This function can be called multiple times, but will only initialize once.
  if (firebaseInstance) {
    return firebaseInstance;
  }

  // This check ensures we are on the client side.
  if (typeof window === 'undefined') {
    // On the server, we return a null-like object or throw an error.
    // For this app, we'll assume it's only called on client, but this is a safeguard.
    throw new Error("Firebase should only be initialized on the client side.");
  }

  const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  const db = getFirestore(app);
  const auth = getAuth(app);
  const storage = getStorage(app);

  // Create and store the singleton instance.
  firebaseInstance = { app, auth, db, storage };

  return firebaseInstance;
};

// Hooks to access the initialized instances
export const useFirebaseApp = (): FirebaseApp | null => {
  const context = useFirebaseContext();
  return context?.app ?? null;
}

export const useAuth = (): Auth | null => {
  const context = useFirebaseContext();
  return context?.auth ?? null;
}

export const useFirestore = (): Firestore | null => {
  const context = useFirebaseContext();
  return context?.db ?? null;
}

export const useStorage = (): FirebaseStorage | null => {
  const context = useFirebaseContext();
  return context?.storage ?? null;
}
