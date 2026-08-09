import { SetupShell, SetupSkeleton } from '@/components/Setup/SetupShell';
import { SetupWizard } from '@/components/Setup/SetupWizard';
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
 */
const VALID_STEP_PARAMS = new Set<StepId>(['identity', 'credentials', 'profile', 'review']);

export interface SetupStepPageProps {
  params: Promise<{ step: string }>;
}

export default async function SetupStepPage({ params }: SetupStepPageProps) {
  const { step } = await params;

  if (!VALID_STEP_PARAMS.has(step as StepId)) {
    notFound();
  }

  const { siteName, logoUrl } = await getSiteIdentity();

  return (
    <Suspense fallback={<SetupSkeleton siteName={siteName} logoUrl={logoUrl} />}>
      <SetupShell>
        <SetupWizard step={step as StepId} />
      </SetupShell>
    </Suspense>
  );
}
