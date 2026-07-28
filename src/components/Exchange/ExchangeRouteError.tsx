'use client';

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
  section?: string;
}

export default function ExchangeRouteError({ error, reset, section }: Props) {
  return (
    <div
      role="alert"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--ds-space-4, 1rem)',
        padding: 'var(--ds-space-10, 2.5rem) var(--ds-space-6, 1.5rem)',
        textAlign: 'center',
      }}
    >
      <p
        style={{
          fontSize: 'var(--ds-text-lg, 1.125rem)',
          fontWeight: 600,
          color: 'var(--ds-fg, inherit)',
          margin: 0,
        }}
      >
        {section ? `خطا در بارگذاری ${section}` : 'خطایی رخ داد'}
      </p>
      <p
        style={{
          fontSize: 'var(--ds-text-sm, 0.875rem)',
          color: 'var(--ds-fg-subtle, #57606a)',
          maxWidth: '30rem',
          margin: 0,
        }}
      >
        {error.message || 'مشکلی پیش آمده. لطفاً دوباره تلاش کنید.'}
      </p>
      <button
        type="button"
        onClick={reset}
        style={{
          height: '2.25rem',
          padding: '0 1.25rem',
          fontSize: 'var(--ds-text-sm, 0.875rem)',
          fontFamily: 'inherit',
          fontWeight: 500,
          color: '#fff',
          background: 'var(--ds-accent, #3b82d4)',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
        }}
      >
        تلاش مجدد
      </button>
    </div>
  );
}
