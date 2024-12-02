// biome-ignore lint/style/useNodejsImportProtocol: <explanation>
const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  typescript: {
    ignoreBuildErrors: false,
  },

  swcMinify: true,
  compress: true,
  productionBrowserSourceMaps: false,
  optimizeFonts: true,

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
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    unoptimized: process.env.NODE_ENV === 'development',
    formats: ['image/webp'],
    loader: 'default',
    domains: ['biotak.storage.c2.liara.space'],
  },

  experimental: {
    serverActions: {
      bodySizeLimit: '5mb',
    },
    optimizeCss: true,
    optimizePackageImports: ['@/components'],
    turbo: {
      rules: {
        '*.svg': ['@svgr/webpack'],
      },
    },
    scrollRestoration: true,
    optimizeServerReact: true,
  },

  onDemandEntries: {
    maxInactiveAge: 60 * 60 * 1000,
    pagesBufferLength: 5,
  },

  webpack: (config, { isServer, dev }) => {
    if (!isServer && !dev) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
      
      // Optimize CSS splitting
      config.optimization.splitChunks.cacheGroups.styles = {
        name: 'styles',
        test: /\.(css|scss)$/,
        chunks: 'all',
        enforce: true,
        priority: 20,
      };

      // Add Terser for better minification
      config.optimization.minimize = true;
      config.optimization.minimizer.push(
        new TerserPlugin({
          terserOptions: {
            compress: {
              drop_console: true,
            },
            output: {
              comments: false,
            },
          },
        })
      );
    }
    return config;
  },

  sassOptions: {
    includePaths: [path.join(__dirname, 'styles')],
  },

  transpilePackages: ['@aws-sdk/client-s3', '@aws-sdk/s3-request-presigner', 'framer-motion'],

  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
        ],
      },
    ];
  },

  // Redirects if needed
  async redirects() {
    return [];
  },

  // Rewrites if needed
  async rewrites() {
    return [];
  },
};

module.exports = nextConfig;
