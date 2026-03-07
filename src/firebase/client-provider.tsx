
// src/firebase/client-provider.tsx
'use client';

import { useEffect, useState, ReactNode } from 'react';
import { initializeFirebase } from '@/firebase/index';
import type { FirebaseApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import { enableNetwork, type Firestore } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { FirebaseProvider } from './provider';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

export const FirebaseClientProvider = ({ children }: FirebaseClientProviderProps) => {
  const [firebase, setFirebase] = useState<{
    app: FirebaseApp;
    auth: Auth;
    db: Firestore;
  } | null>(null);

  useEffect(() => {
    const init = async () => {
      // Check if running on the client
      if (typeof window !== 'undefined') {
        const { app, auth, db } = initializeFirebase();
        
        try {
          // Explicitly enable the network and wait for it to complete.
          // This is the key fix to prevent race conditions.
          await enableNetwork(db);
          console.log("Firebase network connection enabled.");
          setFirebase({ app, auth, db });
        } catch (err) {
          console.error("Failed to enable Firebase network:", err);
          // Handle the error state if network can't be enabled,
          // maybe show an error message to the user.
        }
      }
    };

    init();
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
