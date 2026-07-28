'use client';

/**
 * global-error.tsx — آخرین خط دفاع.
 * وقتی root layout خودش crash کند، این render می‌شود.
 * نمی‌تواند از RouteError استفاده کند چون providers (fonts, tokens) بالا نیستند.
 * بنابراین inline style با fallback مناسب.
 */

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="fa" dir="rtl">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f8fafc',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div
          style={{
            maxWidth: '22rem',
            width: '100%',
            margin: '0 1rem',
            padding: '2rem',
            background: '#fff',
            borderRadius: '1rem',
            border: '1px solid #e5e7eb',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <div
            style={{
              width: '3.5rem',
              height: '3.5rem',
              borderRadius: '50%',
              background: '#fff7ed',
              border: '1px solid #fed7aa',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem',
            }}
            aria-hidden
          >
            ⚠️
          </div>

          <h1 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700, color: '#111827' }}>
            خطای سیستمی
          </h1>

          <p style={{ margin: 0, fontSize: '0.875rem', color: '#6b7280', lineHeight: 1.6 }}>
            مشکلی در بارگذاری سایت پیش آمده. لطفاً دوباره تلاش کنید.
          </p>

          {process.env.NODE_ENV === 'development' && error.digest && (
            <p style={{ margin: 0, fontSize: '0.7rem', color: '#9ca3af', fontFamily: 'monospace' }}>
              digest: {error.digest}
            </p>
          )}

          <button
            type="button"
            onClick={reset}
            style={{
              width: '100%',
              padding: '0.75rem',
              background: '#4f46e5',
              color: '#fff',
              border: 'none',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            تلاش مجدد
          </button>
        </div>
      </body>
    </html>
  );
}
