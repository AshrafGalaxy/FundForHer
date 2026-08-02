import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId:   'com.fundherfuture.app',
  appName: 'Fund Her Future',
  webDir:  'out',           // ← Next.js static export target (CAPACITOR=true build)

  server: {
    androidScheme: 'https',
    // Live-reload URL for development only (comment out for production APK builds)
    // url: 'http://192.168.x.x:3000',

    // Cleartext override: when the app cannot load local assets, fall back to Vercel.
    // This is safe because the domain uses TLS. No http:// traffic is initiated.
    // The AndroidManifest.xml includes usesCleartextTraffic="false" for security.
    // url: 'https://fundherfuture.vercel.app',   // ← uncomment ONLY for remote-asset debug
  },

  android: {
    // App version tracking — bump on each release
    // These are overridden by build.gradle versionCode / versionName
    backgroundColor: '#1C0A07',  // matches splash / AppTheme dark background
  },

  plugins: {
    SplashScreen: {
      launchShowDuration:   2000,
      launchAutoHide:       true,
      backgroundColor:      '#1C0A07',
      androidSplashResourceName: 'splash',
      showSpinner:          false,
    },
    FirebaseAuthentication: {
      skipNativeAuth: false,
      providers: ['google.com', 'password'],
    },
  },
};

export default config;
