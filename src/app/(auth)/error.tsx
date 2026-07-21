'use client';

import * as Sentry from '@sentry/nextjs';
import { AlertTriangle, ArrowRight, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useEffect } from 'react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function AuthError({ error, reset }: ErrorProps) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="auth-page-root" dir="rtl">
      <div className="auth-aurora" aria-hidden="true" />
      <div className="auth-card-shell">
        <div
          className="auth-card"
          style={{
            minHeight: '22rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1.25rem',
            padding: '2rem',
          }}
        >
          {/* Icon */}
          <div
            style={{
              width: '3.5rem',
              height: '3.5rem',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'color-mix(in oklch, var(--a-err, oklch(52% 0.19 27)) 10%, transparent)',
              border:
                '1px solid color-mix(in oklch, var(--a-err, oklch(52% 0.19 27)) 22%, transparent)',
            }}
          >
            <AlertTriangle
              style={{
                width: '1.5rem',
                height: '1.5rem',
                color: 'var(--a-err, oklch(52% 0.19 27))',
              }}
              strokeWidth={1.75}
              aria-hidden
            />
          </div>

          {/* Message */}
          <div style={{ textAlign: 'center' }}>
            <p className="auth-error-message" style={{ marginBlockEnd: '0.25rem' }}>
              مشکلی در بارگذاری رخ داد
            </p>
            <p style={{ fontSize: '0.8125rem', color: 'var(--a-fg-4)', lineHeight: '1.6' }}>
              لطفاً دوباره تلاش کنید.
            </p>
            {process.env.NODE_ENV === 'development' && error.digest && (
              <p
                style={{
                  marginBlockStart: '0.5rem',
                  fontSize: '0.7rem',
                  color: 'var(--a-fg-5)',
                  fontFamily: 'monospace',
                }}
              >
                کد: {error.digest}
              </p>
            )}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '0.75rem', width: '100%' }}>
            <button
              type="button"
              onClick={reset}
              className="auth-submit-btn"
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                minHeight: '44px',
              }}
              aria-label="تلاش مجدد برای بارگذاری"
            >
              <RefreshCw style={{ width: '0.875rem', height: '0.875rem' }} aria-hidden />
              تلاش مجدد
            </button>
            <Link
              href="/"
              className="auth-link"
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                minHeight: '44px',
                textDecoration: 'none',
              }}
              aria-label="بازگشت به صفحه اصلی"
            >
              <ArrowRight style={{ width: '0.875rem', height: '0.875rem' }} aria-hidden />
              صفحه اصلی
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
