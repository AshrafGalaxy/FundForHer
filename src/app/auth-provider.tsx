// src/app/auth-provider.tsx
'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Header } from './header';
import { useAuth as useFirebaseAuth, useFirestore } from '@/firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isProvider: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  return context;
}

// These routes do not require authentication
const PUBLIC_ROUTES = ['/', '/login', '/register', '/provider/login', '/provider/register'];

// Routes where we want to hide the global site-wide header
const HIDDEN_HEADER_ROUTES: string[] = ['/onboarding'];

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = useFirebaseAuth();
  const db = useFirestore();
  const [user, setUser] = useState<User | null>(null);
  const [isProvider, setIsProvider] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);
  const isHeaderHidden = HIDDEN_HEADER_ROUTES.includes(pathname);
  const firebaseLoading = !auth;

  const isStudentRoute = pathname.startsWith('/authenticated');
  const isProviderRoute = pathname.startsWith('/provider') && !pathname.startsWith('/provider/login') && !pathname.startsWith('/provider/register');

  useEffect(() => {
    if (firebaseLoading || !db) return;

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (!currentUser) {
        setIsProvider(false);
        if (!isPublicRoute) {
          // Redirect to the correct login page based on what they were trying to access
          router.replace(isProviderRoute ? '/provider/login' : '/login');
        }
        setLoading(false);
        return;
      }

      // ── Role check: is this user a provider? ────────────────────
      try {
        const providerSnap = await getDoc(doc(db, 'providers', currentUser.uid));
        const userIsProvider = providerSnap.exists();
        setIsProvider(userIsProvider);

        // Cross-role route guard
        if (isStudentRoute && userIsProvider) {
          // A provider trying to access student pages → send them to their dashboard
          router.replace('/provider/dashboard');
          setLoading(false);
          return;
        }
        if (isProviderRoute && !userIsProvider) {
          // A student trying to access provider pages → send them to their dashboard
          router.replace('/authenticated/dashboard');
          setLoading(false);
          return;
        }
      } catch (err) {
        // If the role check fails (network error), fall through — don't lock out the user
        console.warn('Role check failed:', err);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, [firebaseLoading, auth, db, router, pathname, isPublicRoute, isStudentRoute, isProviderRoute]);

  const contextValue = {
    user,
    loading: loading || firebaseLoading,
    isProvider,
  };

  if (loading || firebaseLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-16 w-16 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isPublicRoute && !user) {
    return (
      <div className="flex justify-center items-center h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-16 w-16 animate-spin text-primary" />
          <p className="text-muted-foreground">Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={contextValue}>
      <div className="flex flex-col min-h-screen">
        {!isHeaderHidden && <Header />}
        <main className="flex-grow">{children}</main>
      </div>
    </AuthContext.Provider>
  );
}
