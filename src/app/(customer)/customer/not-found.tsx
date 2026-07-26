/**
 * not-found.tsx — Customer Portal 404
 * نمایش صفحه ۴۰۴ برای مسیرهای ناشناخته در پورتال مشتری
 */
import Link from 'next/link';

export default function CustomerNotFound() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '40dvh',
        gap: 'var(--ds-space-4)',
        padding: 'var(--ds-space-6)',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          fontSize: '3rem',
          fontWeight: 800,
          color: 'var(--at-fg-subtle)',
          fontVariantNumeric: 'tabular-nums',
          lineHeight: 1,
        }}
        aria-hidden
      >
        ۴۰۴
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-2)' }}>
        <h2
          style={{
            fontSize: 'var(--ds-text-lg)',
            fontWeight: 700,
            color: 'var(--at-fg)',
            margin: 0,
          }}
        >
          صفحه‌ای یافت نشد
        </h2>
        <p
          style={{
            fontSize: 'var(--ds-text-sm)',
            color: 'var(--at-fg-muted)',
            margin: 0,
            maxWidth: 300,
          }}
        >
          این صفحه وجود ندارد یا دسترسی شما به آن محدود شده است.
        </p>
      </div>
      <Link
        href="/customer/dashboard"
        style={{
          padding: '0.5rem 1.5rem',
          border: 'none',
          borderRadius: 'var(--at-radius-sm, 6px)',
          background: 'var(--at-accent)',
          color: 'var(--at-accent-on, oklch(98% 0 0))',
          fontSize: 'var(--ds-text-sm)',
          fontWeight: 600,
          textDecoration: 'none',
        }}
      >
        بازگشت به داشبورد
      </Link>
    </div>
  );
}
