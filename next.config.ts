import { withSentryConfig } from '@sentry/nextjs';
import withPWAInit from "@ducanh2912/next-pwa";
import type { NextConfig } from 'next';

const isCapacitor = process.env.CAPACITOR === 'true';

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development" || isCapacitor,
  // Configure fallback routing and precache
  cacheStartUrl: true,
  dynamicStartUrl: true,
});

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: isCapacitor, // Required for static export; Vercel keeps optimization
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'www.indiaspend.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'keystoneacademic-res.cloudinary.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'protium.co.in',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'campusworld.net',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'd2w7l1p59qkl0r.cloudfront.net',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'dle9eg0t055l3.cloudfront.net',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 's3-ap-southeast-1.amazonaws.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'www.ugc.gov.in',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'internshala.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'www.maef.nic.in',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'legrandscholarship.co.in',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'maximaofficial.in',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'www.scholarshipsinindia.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  // Static export has no server, so skip server-only packages
  ...(isCapacitor
    ? { output: 'export' }
    : { serverExternalPackages: ['firebase-admin'] }
  ),
};

// For Capacitor builds, skip Sentry's server-dependent tunnelRoute
const sentryOptions = {
  org: "karan-0g",
  project: "javascript-nextjs",
  silent: !process.env.CI,
  widenClientFileUpload: true,
  ...(isCapacitor ? {} : { tunnelRoute: "/monitoring" }),
  webpack: {
    automaticVercelMonitors: true,
    treeshake: {
      removeDebugLogging: true,
    },
  },
};

export default withPWA(
  withSentryConfig(nextConfig, sentryOptions)
);

