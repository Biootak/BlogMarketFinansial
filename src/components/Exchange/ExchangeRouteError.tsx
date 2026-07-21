'use client';

/**
 * ExchangeRouteError — shared error boundary component for all /exchange/* routes.
 *
 * Usage in each route's error.tsx:
 * ```tsx
 * 'use client';
 * import ExchangeRouteError from '@/components/Exchange/ExchangeRouteError';
 * export default function FooError({ error, reset }) {
 *   return <ExchangeRouteError error={error} reset={reset} />;
 * }
 * ```
 *
 * Captures to Sentry (all environments). Uses --nova-* / --at-* tokens; no hardcoded hex.
 */

import { Button } from '@/components/ui/button';
import * as Sentry from '@sentry/nextjs';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useEffect } from 'react';

interface ExchangeRouteErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
  /**
   * Section label shown in the error message (e.g. "مشتریان", "گزارش‌ها").
   * Falls back to "این بخش" when omitted.
   */
  section?: string;
}

export default function ExchangeRouteError({
  error,
  reset,
  section = 'این بخش',
}: ExchangeRouteErrorProps) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

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
        {/* Icon */}
        <div
          style={{
            width: '3.5rem',
            height: '3.5rem',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background:
              'var(--at-warning-soft, color-mix(in oklch, var(--at-warning, #d97706) 12%, transparent))',
          }}
        >
          <AlertTriangle
            style={{ width: '1.75rem', height: '1.75rem', color: 'var(--at-warning, #d97706)' }}
            aria-hidden
          />
        </div>

        {/* Text */}
        <div>
          <h2 style={{ fontWeight: 700, fontSize: '1.125rem', marginBlockEnd: '0.375rem' }}>
            خطا در بارگذاری {section}
          </h2>
          <p style={{ color: 'var(--at-text-muted)', fontSize: '0.875rem', lineHeight: '1.6' }}>
            مشکلی در بارگذاری این بخش پیش آمده. لطفاً دوباره تلاش کنید.
          </p>
          {process.env.NODE_ENV === 'development' && error.digest && (
            <p
              style={{
                marginBlockStart: '0.5rem',
                fontSize: '0.75rem',
                color: 'var(--at-text-muted)',
                fontFamily: 'monospace',
              }}
            >
              کد: {error.digest}
            </p>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }}>
          <Button onClick={reset} className="w-full gap-2" aria-label="تلاش مجدد">
            <RefreshCw style={{ width: '1rem', height: '1rem' }} aria-hidden />
            تلاش مجدد
          </Button>
          <Link href="/exchange/dashboard">
            <Button variant="outline" className="w-full gap-2" aria-label="بازگشت به داشبورد صرافی">
              <Home style={{ width: '1rem', height: '1rem' }} aria-hidden />
              داشبورد صرافی
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
