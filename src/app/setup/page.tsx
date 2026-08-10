import { SetupShell, SetupSkeleton } from '@/components/Setup/SetupShell';
import { SetupWizard } from '@/components/Setup/SetupWizard';
import { resolveOwnerSetupInvite } from '@/lib/setup/activation';
import { getSiteIdentity } from '@/lib/site-identity';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';

// The shell probes the DB and reads request headers at render time (see
// SetupShell) — this page must never attempt static generation.
export const dynamic = 'force-dynamic';

/**
 * Setup page — intro route (`/setup`).
 *
 * The page shell (backdrop, brand topbar, glass card, trust footer) lives in
 * `SetupShell`; the wizard steps are real sub-routes at `/setup/[step]`.
 * This route renders the no-field welcome screen (`step="intro"`).
 *
 * When a `?token=` invite is present (owner handover), the intro is skipped
 * and the owner is redirected straight into the wizard at the identity step
 * so they can complete their own account. An invalid/expired token renders
 * the invalid-invite screen instead.
 */
export default async function SetupPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { siteName, logoUrl } = await getSiteIdentity();
  const { token } = await searchParams;

  if (token?.trim()) {
    const resolved = await resolveOwnerSetupInvite(token);
    if (resolved.ok) {
      redirect(`/setup/identity?token=${encodeURIComponent(token.trim())}`);
    }
    return (
      <Suspense fallback={<SetupSkeleton siteName={siteName} logoUrl={logoUrl} />}>
        <SetupShell activation={null} invalidInvite>
          <SetupWizard step="intro" />
        </SetupShell>
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<SetupSkeleton siteName={siteName} logoUrl={logoUrl} />}>
      <SetupShell activation={null}>
        <SetupWizard step="intro" />
      </SetupShell>
    </Suspense>
  );
}
