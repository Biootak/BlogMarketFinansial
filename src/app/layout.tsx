import { Vazirmatn } from 'next/font/google';
import type { Metadata, Viewport } from 'next';
import { Toaster } from '@/components/ui/toaster';

import './globals.css';
import '@/styles/index.scss';

import { auth } from '@/auth';
import Providers from '@/components/providers';

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
  publisher: 'BlogMarketFinansial',
  alternates: {
    canonical: '/',
    languages: {
      'fa-IR': '/',
    },
  },
  openGraph: {
    type: 'website',
    locale: 'fa_IR',
    url: SITE_URL,
    siteName: 'بازارهای مالی',
    title: 'بازارهای مالی | پلتفرم تحلیل و آموزش بازارهای مالی',
    description:
      'پلتفرم مورد اعتماد شما در بازار مالی — تحلیل، آموزش و اخبار لحظه‌ای.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'بازارهای مالی',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'بازارهای مالی',
    description: 'پلتفرم مورد اعتماد شما در بازار مالی',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
  },
  manifest: '/manifest.webmanifest',
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
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-vazirmatn',
  preload: true,
  fallback: ['system-ui', 'sans-serif'],
});

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  return (
    <html
      lang="fa-IR"
      dir="rtl"
      className={`${vazirmatn.variable} rtl dark`}
      suppressHydrationWarning
    >
      <body
        className={`${vazirmatn.className} antialiased`}
        suppressHydrationWarning
      >
        <Providers session={session}>
          {/* linear.app-style dark canvas by default */}
          <div className="min-h-screen bg-[rgb(var(--c-surface-canvas))] text-[rgb(var(--c-foreground))] transition-colors duration-300">
            {children}
            <Toaster />
          </div>
        </Providers>
      </body>
    </html>
  );
}
