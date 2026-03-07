
// src/app/authenticated/layout.tsx
'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Header } from './header';
import { useAuth as useFirebaseAuth } from '@/firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  return context;
}

// These routes do not require authentication
const PUBLIC_ROUTES = ['/', '/login', '/register', '/provider/login', '/provider/register'];

// Routes where we want to hide the global site-wide header (e.g., Dashboard with its own navigation)
const HIDDEN_HEADER_ROUTES = ['/authenticated/dashboard'];

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = useFirebaseAuth();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);
  const isHeaderHidden = HIDDEN_HEADER_ROUTES.includes(pathname);
  const firebaseLoading = !auth;

  useEffect(() => {
    if (firebaseLoading) return;

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        if (!isPublicRoute) {
          router.replace('/login');
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [firebaseLoading, auth, router, pathname, isPublicRoute]);


  const contextValue = {
    user,
    loading: loading || firebaseLoading,
  };

  if (loading || firebaseLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-16 w-16 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isPublicRoute && !user) {
    return (
      <div className="flex justify-center items-center h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-16 w-16 animate-spin text-primary" />
          <p className="text-muted-foreground">Redirecting...</p>
        </div>
      </div>
    )
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
