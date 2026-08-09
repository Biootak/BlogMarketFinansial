import Logo from '@/components/Logo/Logo';
import { checkExistingSuperAdmin } from '@/lib/auth';
import prisma from '@/lib/db';
import { maskEmail } from '@/lib/setup/format';
import { getSiteIdentity } from '@/lib/site-identity';
import { headers } from 'next/headers';
import Link from 'next/link';
import type * as React from 'react';
import { AuroraBackdrop } from './AuroraBackdrop';
import { SecurityNotice } from './SecurityNotice';
import { ArrowLeftGlyph, ShieldCheckGlyph } from './WizardIcons';

/**
 * SetupShell — shared page shell for the whole setup surface.
 *
 * Rendered by BOTH `/setup` (intro) and `/setup/[step]` (wizard sub-routes)
 * so the chrome — aurora backdrop, brand topbar, glass shell, trust footer —
 * is identical no matter which URL the user lands on. The step content is
 * passed in as `children`.
 *
 * All dynamic request access (`headers()` + the DB probe) lives here, inside
 * the caller's <Suspense> boundary, so both routes stay request-time and
 * never attempt static generation.
 */

/**
 * SetupSkeleton — visual placeholder that matches the glass shell so the
 * page does not layout-shift while the DB probe / headers resolve.
 */
export function SetupSkeleton({ siteName, logoUrl }: { siteName: string; logoUrl: string }) {
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

export interface SetupShellProps {
  children: React.ReactNode;
}

export async function SetupShell({ children }: SetupShellProps) {
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
  } catch {
    clientIp = undefined;
  }

  let existingAdmin: Awaited<ReturnType<typeof checkExistingSuperAdmin>> = null;
  try {
    existingAdmin = await checkExistingSuperAdmin(prisma);
  } catch {
    // Fail open: if the DB query fails we still render the wizard so the
    // operator can recover. The server action will be the authoritative
    // gate and will refuse the duplicate if it materialises.
  }

  const { siteName, logoUrl } = await getSiteIdentity();

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
                  {children}
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
