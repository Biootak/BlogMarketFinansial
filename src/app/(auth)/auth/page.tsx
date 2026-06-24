import type { Metadata, Viewport } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Suspense } from 'react';

import AuthFlow from '@/components/Auth/AuthFlow.redesign';

export const metadata: Metadata = {
  title: 'ورود و ثبت‌نام امن — بازار مالی',
  description: 'ورود، ثبت‌نام و بازیابی رمز عبور در یک مسیر یکپارچه و امن برای کاربران بازار مالی.',
  robots: { index: false, follow: false },
  openGraph: {
    title: 'ورود و ثبت‌نام امن — بازار مالی',
    description: 'دسترسی ایمن به داشبورد، تحلیل‌ها و امکانات اختصاصی بازار مالی.',
    type: 'website',
  },
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


export default function AuthPage() {
  return (
    <main className="auth-page-root" dir="rtl">
      <div className="auth-aurora" aria-hidden="true" />

      <header className="auth-page-header">
        <Link href="/" className="auth-brand" aria-label="بازار مالی — صفحه اصلی">
          <span className="auth-brand-mark" aria-hidden="true">
            <Image
              src="/favicon.svg"
              alt=""
              width={36}
              height={36}
              priority
              className="auth-brand-logo"
            />
          </span>
          <span className="auth-brand-copy">
            <span className="auth-brand-name">بازار مالی</span>
            <span className="auth-brand-tagline">احراز هویت یکپارچه و امن</span>
          </span>
        </Link>
      </header>

      <div className="auth-card-shell">
        <Suspense
          fallback={
            <div className="auth-card" aria-busy="true" style={{ minHeight: '32rem' }}>
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
