import path from 'node:path';
import { withSentryConfig } from '@sentry/nextjs';
import type { NextConfig } from 'next';

// 2026-06-14: Content Security Policy — تمیزتر، با allowlist دقیق برای
// Sentry loader، Telegram bot API، و سرویس‌دهنده‌های embed ویدیو. در dev
// مجاز نمی‌کنیم چون next-themes و HMR script نیاز به unsafe-eval دارند که
// در prod لازم نیست. Vazirmatn از 2026-06-28 self-hosted است.
const isProd = process.env.NODE_ENV === 'production';

const ContentSecurityPolicy = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' https://*.sentry.io ${isProd ? '' : "'unsafe-eval'"};
  style-src 'self' 'unsafe-inline';
  img-src 'self' blob: data:
    https://images.pexels.com
    https://images.unsplash.com
    https://*.storage.c2.liara.space
    https://avatar.vercel.sh
    https://lh3.googleusercontent.com
    https://avatars.githubusercontent.com
    https://cdn.jsdelivr.net
    https://i.pravatar.cc
    https://picsum.photos
    https://placehold.co;
  font-src 'self' data:;
  connect-src 'self' https://*.sentry.io https://api.telegram.org https://api.exir.io wss: ws:;
  frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com https://www.aparat.com;
  media-src 'self' https: blob:;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'self';
  ${isProd ? 'upgrade-insecure-requests;' : ''}
