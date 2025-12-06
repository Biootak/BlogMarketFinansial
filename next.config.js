// biome-ignore lint/style/useNodejsImportProtocol: <explanation>
const path = require('path');

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  compress: true,
  poweredByHeader: false,
  productionBrowserSourceMaps: false,

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

  experimental: {
    serverActions: {
      bodySizeLimit: '3mb',
    },
    optimizeCss: true,
  },

  sassOptions: {
    includePaths: [path.join(__dirname, 'styles')],
  },

  httpAgentOptions: {
    keepAlive: true,
  },

  transpilePackages: ['@aws-sdk/client-s3', '@aws-sdk/s3-request-presigner', 'framer-motion'],
};

module.exports = withBundleAnalyzer(nextConfig);
