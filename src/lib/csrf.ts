import type { NextRequest } from 'next/server';

/**
 * Same-origin CSRF guard for state-changing routes.
 *
 * M1 fix: a logged-in admin tab visiting a malicious page could be CSRF'd
 * into mass revalidating / mutating state. NextAuth sets the session cookie
 * `sameSite: 'lax'` which blocks cross-site top-level POSTs, but defense in
 * depth requires an explicit Origin check. We reject the request when an
 * `Origin` header is present and does not match the request's own host.
 * Requests without an `Origin` header (e.g. same-origin navigations that
 * omit it) are allowed.
 */
export function assertSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return true; // no Origin header → not a cross-site fetch

  const host = request.nextUrl.host;
  try {
    const originHost = new URL(origin).host;
    return originHost === host;
  } catch {
    return false;
  }
}
