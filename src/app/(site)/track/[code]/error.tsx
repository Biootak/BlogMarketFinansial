'use client';

import { Home, RefreshCw } from 'lucide-react';
import Link from 'next/link';

export default function TrackCodeError({
  error: _error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div
      dir="rtl"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '50dvh',
        gap: 'var(--ds-space-4)',
        padding: 'var(--ds-space-8)',
        textAlign: 'center',
      }}
    >
      <p style={{ fontSize: 'var(--ds-text-sm)', color: 'var(--ds-text-muted)', margin: 0 }}>
        خطایی در بارگذاری اطلاعات پیگیری رخ داد.
      </p>
      <div
        style={{
          display: 'flex',
          gap: 'var(--ds-space-3)',
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}
      >
        <button
          type="button"
          onClick={reset}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 'var(--ds-space-2)',
            padding: 'var(--ds-space-2) var(--ds-space-4)',
            borderRadius: 'var(--ds-radius-md)',
            background: 'var(--ds-brand-500)',
            color: 'oklch(98% 0.005 165)',
            border: 'none',
            cursor: 'pointer',
            fontSize: 'var(--ds-text-sm)',
            fontWeight: 600,
            fontFamily: 'inherit',
          }}
        >
          <RefreshCw size={14} aria-hidden />
          تلاش مجدد
        </button>
        <Link
          href="/track"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 'var(--ds-space-2)',
            padding: 'var(--ds-space-2) var(--ds-space-4)',
            borderRadius: 'var(--ds-radius-md)',
            background: 'var(--ds-canvas-subtle)',
            color: 'var(--ds-text-secondary)',
            border: '1px solid var(--ds-border-default)',
            textDecoration: 'none',
            fontSize: 'var(--ds-text-sm)',
            fontWeight: 500,
          }}
        >
          <Home size={14} aria-hidden />
          جستجوی مجدد
        </Link>
      </div>
    </div>
  );
}
