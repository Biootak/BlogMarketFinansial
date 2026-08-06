'use client';

export const dynamic = 'force-dynamic';

/**
 * global-error.tsx — آخرین خط دفاع.
 * وقتی root layout خودش crash کند، این render می‌شود.
 * نمی‌تواند از RouteError استفاده کند چون providers (fonts, tokens) بالا نیستند.
 * بنابراین inline style با fallback مناسب.
 *
 * 2026-07-28: بازطراحی P2026 — حذف emoji/hex، استفاده از lucide-react SVG inline
 * + توکن‌های OKLCH که در dark mode توسط UA flip می‌شوند. فقط یک entry
 * (html) پس باید همه چیز inline باشد ولی همچنان با DS هم‌خوان.
 */

import * as Sentry from '@sentry/nextjs';
import { AlertTriangle } from 'lucide-react';
import { useEffect } from 'react';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  // توکن‌ها — local mirror از tokens.css (نمی‌توانیم از var() در JS استفاده کنیم
  // چون dark-mode flip در این سطح کار نمی‌کند؛ به‌جای media query دستی).
  const tokens =
    typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
      ? DARK
      : LIGHT;

  return (
    <html lang="fa" dir="rtl">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>خطای سیستمی</title>
      </head>
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 'clamp(1rem, 4vw, 2rem)',
          background: tokens.canvas,
          color: tokens.textPrimary,
          fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
          fontFeatureSettings: '"ss01"',
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
        }}
      >
        <div
          style={{
            maxWidth: '26rem',
            width: '100%',
            padding: 'clamp(1.5rem, 5vw, 2.25rem)',
            background: tokens.surface,
            borderRadius: '1rem',
            border: `1px solid ${tokens.border}`,
            boxShadow: tokens.shadow,
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          {/* Signature mark — دایرهٔ چرخان با غلظت gradient، آیکون lucide در مرکز */}
          <div
            style={{
              position: 'relative',
              width: '4.5rem',
              height: '4.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '9999px',
              background: tokens.amberBg,
              border: `1px solid ${tokens.amberBorder}`,
            }}
            aria-hidden
          >
            <div
              style={{
                position: 'absolute',
                inset: '-6px',
                borderRadius: '9999px',
                border: `1px dashed ${tokens.amberRing}`,
                animation: 'ge-spin 14s linear infinite',
              }}
            />
            <AlertTriangle size={26} strokeWidth={1.6} color={tokens.amberFg} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <h1
              style={{
                margin: 0,
                fontSize: '1.25rem',
                fontWeight: 800,
                color: tokens.textPrimary,
                letterSpacing: '-0.01em',
              }}
            >
              خطای سیستمی
            </h1>
            <p
              style={{
                margin: 0,
                fontSize: '0.9rem',
                color: tokens.textSecondary,
                lineHeight: 1.7,
              }}
            >
              مشکلی در بارگذاری سایت پیش آمده. لطفاً دوباره تلاش کنید یا به صفحهٔ اصلی بازگردید.
            </p>
          </div>

          {process.env.NODE_ENV === 'development' && error.digest && (
            <p
              style={{
                margin: 0,
                padding: '0.375rem 0.625rem',
                borderRadius: '0.375rem',
                fontSize: '0.7rem',
                color: tokens.textMuted,
                background: tokens.canvasSubtle,
                fontFamily: 'ui-monospace, monospace',
                direction: 'ltr',
              }}
            >
              digest: {error.digest}
            </p>
          )}

          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              gap: '0.5rem',
              width: '100%',
              marginTop: '0.25rem',
            }}
          >
            <button
              type="button"
              onClick={reset}
              style={{
                flex: 1,
                padding: '0.75rem 1rem',
                background: tokens.brand,
                color: tokens.brandFg,
                border: 'none',
                borderRadius: '0.625rem',
                fontSize: '0.875rem',
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'transform 180ms cubic-bezier(0.22, 1, 0.36, 1)',
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.transform = 'translateY(1px)';
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              تلاش مجدد
            </button>
            <a
              href="/"
              style={{
                flex: 1,
                padding: '0.75rem 1rem',
                background: tokens.surface,
                color: tokens.textPrimary,
                border: `1px solid ${tokens.border}`,
                borderRadius: '0.625rem',
                fontSize: '0.875rem',
                fontWeight: 700,
                textDecoration: 'none',
                textAlign: 'center',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 180ms cubic-bezier(0.22, 1, 0.36, 1)',
              }}
            >
              صفحهٔ اصلی
            </a>
          </div>
        </div>

        {/* keyframes inline — برای چرخش ring */}
        <style>{`
          @keyframes ge-spin {
            to { transform: rotate(360deg); }
          }
          @media (prefers-reduced-motion: reduce) {
            [data-err-ring] { animation: none !important; }
          }
        `}</style>
      </body>
    </html>
  );
}

// ─── Local token mirror ─────────────────────────────────────────────────────
// هم‌خوان با tokens.css (light + dark). dark mode با media query در JS تشخیص داده می‌شود.
const LIGHT = {
  canvas: 'oklch(99% 0.003 240)',
  canvasSubtle: 'oklch(97% 0.005 240)',
  surface: 'oklch(100% 0 0)',
  border: 'oklch(90% 0.005 240 / 0.8)',
  textPrimary: 'oklch(20% 0.01 240)',
  textSecondary: 'oklch(45% 0.01 240)',
  textMuted: 'oklch(55% 0.01 240)',
  shadow: '0 18px 50px -20px oklch(45% 0.1 250 / 0.25)',
  amberBg: 'oklch(97% 0.03 80)',
  amberBorder: 'oklch(88% 0.07 80)',
  amberFg: 'oklch(45% 0.14 80)',
  amberRing: 'oklch(75% 0.13 80 / 0.4)',
  brand: 'oklch(58% 0.12 165)',
  brandFg: 'oklch(14% 0.04 162)',
} as const;

const DARK = {
  canvas: 'oklch(15% 0.01 250)',
  canvasSubtle: 'oklch(18% 0.012 250)',
  surface: 'oklch(20% 0.012 250)',
  border: 'oklch(30% 0.012 250 / 0.8)',
  textPrimary: 'oklch(95% 0.005 240)',
  textSecondary: 'oklch(70% 0.01 240)',
  textMuted: 'oklch(55% 0.01 240)',
  shadow: '0 22px 60px -22px oklch(0% 0 0 / 0.6)',
  amberBg: 'oklch(22% 0.04 80 / 0.5)',
  amberBorder: 'oklch(35% 0.07 80 / 0.6)',
  amberFg: 'oklch(75% 0.14 80)',
  amberRing: 'oklch(70% 0.13 80 / 0.4)',
  brand: 'oklch(60% 0.12 165)',
  brandFg: 'oklch(14% 0.04 162)',
} as const;
