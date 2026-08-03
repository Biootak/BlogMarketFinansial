/**
 * /exchange/settings/security — امنیت و دسترسی
 *
 *   شامل:
 *   - لیست اعضای صرافی + نقش‌ها
 *   - سشن‌های فعال (real-time از session)
 *   - audit log خلاصه
 *   - لینک به staff/permissions برای تنظیمات پیشرفته
 */

import { getExchangeForUser } from '@/actions/exchanges';
import { getExchangeStaff } from '@/actions/exchanges';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import SecurityWorkspace from './_components/SecurityWorkspace';

export const metadata = { title: 'امنیت و دسترسی | تنظیمات' };

export default async function SecurityPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/auth?callbackUrl=/exchange/settings/security');

  const membership = await getExchangeForUser();
  if (!membership) redirect('/dashboard');
  if (!['OWNER', 'MANAGER'].includes(membership.staffRole)) {
    redirect('/exchange/dashboard');
  }

  const staff = await getExchangeStaff(membership.exchange.id).catch(() => []);
  const canEdit = membership.staffRole === 'OWNER';

  return (
    <SecurityWorkspace
      exchange={membership.exchange}
      staff={staff}
      currentUserId={session.user.id}
      currentUserEmail={session.user.email ?? undefined}
      currentRole={membership.staffRole}
      canEdit={canEdit}
    />
  );
}
