// 2026-06-23: (auth) group layout — no Header/Footer chrome.
//
// Already-authenticated users land on /auth from a stale link?
// We bounce them to /dashboard. Everyone else gets the AuthTopBar
// + AuthSidecar + AuthFooter chrome via the page files themselves.
import { auth } from '@/auth';
import { redirect } from 'next/navigation';

export default async function AuthGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
