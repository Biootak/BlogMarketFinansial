import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';

import AuthFlow from '@/components/Auth/AuthFlow.redesign';
import LogoSvg from '@/components/Logo/LogoSvg';
import { getSiteIdentity } from '@/lib/site-identity';

export const metadata: Metadata = {
  title: 'ورود — Financial Market',
  description: 'ورود، ثبت‌نام و بازیابی رمز عبور امن.',
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f4f8f5' },
    { media: '(prefers-color-scheme: dark)', color: '#090f0b' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default async function AuthPage() {
  const { siteName, logoUrl } = await getSiteIdentity();

  return (
    <main className="auth-page-root" dir="rtl">
      <div className="auth-aurora" aria-hidden="true" />

      <header className="auth-page-header">
        <Link href="/" className="auth-brand" aria-label={`${siteName} — صفحه اصلی`}>
          <span className="auth-brand-mark" aria-hidden="true">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt={siteName} className="auth-brand-logo-svg" />
            ) : (
              <LogoSvg className="auth-brand-logo-svg" />
            )}
          </span>
          <span className="auth-brand-copy">
            <span className="auth-brand-name">{siteName}</span>
            <span className="auth-brand-tagline">دسترسی امن</span>
          </span>
        </Link>
      </header>

      <div className="auth-card-shell">
        <Suspense
          fallback={
            <div className="auth-card" aria-busy="true" style={{ minHeight: '28rem' }}>
              <div className="auth-card-inner" />
            </div>
          }
        >
          <AuthFlow />
        </Suspense>
      </div>

      <nav className="auth-foot" aria-label="پیوندهای پاورقی">
        <Link href="/terms" prefetch={false}>
          قوانین و مقررات
        </Link>
        <span aria-hidden="true" className="auth-foot-separator">
          ·
        </span>
        <Link href="/privacy-policy" prefetch={false}>
          حریم خصوصی
        </Link>
      </nav>
    </main>
  );
}
