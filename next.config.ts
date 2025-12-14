import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {},
  
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb', // Match your upload limit
    },
  },
  
  staticPageGenerationTimeout: 120,
  
  // Remove output: 'standalone' for Vercel deployments
  // Vercel handles this automatically
};

export default nextConfig;


// Previous version for reference - BEFORE UPDATING NEXTJS AND USING TURBOPACK


// import type { NextConfig } from 'next';

// const nextConfig: NextConfig = {
//   devIndicators: false,
//   eslint: {
//     ignoreDuringBuilds: true,
//   },
//   reactStrictMode: true,
//   images: {
//     remotePatterns: [
//       {
//         protocol: 'https',
//         hostname: 'storage.googleapis.com',
//       },
//       // Add any other domains you need
//     ],
//     unoptimized: true,
//   },
//   output: 'standalone',
//   webpack: (config) => {
//     config.resolve.fallback = {
//       ...config.resolve.fallback,
//       fs: false,
//       net: false,
//       tls: false,
//     };
//     return config;
//   },
//   // Optional: Add compiler configuration if needed
//   compiler: {
//     // removeConsole: process.env.NODE_ENV === 'production',
//   },
//   // Optional: Enable experimental features if needed
//   experimental: {
//     serverActions: {}, // Using empty object to enable with default settings
//     // typedRoutes: true,
//   }
// };

// export default nextConfig;


