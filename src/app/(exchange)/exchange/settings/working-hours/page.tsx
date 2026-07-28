/**
 * /exchange/settings/working-hours — ساعات کاری هفتگی
 *
 *   این صفحه فقط HoursMatrix را با state مدیریت می‌کند.
 *   hours در address (با prefix ;HOURS=) ذخیره می‌شود (backward compatible).
 */

import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getExchangeForUser, updateExchangeSelf } from '@/actions/exchanges';
import WorkingHoursWorkspace from './_components/WorkingHoursWorkspace';

export const metadata = { title: 'ساعات کاری | تنظیمات' };

export default async function WorkingHoursPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/auth?callbackUrl=/exchange/settings/working-hours');

  const membership = await getExchangeForUser();
  if (!membership) redirect('/dashboard');
  if (!['OWNER', 'MANAGER'].includes(membership.staffRole)) {
    redirect('/exchange/dashboard');
  }

  const { exchange, staffRole } = membership;
  const canEdit = staffRole === 'OWNER' || staffRole === 'MANAGER';

  return <WorkingHoursWorkspace exchange={exchange} canEdit={canEdit} />;
}
