import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  compress: true,
  poweredByHeader: false,
  
  // Disable source maps in development to avoid warnings
  productionBrowserSourceMaps: false,
  
  // Turbopack configuration
  turbopack: {
    resolveAlias: {
      // Suppress source map warnings from node_modules
    },
  },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.pexels.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'biotak.storage.c2.liara.space',
      },
      {
        protocol: 'https',
        hostname: 'avatar.vercel.sh',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'cdn.jsdelivr.net',
      },
    ],
  },

  sassOptions: {
    includePaths: [path.join(process.cwd(), 'styles')],
    silenceDeprecations: ['legacy-js-api'],
  },

  transpilePackages: ['@aws-sdk/client-s3', '@aws-sdk/s3-request-presigner', 'framer-motion'],
};

export default nextConfig;
