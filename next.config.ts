import type { NextConfig } from 'next';
import path from 'path';
import { withSentryConfig } from '@sentry/nextjs';

// 2026-06-14: Content Security Policy — تمیزتر، با allowlist دقیق برای
// Sentry loader، Telegram bot API، font CDNهای Vazirmatn و سرویس‌دهنده‌های
// embed ویدیو. در dev مجاز نمی‌کنیم چون next-themes و HMR script نیاز به
// unsafe-eval دارند که در prod لازم نیست.
const isProd = process.env.NODE_ENV === 'production';

const ContentSecurityPolicy = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' https://*.sentry.io ${isProd ? '' : "'unsafe-eval'"};
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  img-src 'self' blob: data: https: http:;
  font-src 'self' data: https://fonts.gstatic.com;
  connect-src 'self' https://*.sentry.io https://api.telegram.org https://api.exir.io wss: ws:;
  frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com https://www.aparat.com;
  media-src 'self' https: blob:;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'self';
  ${isProd ? 'upgrade-insecure-requests;' : ''}
`.replace(/\s{2,}/g, ' ').trim();

const nextConfig: NextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  compress: true,
  poweredByHeader: false,

  // Disable source maps in development to avoid warnings
  productionBrowserSourceMaps: false,

  // Rewrites برای serve کردن فایل‌های آپلود شده در production
  async rewrites() {
    return [
      {
        source: '/uploads/:path*',
        destination: '/api/uploads/:path*',
      },
    ];
  },

  // Security headers
  async headers() {
    return [
      // Cache headers برای تصاویر آپلود شده
      {
        source: '/uploads/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          // HSTS فقط در production فعال باشه
          ...(process.env.NODE_ENV === 'production'
            ? [
                {
                  key: 'Strict-Transport-Security',
                  value: 'max-age=63072000; includeSubDomains; preload',
                },
              ]
            : []),
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          // 2026-06-14: CSP فعال شد. برای dev شل‌گیر است (بدون
          // upgrade-insecure-requests و با unsafe-eval) تا HMR کار
          // کند. در prod سخت‌گیرانه.
          {
            key: 'Content-Security-Policy',
            value: ContentSecurityPolicy,
          },
        ],
      },
    ];
  },

  // Turbopack configuration
  turbopack: {
    resolveAlias: {
      // Suppress source map warnings from node_modules
    },
  },

  images: {
    // افزایش timeout برای لود تصاویر
    minimumCacheTTL: 60,
    // فرمت‌های مجاز
    formats: ['image/avif', 'image/webp'],
    // محدودیت سایز دستگاه‌ها
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
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
        hostname: '*.storage.c2.liara.space',
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

// Sentry configuration
const sentryWebpackPluginOptions = {
  // سازمان و پروژه Sentry
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // فقط در production آپلود کن
  silent: !process.env.CI,

  // تنظیمات source maps
  widenClientFileUpload: true,
  hideSourceMaps: true,

  // غیرفعال کردن در development
  disableLogger: true,

  // تنظیمات tunneling برای دور زدن ad blockers
  tunnelRoute: '/monitoring',
};

// 2026-06-14: Sentry فقط وقتی wrap می‌شود که هم DSN ست شده باشد و هم
// در production باشیم. قبلاً در dev هم wrap می‌شد و یک middleware
// اضافی روی هر request می‌گذاشت. حالا dev بدون Sentry اجرا می‌شود
// که TTFB را در محیط توسعه بهتر می‌کند.
const shouldWrapSentry =
  Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN) && process.env.NODE_ENV === 'production';

export default shouldWrapSentry
  ? withSentryConfig(nextConfig, sentryWebpackPluginOptions)
  : nextConfig;
