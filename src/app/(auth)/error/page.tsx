import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';
import { Suspense } from 'react';


export const metadata = {
  title: 'خطا در ورود — Financial Market',
  robots: { index: false, follow: false },
};

// `searchParams` is a runtime API, so this route renders dynamically. The
// access is isolated in a <Suspense>-wrapped component so the shell paints
// immediately and the param-dependent content streams in.
async function ErrorContent({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; callbackUrl?: string }>;
}) {
  const { error, callbackUrl } = await searchParams;
  const message =
    error === 'AccessDenied'
      ? 'دسترسی به این بخش ممکن نیست.'
      : error === 'Verification'
        ? 'نشانی تأیید منقضی شده است.'
        : 'یک خطای ناشناخته رخ داده است.';

  return (
    <main className="auth-page-root" dir="rtl">
      <div className="auth-aurora" aria-hidden="true" />

      <Link href="/" className="auth-brand" aria-label="Financial Market — صفحه اصلی">
        <span className="auth-brand-mark" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect x="4" y="11" width="4" height="9" rx="1.2" fill="currentColor" opacity="0.55" />
            <rect x="10" y="7" width="4" height="13" rx="1.2" fill="currentColor" opacity="0.8" />
            <rect x="16" y="4" width="4" height="16" rx="1.2" fill="currentColor" />
          </svg>
        </span>
        <span className="auth-brand-name">Financial Market</span>
      </Link>

      <div className="auth-card-shell">
        <div className="auth-card auth-fade-in">
          <div className="auth-card-inner">
            <div className="auth-card-header">
              <div
                className="auth-eyebrow"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                  color: 'oklch(78% 0.13 25)',
                  fontSize: 'var(--ds-text-xs)',
                  fontWeight: 600,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                }}
              >
                <ShieldAlert size={14} aria-hidden="true" />
                خطا در احراز هویت
              </div>
              <h1 className="auth-form-heading">{message}</h1>
              <p className="auth-form-lede">
                برای ادامه، به صفحه ورود بازگردید و دوباره تلاش کنید.
              </p>
            </div>

            {callbackUrl ? (
              <p className="auth-helper">
                مقصد مورد نظر:{' '}
                <span dir="ltr" style={{ fontWeight: 500 }}>{callbackUrl}</span>
              </p>
            ) : null}

            <div className="auth-tabpanel" style={{ marginBlockStart: '0.25rem' }}>
              <Link href="/auth" className="auth-cta">
                بازگشت به ورود
              </Link>
              <Link href="/" className="auth-cta-secondary">
                بازگشت به خانه
              </Link>
            </div>
          </div>
        </div>
      </div>

      <nav className="auth-foot" aria-label="پیوندهای پاورقی">
        <Link href="/terms" prefetch={false}>قوانین و مقررات</Link>
        <span aria-hidden="true" style={{ margin: '0 0.5rem', opacity: 0.4 }}>·</span>
        <Link href="/privacy-policy" prefetch={false}>حریم خصوصی</Link>
      </nav>
    </main>
  );
}

export default function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; callbackUrl?: string }>;
}) {
  return (
    <Suspense fallback={null}>
      <ErrorContent searchParams={searchParams} />
    </Suspense>
  );
}
