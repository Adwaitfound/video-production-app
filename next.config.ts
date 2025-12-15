import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,
  // Enable static export for Next.js 16+
  output: 'export',
  // Suppress hydration warnings from Radix UI dynamic IDs
  logging: {
    fetches: {
      fullUrl: false,
    },
  },
};

export default nextConfig;
