/**
 * @file Root layout (server component)
 *
 * Auth is opt-in per route — we do NOT await `auth()` here because every
 * public page would pay the cost of loading the next-auth runtime
 * (and bcrypt + PrismaAdapter) just to pass `session` to a client
 * `SessionProvider` that doesn't need it on first paint.
 *
 * Per route, the (site)/layout and dashboard/layout call `auth()` and
 * pass `session` to `<Providers session={session}>`.
 */
import { Toaster } from '@/components/ui/toaster';
import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import Script from 'next/script';

import './globals.css';
import '@/styles/index.scss';

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

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://blogmarketfinansial.ir';

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

const vazirmatn = localFont({
  src: '../../public/fonts/vazirmatn/vazirmatn-arabic.woff2',
  weight: '100 900',
  display: 'swap',
  variable: '--font-vazirmatn',
  preload: true,
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
      className={`${vazirmatn.variable} rtl`}
      suppressHydrationWarning
    >
      <head>
        <Script id="strip-extension-attrs" strategy="beforeInteractive">
          {STRIP_EXTENSION_ATTRS_SCRIPT}
        </Script>
      </head>
      <body
        className="bg-[var(--ds-canvas)] text-[var(--ds-text-primary)] antialiased font-vazirmatn"
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
