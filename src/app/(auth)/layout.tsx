// 2026-06-24: (auth) group layout — bare shell, no Header/Footer chrome.
//
// Already-authenticated users land on /auth from a stale link? We
// bounce them to /dashboard. Everyone else gets the page-level chrome.
//
// 2026-06-27: under `cacheComponents: true`, `auth()` reads cookies
// (a runtime API). Per the migration guide, we wrap the runtime data
// access in a <Suspense> boundary so the static shell prerenders and
// the auth check streams in at request time.
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import './auth.css';

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
