'use client';

/**
 * SiteRouteError — shared error boundary for all public (site) routes.
 *
 * Captures to Sentry (all environments). Uses ds-* tokens — no hardcoded hex.
 * RTL logical properties only.
 */

import * as Sentry from '@sentry/nextjs';
import { AlertTriangle, ArrowRight, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useEffect } from 'react';

interface SiteRouteErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
  /**
   * نام بخش برای نمایش در پیام خطا (مثلاً "صرافی‌ها", "پروفایل").
   * پیش‌فرض: "این صفحه"
   */
  section?: string;
  /** لینک بازگشت. پیش‌فرض: "/" */
  backHref?: string;
  /** متن لینک بازگشت. پیش‌فرض: "صفحه اصلی" */
  backLabel?: string;
}

export default function SiteRouteError({
  error,
  reset,
  section = 'این صفحه',
  backHref = '/',
  backLabel = 'صفحه اصلی',
}: SiteRouteErrorProps) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div
      dir="rtl"
      style={{
        minHeight: '50vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--ds-space-8) var(--ds-space-4)',
      }}
    >
      <div
        style={{
          maxWidth: '26rem',
          width: '100%',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 'var(--ds-space-5)',
        }}
      >
        {/* Icon */}
        <div
          style={{
            width: '4rem',
            height: '4rem',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background:
              'color-mix(in oklch, var(--ds-warning, oklch(75% 0.15 82)) 12%, transparent)',
            border:
              '1px solid color-mix(in oklch, var(--ds-warning, oklch(75% 0.15 82)) 25%, transparent)',
          }}
        >
          <AlertTriangle
            style={{
              width: '1.75rem',
              height: '1.75rem',
              color: 'var(--ds-warning, oklch(65% 0.17 55))',
            }}
            strokeWidth={1.75}
            aria-hidden
          />
        </div>

        {/* Text */}
        <div>
          <h2
            style={{
              fontWeight: 700,
              fontSize: 'var(--ds-text-xl, 1.25rem)',
              color: 'var(--ds-text-1)',
              marginBlockEnd: 'var(--ds-space-2)',
            }}
          >
            خطا در بارگذاری {section}
          </h2>
          <p
            style={{
              fontSize: 'var(--ds-text-sm, 0.875rem)',
              color: 'var(--ds-text-3)',
              lineHeight: '1.7',
            }}
          >
            مشکلی در بارگذاری این صفحه پیش آمده است. لطفاً دوباره تلاش کنید یا به صفحه اصلی بازگردید.
          </p>
          {process.env.NODE_ENV === 'development' && error.digest && (
            <p
              style={{
                marginBlockStart: 'var(--ds-space-2)',
                fontSize: '0.75rem',
                color: 'var(--ds-text-4)',
                fontFamily: 'monospace',
              }}
            >
              کد: {error.digest}
            </p>
          )}
        </div>

        {/* Actions */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--ds-space-2)',
            width: '100%',
          }}
        >
          <button
            type="button"
            onClick={reset}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--ds-space-2)',
              padding: 'var(--ds-space-3) var(--ds-space-5)',
              background: 'var(--ds-brand-600, oklch(52% 0.14 162))',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--ds-radius-lg, 0.75rem)',
              fontWeight: 600,
              fontSize: 'var(--ds-text-sm)',
              cursor: 'pointer',
              minHeight: '44px',
              transition: 'opacity 160ms ease',
            }}
            aria-label="تلاش مجدد برای بارگذاری صفحه"
          >
            <RefreshCw style={{ width: '1rem', height: '1rem' }} aria-hidden />
            تلاش مجدد
          </button>

          <Link
            href={backHref}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--ds-space-2)',
              padding: 'var(--ds-space-3) var(--ds-space-5)',
              background: 'transparent',
              color: 'var(--ds-text-2)',
              border: '1px solid var(--ds-border-1)',
              borderRadius: 'var(--ds-radius-lg, 0.75rem)',
              fontWeight: 500,
              fontSize: 'var(--ds-text-sm)',
              textDecoration: 'none',
              minHeight: '44px',
              transition: 'border-color 160ms ease',
            }}
            aria-label={`بازگشت به ${backLabel}`}
          >
            <ArrowRight style={{ width: '1rem', height: '1rem' }} aria-hidden />
            {backLabel}
          </Link>
        </div>
      </div>
    </div>
  );
}
