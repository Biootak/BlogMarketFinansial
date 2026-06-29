import type { Metadata, Viewport } from 'next';
import type * as React from 'react';
import './setup.css';

/**
 * Setup-specific metadata. This page is intentionally excluded from search
 * indexes (noindex + robots: nofollow) because it bootstraps the first
 * super-admin and is never useful to a public visitor.
 *
 * The page itself is rendered as `force-dynamic` so every request probes
 * the database for an existing SUPER_ADMIN — see `src/app/setup/page.tsx`.
 */

export const metadata: Metadata = {
  title: 'پیکربندی اولیه — blogmarketfinansial.ir',
  description: 'ایجاد حساب مدیر اصلی برای فعال‌سازی سامانه. فقط در اولین نصب استفاده می‌شود.',
  applicationName: 'blogmarketfinansial.ir',
  authors: [{ name: 'blogmarketfinansial.ir' }],
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
  formatDetection: { email: false, address: false, telephone: false },
  // The setup page never receives a referrer from external links.
  referrer: 'no-referrer',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f7f8fa' },
    { media: '(prefers-color-scheme: dark)', color: '#0c0e15' },
  ],
  colorScheme: 'light dark',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function SetupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