`
  .replace(/\s{2,}/g, ' ')
  .trim();

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
  // 2026-06-29: cacheComponents (PPR) disabled. With it on, the static shell
  // streamed while dynamic holes (e.g. the auth-aware header) deferred — but
  // it also forced every prerendered page to connect to the DB at build time.
  // With it off, pages that read request data (the (site) header calls auth(),
  // dashboard is force-dynamic, setup reads headers()) are simply rendered on
  // demand, so `next build` needs no DB connection. Public-page performance
  // comes from safeCache + the CDN `s-maxage` header above.
  cacheComponents: false,
  compress: true,
  poweredByHeader: false,
  // Enable static asset compression (gzip). For production behind a CDN
  // the CDN usually does this; when running standalone (e.g. `next start`)
  // we want Next to do it too so the size that the client parses is
  // smaller on cold cache.
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
      // 2026-06-30: Setup page must NEVER be cached. It bootstraps the
      // OWNER account, accepts credentials, and exposes the OWNER email
      // on the "already configured" branch — any caching layer (browser
      // back/forward, CDN, shared proxy) would leak that state to the
      // next visitor on the same machine. Same goes for signin/signup.
      {
        source: '/setup/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, private, max-age=0',
          },
          { key: 'Pragma', value: 'no-cache' },
          { key: 'Expires', value: '0' },
        ],
      },
      {
        source: '/signin/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, private, max-age=0',
          },
        ],
      },
      {
        source: '/signup/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, private, max-age=0',
          },
        ],
      },
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
          // #24 fix: X-XSS-Protection deprecated — Chrome این هدر را نادیده می‌گیرد.
          // CSP (Content-Security-Policy) که بالاتر تعریف شده، جایگزین کافی است.
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

  // Turbopack configuration — dev only.
  // `next dev` uses Turbopack (default since Next.js 16). The previous
  // lightningcss alpha panic on OKLCH/color-mix tokens is resolved for
  // dev (PostCSS uses lightningcss 1.30.2 from npm). However, `next build`
  // still uses the lightningcss alpha embedded in the Turbopack binary
  // which panics on `color-mix(in oklch, ...)`, so `build` runs with
  // `--webpack` until Turbopack bundles a stable lightningcss.
  turbopack: {
    resolveAlias: {
      // Suppress source map warnings from node_modules
    },
  },

  images: {
    // 2026-06-27: `images.unsplash.com` resolves to a public IPv6
    // address (`2001:4188:2:600:10:10:34:36`) whose `10:10:34:36`
    // segment is falsely matched as the private IPv4 `10.10.34.36`
    // by Next.js 16's SSRF guard, blocking the image fetch.
    // `dangerouslyAllowPrivateIPs` was removed in Next.js 16.
    // The dev script sets `NODE_OPTIONS=--dns-result-order=ipv4first`
    // so Node prefers IPv4 A-records, sidestepping the bug in dev.
    // Production (Vercel edge optimizer) is unaffected.
    // When the dev machine cannot reach remote image hosts (e.g.
    // network restrictions), skip the Image Optimization fetch so the
    // server does not log ECONNRESET errors on every remote image.
    unoptimized: process.env.NODE_ENV === 'development',
    // افزایش timeout برای لود تصاویر — images are effectively immutable,
    // so cache the optimizer result for a full day instead of 60s.
    minimumCacheTTL: 86400,
    // فرمت‌های مجاز
    formats: ['image/avif', 'image/webp'],
    // محدودیت سایز دستگاه‌ها
    // 2026-08-02: hero/deferred sections request w=1600 — without it the
    // optimizer 400s and the hero image never loads (LCP falls back to a
    // text node). 1600 is a real device width for 2x mobile / 1x laptop.
    deviceSizes: [640, 750, 828, 1080, 1200, 1600, 1920],
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
      // 2026-07-09: placehold.co is used by seed advertisements
      // (seed.js seedAdvertisements). Without it, the home/ads section
      // crashes at runtime with "hostname not configured".
      {
        protocol: 'https',
        hostname: 'placehold.co',
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
  //   * optimizeCss: explicitly OFF. Only governs webpack fallback
  //     builds. Turbopack (now the default) uses its own CSS pipeline
  //     via lightningcss 1.30.2 (stable) — the previous alpha panic
  //     on OKLCH/color-mix tokens is resolved. Kept OFF as a
  //     precaution for any `next build --webpack` fallback.
  experimental: {
    // 2026-07-06: route handlers handle our image uploads (max 10MB).
    // Server Actions cap at 1MB by default; we don't use them for upload
    // today, but the setting future-proofs any action-based upload path
    // someone wires up later. 12MB = 2MB headroom over MAX_FILE_SIZE.
    // (In Next 16 `serverActions` lives under `experimental`, not at top
    // level — that's why this nested placement exists.)
    serverActions: {
      bodySizeLimit: '12mb',
    },
    // 2026-07-06: Next 15.5+ added an internal proxy that silently
    // truncates binary bodies over 1MB unless this is set explicitly.
    // Keep in sync with `experimental.serverActions.bodySizeLimit` above.
    proxyClientMaxBodySize: '12mb',
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
    // 2026-07-29: staticGeneration concurrency dialed to SAFE values.
    // Each worker builds its OWN PrismaClient (the singleton only helps
    // within one worker, not across workers). With connection_limit=3
    // in production, 8 concurrent workers would try to open 8 connections
    // simultaneously, collapsing any database under ~30 max_connections.
    // Retry = 0 (fail fast — no point retrying a DB timeout).
    // Concurrency = 1 (build pages one at a time — doubly safe with DB).
    // MinPagesPerWorker = 50 (fewer workers = fewer total connections).
    staticGenerationRetryCount: 0,
    staticGenerationMaxConcurrency: 1,
    staticGenerationMinPagesPerWorker: 50,
    optimizePackageImports: [
      'lucide-react',
      'react-icons',
      'date-fns',
      'date-fns-jalali',
      '@radix-ui/react-avatar',
      '@radix-ui/react-checkbox',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-popover',
      '@radix-ui/react-scroll-area',
      '@radix-ui/react-select',
      '@radix-ui/react-tabs',
      '@radix-ui/react-toast',
      '@radix-ui/react-tooltip',
    ],
    optimizeCss: false,
    // 2026-08-03: CSS chunking 'strict' — جلوی نشت CSS ماژول‌های dashboard
    // (ObservabilityHub/ApprovalsHub/SessionGuard ~250KB) به صفحات عمومی را
    // می‌گیرد. Turbopack به‌صورت پیش‌فرض CSS همهٔ مسیرها را در صفحات استاتیک
    // ادغام می‌کند؛ 'strict' هر مسیر را جدا نگه می‌دارد (render-blocking CSS
    // هوم‌پیج از ~1.2MB به ~850KB می‌رسد).
    cssChunking: 'strict',
    // 2026-06-27: Turbopack's embedded lightningcss 1.0.0-alpha.70 panics on
    // some oklch()/color-mix() constructs in globals.css. Excluding the polar
    // color features from transpilation lets the CSS pass through unchanged,
    // avoiding the parser/transformer panic while keeping modern browsers that
    // natively support oklch().
    // NOTE: useLightningcss is only valid with Turbopack (dev). Production
    // build uses webpack (`next build --webpack`) and this flag conflicts with
    // PostCSS plugins, so we disable it in production.
    useLightningcss: process.env.NODE_ENV !== 'production',
    lightningCssFeatures:
      process.env.NODE_ENV !== 'production'
        ? {
            exclude: ['oklab-colors', 'lab-colors', 'color-function'],
          }
        : undefined,
  },

  // 2026-06-14: keepAlive on the global HTTP agent. Re-establishing
  // TLS to Sentry, image optimizers and external APIs on every
  // request is one of the most common cold-start costs in Node.
  httpAgentOptions: {
    keepAlive: true,
  },

  // 2026-07-07: `next-auth` beta.25 imports `next/server` without the `.js`
  // extension. When Turbopack externalizes the package, Node's ESM loader
  // cannot resolve the bare specifier and throws ERR_MODULE_NOT_FOUND.
  // Bundling it via `transpilePackages` lets Turbopack resolve the import
  // through Next.js's package exports instead.
  // NOTE: keep `@auth/prisma-adapter` external — it has no `next/*` imports
  // and externalizing avoids duplicate @auth/core instances.
  serverExternalPackages: ['@auth/prisma-adapter'],

  transpilePackages: ['next-auth', '@aws-sdk/client-s3', '@aws-sdk/s3-request-presigner'],

  // 2026-06-25: cssnano-simple crashes on `@property` at-rules and OKLCH
  // color tokens in globals.css. This webpack config block is only used
  // for `next build --webpack` fallback builds; under Turbopack (default)
  // it is ignored. JS is still minified by Terser; CSS is served
  // gzip/brotli by the CDN/server.
  webpack: (config) => {
    // 2026-06-27: Disable CSS minification. `cssnano-simple` (bundled
    // inside Next.js) crashes on `@property` at-rules and some
    // `color-mix()`/`oklch()` constructs in globals.css. In next@16.2.9
    // the minimizer is a function (not a class instance), so we can't
    // filter by constructor.name. Instead we override the entire
    // minimizer list to keep only SWC/Terser (JS minification) and
    // drop the CSS minimizer function. CSS is served gzip/brotli by
    // the CDN/server, so unminified CSS only costs a few KB after
    // compression.
    if (config.optimization?.minimizer) {
      config.optimization.minimizer = config.optimization.minimizer.filter((plugin: unknown) => {
        // Class instances: filter by name
        if (plugin && typeof plugin === 'object' && 'constructor' in plugin) {
          const name = (plugin as { constructor?: { name?: string } }).constructor?.name;
          if (name === 'CssMinimizerPlugin') return false;
        }
        // Functions: check if the function source references cssnano
        if (typeof plugin === 'function') {
          const src = plugin.toString();
          if (src.includes('CssMinimizerPlugin') || src.includes('cssnano')) {
            return false;
          }
        }
        return true;
      });
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
