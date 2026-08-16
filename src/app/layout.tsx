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

import { DevScriptInjector } from '@/components/DevScriptInjector';
import PageViewTracker from '@/components/PageViewTracker';
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister';
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
    authors: [{ name: siteName || 'بازارهای مالی افغانستان' }],
    creator: siteName || 'بازارهای مالی افغانستان',
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
        {/* 2026-08-12 perf (performance skill): Speculation Rules — صفحاتی
            که کاربر به‌احتمال زیاد باز می‌کند (بعد از ~200ms هوور، eagerness:
            moderate) در پس‌زمینه prerender می‌شوند تا navigation تقریباً
            آنی باشد. فقط مسیرهای عمومی: api/dashboard/exchange/customer/
            auth/upload و… مستثنا هستند تا صفحات خصوصی و DB-سنگین هرگز
            prerender نشوند. PageViewTracker با document.prerendering gate
            شده — پریرندر pageview کاذب ثبت نمی‌کند (ر.ک usePageView). */}
        {/* 2026-08-15 (custom image loader): از این پس تصاویر unsplash/pexels
            مستقیم از CDN خودشان لود می‌شوند (بدون پراکسی /_next/image) →
            preconnect برای اتصال زودهنگام و حذف تأخیر handshake حیاتی است.
            آواتار نویسنده‌ها (i.pravatar.cc — <Image unoptimized>) و آواتارهای
            OAuth (Google/GitHub) هم مستقیم هستند → dns-prefetch ارزان. */}
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="preconnect" href="https://images.unsplash.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://images.pexels.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://i.pravatar.cc" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://lh3.googleusercontent.com" />
        <link rel="dns-prefetch" href="https://avatars.githubusercontent.com" />
        {/* 2026-08-16 fix: strategy حذف شد (پیش‌فرض afterInteractive) — الگوی
            رسمی Vercel KB برای Speculation Rules. `beforeInteractive` تنها
            مسیری بود که next/script یک <script> واقعی در درخت React رندر می‌کرد
            و React 19.2 (Next 16.3.1) موقع ساخت عنصر، خطای «Encountered a
            script tag while rendering React component» می‌داد (speculationrules
            در isScriptDataBlock به‌عنوان data block شناخته نمی‌شود) — حتی باعث
            crash صفحه در اولین لود سرد می‌شد. with afterInteractive اسکریپت
            بعد از hydration داخل head تزریق می‌شود — برای prerender-on-hover
            (eagerness: moderate) کاملاً کافی است. */}
        <Script
          id="speculation-rules"
          type="speculationrules"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON استاتیک از regex ثابت — هیچ ورودی کاربری ندارد (Speculation Rules رسمی Chrome)
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              prerender: [
                {
                  where: {
                    href_matches:
                      '^/((?!api|dashboard|exchange/|customer|setup|signin|signup|auth|forgot-password|reset-password|verify-email|verify-request|2fa-setup|session-expired|verify-status|maintenance|offline|forbidden|monitoring|uploads|error)[^.]*)$',
                  },
                  eagerness: 'moderate',
                },
              ],
            }),
          }}
        />
      </head>
      <body
        className="bg-[var(--ds-canvas)] text-[var(--ds-text-primary)] antialiased"
        suppressHydrationWarning
      >
        {process.env.NODE_ENV === 'development' && (
          <DevScriptInjector id="strip-extension-attrs" code={STRIP_EXTENSION_ATTRS_SCRIPT} />
        )}
        <Providers>
          <PageViewTracker />
          {children}
        </Providers>
        <ServiceWorkerRegister />
        <Toaster />
        {process.env.NODE_ENV === 'development' && <DevInspector />}
      </body>
    </html>
  );
}
