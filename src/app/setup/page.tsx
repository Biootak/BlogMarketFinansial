import Logo from '@/components/Logo/Logo';
import { AuroraBackdrop } from '@/components/Setup/AuroraBackdrop';
import { SecurityNotice } from '@/components/Setup/SecurityNotice';
import { SetupWizard } from '@/components/Setup/SetupWizard';
import { ArrowLeftGlyph, ShieldCheckGlyph } from '@/components/Setup/WizardIcons';
import { checkExistingSuperAdmin } from '@/lib/auth';
import prisma from '@/lib/db';
import { serverLog } from '@/lib/server-logger';
import { maskEmail } from '@/lib/setup/format';
import { getSiteIdentity } from '@/lib/site-identity';
import { headers } from 'next/headers';
import Link from 'next/link';
import { Suspense } from 'react';

// `headers()` inside SetupContent is a request-time API. Without this, the
// page is statically prerendered at build and flips dynamic at runtime
// ("Page changed from static to dynamic ... reason: headers"), which 500s.
export const dynamic = 'force-dynamic';

/**
 * Setup page (server component shell).
 *
 * The page shell renders immediately and streams the dynamic content
 * (headers + DB probe) inside a <Suspense> boundary.
 *
 * 2026-06-29: The `headers()` call in SetupContent reads a request API, which
 * automatically opts this page into dynamic rendering — so it never attempts
 * static generation (and a build-time DB connection). No `export const
 * dynamic` needed.
 *
 * Responsibilities:
 *   1. Render the skip-link and static brand nav immediately.
 *   2. Stream <SetupContent> which probes the DB and reads request headers.
 */

/**
 * SetupSkeleton — visual placeholder that matches the glass shell so the
 * page does not layout-shift while the DB probe / headers resolve.
 */
function SetupSkeleton({ siteName, logoUrl }: { siteName: string; logoUrl: string }) {
  return (
    <main className="setup-page" lang="fa-IR" dir="rtl" aria-busy="true">
      <AuroraBackdrop />

      <header className="setup-page__topbar">
        <div className="setup-page__brand">
          <Logo logoUrl={logoUrl} className="h-10 w-auto" />
          <span className="setup-page__brand-text">{siteName}</span>
        </div>
      </header>

      <section className="setup-page__stage">
        <article className="setup-page__shell">
          <div className="setup-page__shell-glow" aria-hidden="true" />
          <div className="setup-page__shell-inner">
            <div className="setup-skeleton h-96 animate-pulse rounded-2xl bg-white/10" />
          </div>
        </article>
      </section>
    </main>
  );
}

/**
 * SetupContent — async data component. All dynamic request access
 * (`headers()` and the DB probe) lives here, inside <Suspense>.
 */
async function SetupContent({ siteName, logoUrl }: { siteName: string; logoUrl: string }) {
  const isProduction = process.env.NODE_ENV === 'production';
  // Dev-only preview: render the wizard even when a super-admin already
  // exists so the UI can be redesigned/tested without resetting the DB.
  // The server action still refuses to create a duplicate admin.
  const previewMode = !isProduction && process.env.SETUP_PREVIEW_MODE === 'true';

  // Read the client IP once on the server; surfaced in the trust footer
  // for production deployments that gate access by IP allow-list.
  let clientIp: string | undefined;
  try {
    const headerList = await headers();
    clientIp =
      headerList.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      headerList.get('x-real-ip') ??
      undefined;
  } catch (error) {
    serverLog.warn('setup', 'client-ip-unavailable', error);
    clientIp = undefined;
  }

  let existingAdmin: Awaited<ReturnType<typeof checkExistingSuperAdmin>> = null;
  try {
    existingAdmin = await checkExistingSuperAdmin(prisma);
  } catch (error) {
    // Fail open: if the DB query fails we still render the wizard so the
    // operator can recover. The server action will be the authoritative
    // gate and will refuse the duplicate if it materialises. The failure is
    // logged so "wizard shown again on a configured install" is diagnosable.
    serverLog.error('setup', 'check-existing-super-admin', error);
  }

  return (
    <main className="setup-page" lang="fa-IR" dir="rtl">
      <AuroraBackdrop />

      <a href="#setup-content" className="setup-skip">
        پرش به محتوای اصلی
      </a>

      <header className="setup-page__topbar">
        <div className="setup-page__brand">
          <Logo logoUrl={logoUrl} className="h-10 w-auto" />
          <span className="setup-page__brand-text">{siteName}</span>
        </div>
        <nav aria-label="ناوبری سراسری" className="setup-page__topnav">
          <span className="setup-page__topnav-badge">
            <ShieldCheckGlyph className="setup-page__topnav-badge-glyph" />
            <span>مالک</span>
          </span>
          <Link href="/auth" className="setup-page__topnav-link">
            <ArrowLeftGlyph className="setup-page__topnav-glyph" />
            <span>ورود</span>
          </Link>
        </nav>
      </header>

      <section id="setup-content" className="setup-page__stage" aria-labelledby="setup-heading">
        <div className="setup-page__shell-wrap">
          <article className="setup-page__shell" aria-describedby="setup-trust">
            <div className="setup-page__shell-glow" aria-hidden="true" />
            <div className="setup-page__shell-inner">
              {existingAdmin && !previewMode ? (
                <AlreadyConfigured email={existingAdmin.email ?? ''} />
              ) : (
                <>
                  {previewMode ? <PreviewBanner /> : null}
                  <SetupWizard />
                </>
              )}
            </div>
          </article>

          <div id="setup-trust" className="setup-page__trust">
            <SecurityNotice isProduction={isProduction} clientIp={clientIp} />
          </div>
        </div>

        <p className="setup-page__legal">
          © {new Date().getFullYear()} {siteName} — پیکربندی با احراز هویت دو مرحله‌ای در سرور.
        </p>
      </section>
    </main>
  );
}

export default async function SetupPage() {
  const { siteName, logoUrl } = await getSiteIdentity();

  return (
    <Suspense fallback={<SetupSkeleton siteName={siteName} logoUrl={logoUrl} />}>
      <SetupContent siteName={siteName} logoUrl={logoUrl} />
    </Suspense>
  );
}

function PreviewBanner() {
  return (
    <output className="setup-preview-banner" aria-live="polite">
      <span className="setup-preview-banner__dot" aria-hidden="true" />
      <span className="setup-preview-banner__text">
        حالت پیش‌نمایش Wizard فعال است. ارسال فرم به‌دلیل وجود مالک با خطا مواجه می‌شود.
      </span>
    </output>
  );
}

function AlreadyConfigured({ email }: { email: string }) {
  return (
    <output className="setup-already" aria-live="polite">
      <div className="setup-already__seal" aria-hidden="true">
        <ShieldCheckGlyph />
      </div>
      <h1 id="setup-heading" className="setup-already__title">
        سامانه از پیش پیکربندی شده است
      </h1>
      <p className="setup-already__desc">
        یک حساب مالک پیش‌تر ایجاد شده است و دسترسی به این صفحه برای جلوگیری از ایجاد حساب تکراری
        محدود شده است. اگر مالک حساب هستید، از طریق صفحه‌ی ورود وارد شوید.
      </p>
      {email ? (
        <p
          className="setup-already__email"
          dir="ltr"
          aria-label="ایمیل مالک (ناقص برای حفظ حریم خصوصی)"
        >
          {maskEmail(email)}
        </p>
      ) : null}
      <div className="setup-already__actions">
        <Link href="/auth" className="setup-already__cta">
          رفتن به صفحه‌ی ورود
        </Link>
      </div>
    </output>
  );
}
