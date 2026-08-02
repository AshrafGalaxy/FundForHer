
// src/firebase/client-provider.tsx
'use client';

import { useEffect, useState, ReactNode } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { FirebaseProvider } from './provider';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

interface FirebaseClientProviderProps {
  children: ReactNode;
}

export const FirebaseClientProvider = ({ children }: FirebaseClientProviderProps) => {
  const [firebase, setFirebase] = useState<any>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const storage = getStorage(app);

    // Priority 2: initializeFirestore with IndexedDB persistence.
    // After the first load, ALL reads are served from the local IndexedDB cache —
    // subsequent navigations and page reloads cost ZERO Firestore reads for cached docs.
    // persistentMultipleTabManager shares the cache across all open browser tabs.
    const db = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    });

    setFirebase({ app, auth, db, storage });
  }, []);

  if (!firebase) {
    return (
      <div className="flex justify-center items-center h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-16 w-16 animate-spin text-primary" />
          <p className="text-muted-foreground">Initializing App...</p>
        </div>
      </div>
    );
  }

  return (
    <FirebaseProvider value={firebase}>
      {children}
    </FirebaseProvider>
  );
};
