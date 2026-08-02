// 2026-06-24: (auth) group layout — bare shell, no Header/Footer chrome.
//
// Already-authenticated users land on /auth from a stale link? We
// bounce them to /dashboard. Everyone else gets the page-level chrome.
//
// `auth()` reads cookies (a runtime API), so this route renders dynamically.
// The auth check is wrapped in a <Suspense> boundary so the shell paints
// immediately and the redirect decision streams in at request time.
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import './auth.css';

// `auth()` reads cookies via headers() — a request-time API. Without this the
// route is statically prerendered at build and flips dynamic at runtime
// ("Page changed from static to dynamic ... reason: headers"), which 500s.
export const dynamic = 'force-dynamic';

async function AuthGate({ children }: { children: React.ReactNode }) {
  try {
    const session = await auth();
    if (session?.user) {
      redirect('/dashboard');
    }
  } catch {
    // session check is best-effort: if the auth runtime blips (e.g. cold
    // start of PrismaAdapter), we render the form rather than 500.
  }
  return <>{children}</>;
}

export default function AuthGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={null}>
      <AuthGate>{children}</AuthGate>
    </Suspense>
  );
}
