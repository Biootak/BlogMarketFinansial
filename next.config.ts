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
  // 2026-06-24: support redirecting the build/dev cache to a native
  // Linux path via NEXT_DIST_DIR. On WSL 9p mounts (/mnt/c) the
  // dev server's lockfile creation fails with EACCES because the
  // 9p protocol doesn't fully support POSIX file locking. Setting
  // NEXT_DIST_DIR=/tmp/next-dev-$USER routes the .next directory
  // (and its lockfile) to native ext4 where locking works.
  ...(process.env.NEXT_DIST_DIR ? { distDir: process.env.NEXT_DIST_DIR } : {}),
  output: 'standalone',
  reactStrictMode: true,
  // 2026-06-24: PPR moved out of `experimental.ppr` in Next.js 16; the
  // boolean top-level `cacheComponents` is the new on/off switch. Same
  // effect as the old `experimental.ppr: 'incremental'`: the static
  // shell streams first, dynamic segments (comments widget, exchange
  // rates, user-specific data) defer.
  cacheComponents: true,
  compress: true,
  poweredByHeader: false,
  // Enable static asset compression (gzip). For production behind a CDN
  // the CDN usually does this; when running standalone (e.g. `next start`)
  // we want Next to do it too so the size that the client parses is
  // smaller on cold cache.
  productionBrowserSourceMaps: true,

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
      // Cache headers برای مسیرهای عمومی سایت (HTML و RSC)
      // این کمک می‌کنه back/forward cache کار کنه و CDN بتونه
      // نسخه‌ی SSR شده رو نگه داره.
      {
        source: '/((?!api|dashboard|setup|signin|signup|_next).*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, s-maxage=300, stale-while-revalidate=86400',
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
      // 2026-06-14: pravatar.cc is used by some seed data
      // (e.g. placeholder author avatars). Add it explicitly so
      // next/image's optimizer can fetch and transform those URLs
      // rather than crashing the home page render.
      {
        protocol: 'https',
        hostname: 'i.pravatar.cc',
      },
      // 2026-06-16: picsum.photos is used by seed author cover images
      // (e.g. Profile.bgImage). Without this, /author/[id] crashes
      // with "hostname not configured under images".
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
    ],
  },

  sassOptions: {
    includePaths: [path.join(process.cwd(), 'styles')],
    silenceDeprecations: ['legacy-js-api'],
  },

  // 2026-06-14: experimental flags tuned for the public/blog
  // workload (2026-06-24: `ppr` removed — it moved to the top-level
  // `cacheComponents` flag in Next.js 16):
  //   * staleTimes: client router cache stays warm across back/
  //     forward navigations, which is the dominant nav pattern on
  //     long-form blog reading.
  //   * optimizePackageImports: tree-shakes lucide-react and
  //     react-icons, both of which are imported widely here and
  //     easily bloat the first-load JS by 100KB+ without this.
  //   * optimizeCss: explicitly OFF. Next.js 16 uses Turbopack by
  //     default for `next dev`, and Turbopack hard-wires its CSS
  //     pipeline to `lightningcss` 1.0.0-alpha.68 (Rust) — there is
  //     no Turbopack-side opt-out. That alpha build panics on the
  //     OKLCH + color-mix(in oklch, ...) tokens used in
  //     `src/app/globals.css` and `src/components/ds/styles/tokens.css`,
  //     taking down the whole dev server with "Failed to write app
  //     endpoint". `optimizeCss: false` only governs webpack, so to
  //     actually keep the PostCSS pipeline we also pass `--webpack`
  //     to `next dev` (see package.json). Revisit when lightningcss
  //     hits a stable release — at that point we can drop the
  //     `--webpack` flag and let Turbopack handle CSS again.
  experimental: {
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
    optimizePackageImports: ['lucide-react', 'react-icons'],
    optimizeCss: false,
  },

  // 2026-06-14: keepAlive on the global HTTP agent. Re-establishing
  // TLS to Sentry, image optimizers and external APIs on every
  // request is one of the most common cold-start costs in Node.
  httpAgentOptions: {
    keepAlive: true,
  },

  transpilePackages: ['@aws-sdk/client-s3', '@aws-sdk/s3-request-presigner', 'framer-motion'],

  // 2026-06-25: cssnano-simple crashes on `@property` at-rules and OKLCH
  // color tokens in globals.css. Until Next.js ships a compatible CSS
  // minimizer, we disable CSS minification in webpack builds. JS is still
  // minified by Terser; CSS is served gzip/brotli by the CDN/server.
  webpack: (config) => {
    if (config.optimization?.minimizer) {
      config.optimization.minimizer = config.optimization.minimizer.filter(
        (plugin: { constructor?: { name?: string } }) =>
          plugin?.constructor?.name !== 'CssMinimizerPlugin',
      );
    }
    return config;
  },
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
