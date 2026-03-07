// src/firebase/auth/use-user.tsx
'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { useAuth as useFirebaseAuth } from '@/firebase';

export function useUser() {
  const auth = useFirebaseAuth();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (!auth) return;

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
    });

    return () => unsubscribe();
  }, [auth]);

  return user;
}
