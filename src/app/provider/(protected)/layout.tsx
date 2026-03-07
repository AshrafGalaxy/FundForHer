
// src/app/provider/(protected)/layout.tsx
'use client';

import { useAuth } from '@/app/auth-provider';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';


export default function ProviderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const authContext = useAuth();
  const router = useRouter();

  const loading = authContext ? authContext.loading : true;
  const user = authContext ? authContext.user : null;


  useEffect(() => {
    if (!loading && !user) {
      router.replace('/provider/login');
    }
  }, [loading, user, router]);


  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-16 w-16 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading Provider Dashboard...</p>
        </div>
      </div>
    );
  }

  // The actual check for whether the user *is* a provider is now handled
  // inside the ProviderDashboard page itself, preventing race conditions.

  return <>{children}</>;
}
