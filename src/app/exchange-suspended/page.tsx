import type { Metadata } from 'next';
/**
 * صفحه تعلیق صرافی — نمایش داده می‌شود وقتی status=SUSPENDED
 */
import Link from 'next/link';

export const metadata: Metadata = { title: 'صرافی شما تعلیق شده' };

export default function ExchangeSuspendedPage() {
  return (
    <main
      style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        background: 'var(--ds-canvas-subtle)',
        direction: 'rtl',
      }}
    >
      <div
        style={{
          maxWidth: '440px',
          width: '100%',
          background: 'var(--ds-canvas)',
          border: '1px solid var(--ds-border)',
          borderRadius: '16px',
          padding: '2.5rem',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'oklch(95% 0.06 50)',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '28px',
          }}
        >
          ⚠️
        </div>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--ds-text)' }}>
          صرافی شما تعلیق شده است
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--ds-text-secondary)', lineHeight: 1.6 }}>
          دسترسی به پنل صرافی شما موقتاً تعلیق شده است. لطفاً با تیم پشتیبانی پلتفرم تماس بگیرید.
        </p>
        <Link
          href="/"
          style={{
            display: 'inline-block',
            padding: '0.6rem 1.5rem',
            background: 'var(--ds-accent)',
            color: 'var(--ds-canvas)',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          بازگشت به صفحه اصلی
        </Link>
      </div>
    </main>
  );
}
