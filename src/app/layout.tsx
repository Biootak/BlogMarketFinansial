/**
 * @file Root layout (server component)
 *
 * Auth is opt-in per route — we do NOT await `auth()` here because every
 * public page would pay the cost of loading the next-auth runtime
 * (and bcrypt + PrismaAdapter) just to pass `session` to a client
 * `SessionProvider` that doesn't need it on first paint.
 *
 * Session is fetched on demand client-side via `useSession()` (auto-fetch),
 * so `<Providers>` is mounted WITHOUT a `session` prop. The initial render
 * is `status: "loading"` until the auto-fetch resolves; components that
 * need server-side session data (e.g. `MainNav` for sign-in/avatar gating)
 * call `auth()` themselves in their server-component path.
 */
import { Toaster } from '@/components/ui/toaster';
import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import Script from 'next/script';

import './globals.css';
// 2026-08-05 perf: `index.scss` (22KB SCSS → ~35KB compiled CSS) moved from
// the ROOT layout to the `(site)` layout. The legacy NC theme styles
// (header glass, RTL overrides, card animations, loading spinners) are only
// used by public marketing/blog pages. Loading them on auth, setup,
// dashboard, error, and maintenance pages added ~35KB of render-blocking
// CSS to pages that never render a single NC class. The `(site)` layout
// wraps all public routes, so those pages still get the styles.

import PageViewTracker from '@/components/PageViewTracker';
import Providers from '@/components/providers';
import STRIP_EXTENSION_ATTRS_SCRIPT from '@/lib/strip-extension-attrs';

/* ============================================================================
   SEO Metadata (vercel.com-style defaults)
   ----------------------------------------------------------------------------
   - Locale-aware Open Graph & Twitter cards.
   - Canonical URL is exposed via metadataBase.
   - Per-page overrides are merged by Next.js automatically.
   ============================================================================ */
import { getSiteIdentity } from '@/lib/site-identity';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://financialmarket.page';

export async function generateMetadata(): Promise<Metadata> {
  const { siteName, siteDescription } = await getSiteIdentity();
  const title = siteName || 'بازارهای مالی';
  const description =
    siteDescription ||
    'پلتفرم مورد اعتماد شما در Financial Market — تحلیل، آموزش و اخبار لحظه‌ای ارزهای دیجیتال، طلا، بورس و بازار جهانی.';

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: `${title} | پلتفرم تحلیل و آموزش بازارهای مالی`,
      template: `%s | ${title}`,
    },
    description,
    applicationName: title,
    keywords: [
      'Financial Market',
      'ارز دیجیتال',
      'بیت کوین',
      'طلا',
      'بورس',
      'تحلیل تکنیکال',
      'آموزش ترید',
    ],
    authors: [{ name: siteName || 'BlogMarketFinansial' }],
    creator: siteName || 'BlogMarketFinansial',
    robots: { index: true, follow: true },
    sitemap: '/sitemap.xml',
  } as Metadata;
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f7f8fa' },
    { media: '(prefers-color-scheme: dark)', color: '#14171f' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

/**
 * Estedad — Persian/Arabic variable font v5.3.0 (fontsource, MIT).
 * Two separate woff2 subsets — browser loads ONLY the needed file per glyph:
 *   arabic: 55.7 KB  → فارسی/عربی (unicode-range baked into woff2)
 *   latin:  26.5 KB  → A-Z, 0-9, punctuation (latin subset)
 *
 * Variable font axis: wght 100–900 — single file covers all weights.
 * next/font/local injects <link rel="preload"> for the arabic subset (preload:true).
 * latin subset loads on-demand (preload:false) — most pages are Persian-only.
 */
const estedad = localFont({
  src: [
    {
      // فارسی/عربی — colocated inside src/app/ so next/font/local resolves correctly
      path: './fonts/estedad/estedad-arabic-wght-normal.woff2',
      weight: '100 900',
      style: 'normal',
    },
    {
      // لاتین — loaded on-demand by browser via unicode-range
      path: './fonts/estedad/estedad-latin-wght-normal.woff2',
      weight: '100 900',
      style: 'normal',
    },
  ],
  display: 'swap',
  variable: '--font-estedad',
  preload: true,
  adjustFontFallback: 'Arial',
});

/**
 * Geist — Latin/English variable font (55.5 KB, Vercel, MIT).
 */
const geist = localFont({
  src: './fonts/geist/Geist-Variable.woff2',
  weight: '100 900',
  display: 'swap',
  variable: '--font-geist',
  preload: false,
  adjustFontFallback: 'Arial',
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="fa-IR"
      dir="rtl"
      data-scroll-behavior="smooth"
      className={`${estedad.variable} ${geist.variable} rtl`}
      suppressHydrationWarning
    >
      <head>
        <Script id="strip-extension-attrs" strategy="beforeInteractive">
          {STRIP_EXTENSION_ATTRS_SCRIPT}
        </Script>
      </head>
      <body
        className="bg-[var(--ds-canvas)] text-[var(--ds-text-primary)] antialiased"
        suppressHydrationWarning
      >
        <Providers>
          <PageViewTracker />
          {children}
        </Providers>
        <Toaster />
      </body>
    </html>
  );
}
