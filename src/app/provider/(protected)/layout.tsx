// src/app/provider/(protected)/layout.tsx
'use client';

import { useAuth } from '@/app/auth-provider';
import { Loader2 } from 'lucide-react';
import { SidebarNav } from '@/components/ui/SidebarNav';

export default function ProviderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const authContext = useAuth();

  // auth-provider.tsx handles all redirects (unauthenticated + wrong-role).
  // Show loading state while it resolves.
  if (!authContext || authContext.loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-16 w-16 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading Provider Dashboard...</p>
        </div>
      </div>
    );
  }

  // If the role guard allowed us here, user is confirmed as a provider.
  return (
    <div className="flex min-h-screen bg-background relative selection:bg-primary/20">
      <SidebarNav isProvider={true} />
      <div className="flex-1 w-full min-w-0">
        <main className="w-full relative">{children}</main>
      </div>
    </div>
  );
}
