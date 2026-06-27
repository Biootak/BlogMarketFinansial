import { Suspense } from 'react';
import Link from 'next/link';

import VerifyRequestClient from '@/components/Auth/VerifyRequestClient';


export const metadata = {
  title: 'تأیید ایمیل — بازار مالی',
  robots: { index: false, follow: false },
};

export default function VerifyRequestPage() {
  return (
    <main className="auth-page-root" dir="rtl">
      <div className="auth-aurora" aria-hidden="true" />

      <Link href="/" className="auth-brand" aria-label="بازار مالی — صفحه اصلی">
        <span className="auth-brand-mark" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect x="4" y="11" width="4" height="9" rx="1.2" fill="currentColor" opacity="0.55" />
            <rect x="10" y="7" width="4" height="13" rx="1.2" fill="currentColor" opacity="0.8" />
            <rect x="16" y="4" width="4" height="16" rx="1.2" fill="currentColor" />
          </svg>
        </span>
        <span className="auth-brand-name">بازار مالی</span>
      </Link>

      <div className="auth-card-shell">
        <Suspense
          fallback={
            <div className="auth-card" aria-busy="true" style={{ minHeight: '20rem' }}>
              <div className="auth-card-inner" />
            </div>
          }
        >
          <VerifyRequestClient />
        </Suspense>
      </div>

      <nav className="auth-foot" aria-label="پیوندهای پاورقی">
        <Link href="/terms" prefetch={false}>قوانین و مقررات</Link>
        <span aria-hidden="true" style={{ margin: '0 0.5rem', opacity: 0.4 }}>·</span>
        <Link href="/privacy-policy" prefetch={false}>حریم خصوصی</Link>
      </nav>
    </main>
  );
}
