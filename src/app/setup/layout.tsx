import type { Metadata, Viewport } from 'next';
import type * as React from 'react';
import './setup.css';
import { getSiteIdentity } from '@/lib/site-identity';

/**
 * Setup-specific metadata. This page is intentionally excluded from search
 * indexes (noindex + robots: nofollow) because it bootstraps the first
 * super-admin and is never useful to a public visitor.
 *
 * The page itself is rendered as `force-dynamic` so every request probes
 * the database for an existing OWNER — see `src/app/setup/page.tsx`.
 */

export async function generateMetadata(): Promise<Metadata> {
  const { siteName } = await getSiteIdentity();
  const name = siteName || 'blogmarketfinansial.ir';

  return {
    title: `پیکربندی اولیه — ${name}`,
    description: 'ایجاد حساب مالک برای فعال‌سازی سامانه. فقط در اولین نصب استفاده می‌شود.',
    applicationName: name,
    authors: [{ name }],
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
}

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
