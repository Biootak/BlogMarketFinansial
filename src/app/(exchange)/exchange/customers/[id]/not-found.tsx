import Link from 'next/link';

export default function CustomerNotFound() {
  return (
    <div
      className="nova-content-area"
      dir="rtl"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
      }}
    >
      <div
        className="dash-panel"
        style={{
          maxWidth: '28rem',
          width: '100%',
          padding: '2rem',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1.25rem',
        }}
      >
        <p
          style={{
            fontSize: '3rem',
            fontWeight: 800,
            lineHeight: 1,
            color: 'var(--at-accent)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          ۴۰۴
        </p>
        <div>
          <h1 style={{ fontWeight: 700, fontSize: '1.125rem', marginBlockEnd: '0.375rem' }}>
            مشتری پیدا نشد
          </h1>
          <p style={{ color: 'var(--at-text-muted)', fontSize: '0.875rem', lineHeight: '1.6' }}>
            این مشتری در سیستم صرافی شما وجود ندارد یا حذف شده است.
          </p>
        </div>
        <Link
          href="/exchange/customers"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 1.25rem',
            borderRadius: '10px',
            background: 'var(--at-accent)',
            color: 'var(--at-accent-fg, #fff)',
            fontSize: '0.875rem',
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          بازگشت به لیست مشتریان
        </Link>
      </div>
    </div>
  );
}
