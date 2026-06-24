// 2026-06-24: (auth) group layout — bare shell, no Header/Footer chrome.
//
// Already-authenticated users land on /auth from a stale link? We
// bounce them to /dashboard. Everyone else gets the page-level chrome
// (header, sidecar hints, fineprint) rendered inside each page file.
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
