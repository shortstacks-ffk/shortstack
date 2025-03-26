import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'clerk.com',
      },
      {
        protocol: 'https',
        hostname: 'images.clerk.dev',
      },
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
      },
      // Add any other domains you need
    ],
    // unoptimized: false is the default, so you can remove this line
  },
  output: 'standalone',
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    return config;
  },
  // Optional: Add compiler configuration if needed
  compiler: {
    // removeConsole: process.env.NODE_ENV === 'production',
  },
  // Optional: Enable experimental features if needed
  experimental: {
    // serverActions: true, // Already enabled by default in 15.2.3
    // typedRoutes: true,
  }
};

export default nextConfig;