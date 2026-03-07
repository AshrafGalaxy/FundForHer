
// src/app/layout.tsx
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/components/ThemeProvider';
import AuthProvider from './auth-provider';
import { BackToTop } from '@/components/ui/BackToTop';
import { FirebaseClientProvider } from '@/firebase/client-provider';
<<<<<<< HEAD
import InstallAppWidget from '@/components/pwa/InstallAppWidget';
=======
import { SpeedInsights } from '@vercel/speed-insights/next';
>>>>>>> a16c158be60850b7fb26cd1e5e940012dc77c254


import { Viewport } from 'next';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#FF7F50" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&family=PT+Sans:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body antialiased" suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <FirebaseClientProvider>
            <AuthProvider>
              {children}
              <InstallAppWidget />
            </AuthProvider>
          </FirebaseClientProvider>
          <Toaster />
          <BackToTop />
        </ThemeProvider>
        <SpeedInsights />
      </body>
    </html>
  );
}
