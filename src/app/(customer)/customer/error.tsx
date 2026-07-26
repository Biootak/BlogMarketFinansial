'use client';

/**
 * error.tsx — Customer Portal error boundary
 * مدیریت خطاهای غیرمنتظره در پورتال مشتری
 */
import { useEffect } from 'react';

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function CustomerError({ error, reset }: Props) {
  useEffect(() => {
    // log to error monitoring (e.g. Sentry) in production
    if (process.env.NODE_ENV === 'production') return;
    console.error('[CustomerPortal]', error);
  }, [error]);

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
          width: 56,
          height: 56,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 14,
          background: 'var(--at-danger-soft)',
          color: 'var(--at-danger)',
          border: '1px solid color-mix(in oklch, var(--at-danger) 25%, transparent)',
          fontSize: 24,
        }}
        aria-hidden
      >
        !
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
          خطایی رخ داد
        </h2>
        <p
          style={{
            fontSize: 'var(--ds-text-sm)',
            color: 'var(--at-fg-muted)',
            margin: 0,
            maxWidth: 320,
          }}
        >
          یک مشکل موقت پیش آمده. لطفاً دوباره تلاش کنید.
        </p>
      </div>
      <button
        type="button"
        onClick={reset}
        style={{
          padding: '0.5rem 1.5rem',
          border: 'none',
          borderRadius: 'var(--at-radius-sm, 6px)',
          background: 'var(--at-accent)',
          color: 'var(--at-accent-on, oklch(98% 0 0))',
          fontSize: 'var(--ds-text-sm)',
          fontWeight: 600,
          fontFamily: 'inherit',
          cursor: 'pointer',
        }}
      >
        تلاش مجدد
      </button>
    </div>
  );
}
