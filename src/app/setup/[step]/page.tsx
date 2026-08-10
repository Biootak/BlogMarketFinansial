import { SetupShell, SetupSkeleton } from '@/components/Setup/SetupShell';
import { SetupWizard } from '@/components/Setup/SetupWizard';
import { resolveOwnerSetupInvite } from '@/lib/setup/activation';
import type { StepId } from '@/lib/setup/schema';
import { getSiteIdentity } from '@/lib/site-identity';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

// The shell probes the DB and reads request headers at render time (see
// SetupShell) — these routes must never attempt static generation.
export const dynamic = 'force-dynamic';

/**
 * Wizard sub-routes — one real URL per step: `/setup/identity`,
 * `/setup/credentials`, `/setup/profile`, `/setup/review`.
 *
 * The URL is the source of truth for the current step, so every step can be
 * deep-linked, bookmarked, and refreshed without losing position. The intro
 * lives at `/setup` itself (see `page.tsx`), so `intro` is not a valid path
 * segment here — anything unknown 404s.
 *
 * Owner handover: the invite token rides in the query string through every
 * step (`/setup/identity?token=…`). When a valid token is present the
 * wizard runs in activation mode — the email is locked and submitting
 * completes the pending OWNER account instead of bootstrapping a new one.
 */
const VALID_STEP_PARAMS = new Set<StepId>(['identity', 'credentials', 'profile', 'review']);

export interface SetupStepPageProps {
  params: Promise<{ step: string }>;
  searchParams: Promise<{ token?: string }>;
}

export default async function SetupStepPage({ params, searchParams }: SetupStepPageProps) {
  const { step } = await params;

  if (!VALID_STEP_PARAMS.has(step as StepId)) {
    notFound();
  }

  const { siteName, logoUrl } = await getSiteIdentity();
  const { token } = await searchParams;

  let activation: { email: string; token: string } | null = null;
  let invalidInvite = false;
  if (token?.trim()) {
    const resolved = await resolveOwnerSetupInvite(token);
    if (resolved.ok) {
      activation = { email: resolved.email, token: token.trim() };
    } else {
      invalidInvite = true;
    }
  }

  return (
    <Suspense fallback={<SetupSkeleton siteName={siteName} logoUrl={logoUrl} />}>
      <SetupShell activation={activation} invalidInvite={invalidInvite}>
        <SetupWizard step={step as StepId} activation={activation} />
      </SetupShell>
    </Suspense>
  );
}
