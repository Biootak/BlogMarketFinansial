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
import { STRIP_EXTENSION_ATTRS_SCRIPT } from '@/lib/strip-extension-attrs';
// فونت‌ها از `src/app/fonts/index.ts` مدیریت می‌شوند — تنها منبع حقیقت.
// برای تعویض فونت فقط همان فایل را تغییر بده — CSS و کامپوننت‌ها بدون تغییر
// کار می‌کنند چون همه از CSS variableها استفاده می‌کنند.
import { fontVariables } from './fonts';

// ابزار بررسی ظاهری — فقط در development؛ روی همهٔ صفحات سرور dev ظاهر می‌شود
// (بررسی المان + QA خودکار + تنظیمات؛ به‌صورت پیش‌فرض جمع‌شده). در build
// پروداکشن به‌کلی حذف می‌شود چون شرط NODE_ENV در رندر سمت سرور false است.
import DevInspector from '@/components/dev/DevInspector';

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
    icons: {
      icon: [
        { url: '/favicon.svg', type: 'image/svg+xml' },
        { url: '/favicon.png', type: 'image/png' },
      ],
      shortcut: '/favicon.png',
      apple: '/apple-touch-icon.png',
    },
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

// فونت‌ها از `src/app/fonts/index.ts` مدیریت می‌شوند — تنها منبع حقیقت.
// برای تعویض فونت فقط همان فایل را تغییر بده — CSS و کامپوننت‌ها بدون تغییر
// کار می‌کنند چون همه از CSS variableها استفاده می‌کنند.
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
      className={`${fontVariables} rtl`}
      suppressHydrationWarning
    >
      <head>
        {/* 2026-08-05 perf: MutationObserver روی کل subtree در prod فقط
            CPU می‌سوزاند. hydration mismatch warning فقط در dev نمایش داده
            می‌شود، پس اسکریپت strip-extension-attrs فقط در dev لود می‌شود. */}
        {process.env.NODE_ENV === 'development' && (
          <Script id="strip-extension-attrs" strategy="beforeInteractive">
            {STRIP_EXTENSION_ATTRS_SCRIPT}
          </Script>
        )}
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
        {process.env.NODE_ENV === 'development' && <DevInspector />}
      </body>
    </html>
  );
}
