// 2026-06-24: (auth) group layout — bare shell, no Header/Footer chrome.
//
// Already-authenticated users land on /auth from a stale link? We
// bounce them to the correct portal (role-aware). callbackUrl honoring
// happens inside the auth page.tsx which has access to searchParams.
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

// Default portal per role
const DEFAULT_PORTAL: Record<string, string> = {
  EXCHANGE: '/exchange/dashboard',
  CUSTOMER: '/customer/dashboard',
  TEST_CUSTOMER: '/customer/dashboard',
  MERCHANT: '/customer/dashboard',
};

/**
 * Best-effort session read. 2026-08: `auth()` — like `redirect()` — can
 * throw; the NEXT_REDIRECT/NEXT_NOT_FOUND control-flow errors are rethrown,
 * everything else (e.g. PrismaAdapter cold start) degrades to "render the
 * auth form" instead of a 500. Type is inferred from the `await auth()`
 * call site so the session (not middleware) overload is selected.
 */
function isControlFlowError(error: unknown): boolean {
  // Next 16 throws redirect()/notFound() control-flow errors whose `digest`
  // is e.g. `NEXT_REDIRECT;replace;/path;307;` (message may also carry it).
  if (!(error instanceof Error)) return false;
  const digest = (error as Error & { digest?: string }).digest ?? '';
  return (
    error.message.includes('NEXT_REDIRECT') ||
    error.message.includes('NEXT_NOT_FOUND') ||
    digest.startsWith('NEXT_REDIRECT') ||
    digest.startsWith('NEXT_NOT_FOUND')
  );
}

async function readSession() {
  try {
    return await auth();
  } catch (error) {
    if (isControlFlowError(error)) throw error;
    return null;
  }
}

async function AuthGate({ children }: { children: React.ReactNode }) {
  // 2026-08: redirect() را از داخل try/catch خارج کردیم. در Next.js 15+
  // redirect() یک NEXT_REDIRECT throw می‌کند که اگر catch شود، ناوبری
  // ساکت بلعیده می‌شود و کاربر احرازشده روی فرم لاگین گیر می‌کند (باگ
  // واقعی: کاربر لاگین‌شده هرگز به پورتال خودش منتقل نمی‌شد).
  const session = await readSession();
  if (session?.user) {
    const role = session.user.role as string | undefined;
    redirect(DEFAULT_PORTAL[role ?? ''] ?? '/dashboard');
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
