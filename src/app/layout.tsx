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
import { Vazirmatn } from 'next/font/google';
import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import { Toaster } from '@/components/ui/toaster';

import './globals.css';
import '@/styles/index.scss';

import Providers from '@/components/providers';
import STRIP_EXTENSION_ATTRS_SCRIPT from '@/lib/strip-extension-attrs';

/* ============================================================================
   SEO Metadata (vercel.com-style defaults)
   ----------------------------------------------------------------------------
   - Locale-aware Open Graph & Twitter cards.
   - Canonical URL is exposed via metadataBase.
   - Per-page overrides are merged by Next.js automatically.
   ============================================================================ */
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://blogmarketfinansial.ir';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'بازارهای مالی | پلتفرم تحلیل و آموزش بازارهای مالی',
    template: '%s | بازارهای مالی',
  },
  description:
    'پلتفرم مورد اعتماد شما در بازار مالی — تحلیل، آموزش و اخبار لحظه‌ای ارزهای دیجیتال، طلا، بورس و بازار جهانی.',
  applicationName: 'بازارهای مالی',
  keywords: [
    'بازار مالی',
    'ارز دیجیتال',
    'بیت کوین',
    'طلا',
    'بورس',
    'تحلیل تکنیکال',
    'آموزش ترید',
  ],
  authors: [{ name: 'BlogMarketFinansial' }],
  creator: 'BlogMarketFinansial',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f7f8fa' },
    { media: '(prefers-color-scheme: dark)', color: '#14171f' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

const vazirmatn = Vazirmatn({
  subsets: ['arabic'],
  display: 'swap',
  variable: '--font-vazirmatn',
  preload: true,
  weight: ['400', '500', '600', '700'],
  adjustFontFallback: true,
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
      className={`${vazirmatn.variable} rtl`}
      suppressHydrationWarning
    >
      <head>
        <Script
          id="strip-extension-attrs"
          strategy="beforeInteractive"
        >
          {STRIP_EXTENSION_ATTRS_SCRIPT}
        </Script>
      </head>
      <body
        className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 antialiased font-vazirmatn"
        suppressHydrationWarning
      >
        <Providers>
          {children}
        </Providers>
        <Toaster />
      </body>
    </html>
  );
}
