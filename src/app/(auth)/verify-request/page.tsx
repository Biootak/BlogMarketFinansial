// 2026-06-23: legacy alias — funnel into the canonical entry.
// 2026-08-14: single-flow unification — /verify-request now redirects to
// the canonical /auth?step=verify (AuthFlow.VerifyStep) instead of the
// standalone VerifyRequestClient page. `redirect` (legacy param) maps to
// AuthFlow's `callbackUrl`; email/intent pass through untouched.
import { redirect } from 'next/navigation';

export default async function AliasPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) {
    if (typeof value === 'string') params.set(key, value);
    else if (Array.isArray(value)) {
      for (const v of value) params.append(key, v);
    }
  }
  // legacy VerifyRequestClient read `?redirect=`; AuthFlow reads `callbackUrl`.
  const legacyRedirect = params.get('redirect');
  if (legacyRedirect) {
    params.set('callbackUrl', legacyRedirect);
    params.delete('redirect');
  }
  params.set('step', 'verify');
  redirect(`/auth?${params.toString()}`);
}
