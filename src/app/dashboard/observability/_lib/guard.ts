import 'server-only';

import { redirect } from 'next/navigation';

import { auth } from '@/auth';

/** نقش‌هایی که اجازهٔ دیدن مرکز مشاهده‌پذیری دارند */
const ALLOWED_ROLES = new Set(['OWNER', 'SUPERADMIN', 'ADMIN']);

/**
 * گارد مسیر — در layout اجرا می‌شود و همهٔ زیرمسیرها را پوشش می‌دهد.
 * لایهٔ دوم دفاع در `getObservabilitySnapshot` هم وجود دارد، پس حتی اگر
 * layout دور زده شود داده‌ای بیرون نمی‌رود.
 */
export async function requireObservabilityAccess(): Promise<void> {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/auth?callbackUrl=/dashboard/observability');
  }

  if (!ALLOWED_ROLES.has(session?.user?.role ?? '')) {
    redirect('/dashboard?error=forbidden');
  }
}
