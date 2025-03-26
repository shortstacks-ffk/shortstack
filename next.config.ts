// Next configuration file
// import type { NextConfig } from "next";

// const nextConfig: NextConfig = {
//   devIndicators: false,
//   // devIndicators: {
//   //   // Disable the build indicator
//   //   appIsrStatus: false,
//   // },
// };

// export default nextConfig;


/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: false,
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: [
      'clerk.com', 
      'images.clerk.dev',
      'storage.googleapis.com'
    ]
  },
  output: 'standalone',
  webpack: (config) => {
    // Handle Google API issues
    config.resolve.fallback = { 
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false
    };
    return config;
  }
}

module.exports = nextConfig