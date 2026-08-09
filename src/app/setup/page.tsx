import { SetupShell, SetupSkeleton } from '@/components/Setup/SetupShell';
import { SetupWizard } from '@/components/Setup/SetupWizard';
import { getSiteIdentity } from '@/lib/site-identity';
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
 * The shell streams inside a <Suspense> boundary so the static chrome paints
 * immediately while the DB probe / headers resolve.
 */
export default async function SetupPage() {
  const { siteName, logoUrl } = await getSiteIdentity();

  return (
    <Suspense fallback={<SetupSkeleton siteName={siteName} logoUrl={logoUrl} />}>
      <SetupShell>
        <SetupWizard step="intro" />
      </SetupShell>
    </Suspense>
  );
}
