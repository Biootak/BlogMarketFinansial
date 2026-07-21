/**
 * /apply-exchange/success — صفحه تأیید درخواست ثبت صرافی
 */

import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'درخواست ثبت شد | پلتفرم انتقال ارز',
};

export default function ApplyExchangeSuccessPage() {
  return (
    <main
      dir="rtl"
      style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--ds-space-6)',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          maxWidth: 480,
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--ds-space-4)',
          alignItems: 'center',
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: 'color-mix(in oklab, var(--ds-color-success) 15%, transparent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 32,
          }}
          aria-hidden
        >
          ✓
        </div>
        <h1
          style={{
            fontSize: 'var(--ds-text-2xl)',
            fontWeight: 700,
            color: 'var(--ds-text-primary)',
            margin: 0,
          }}
        >
          درخواست ثبت شد
        </h1>
        <p
          style={{
            fontSize: 'var(--ds-text-base)',
            color: 'var(--ds-text-secondary)',
            margin: 0,
            lineHeight: 1.7,
          }}
        >
          درخواست ثبت صرافی شما دریافت شد و در انتظار بررسی تیم ما است. پس از تأیید، دسترسی به پنل
          صرافی برای شما فعال می‌شود.
        </p>
        <Link
          href="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: 'var(--ds-space-2) var(--ds-space-5)',
            borderRadius: 'var(--ds-radius-md)',
            background: 'var(--ds-color-primary)',
            color: 'var(--ds-color-on-primary, #fff)',
            textDecoration: 'none',
            fontWeight: 500,
            minHeight: 44,
          }}
        >
          بازگشت به صفحه اصلی
        </Link>
      </div>
    </main>
  );
}
