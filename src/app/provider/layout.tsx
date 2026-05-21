// src/app/provider/layout.tsx
// Root provider layout — intentionally minimal.
// The (protected) sub-layout handles the sidebar and auth guard.
// This file must NOT render a SidebarNav (that causes the double-sidebar bug).
import type { ReactNode } from 'react';

export default function ProviderRootLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
