/**
 * /exchange/settings/operations — تنظیمات عملیاتی صرافی
 *
 *   شامل:
 *   - KYC requirement toggle
 *   - سقف تراکنش روزانه (Daily Limit AFN)
 *   - درصد کارمزد پلتفرم
 *   - ارز پایه + ارزهای مجاز
 *   - مدت اعتبار quote
 *   - نمایش در مقایسه
 *   - شماره مجوز
 */

import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getExchangeForUser, updateExchangeSelf } from '@/actions/exchanges';
import OperationsWorkspace from './_components/OperationsWorkspace';

export const metadata = { title: 'عملیات و کارمزد | تنظیمات' };

export default async function OperationsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/auth?callbackUrl=/exchange/settings/operations');

  const membership = await getExchangeForUser();
  if (!membership) redirect('/dashboard');
  if (!['OWNER', 'MANAGER'].includes(membership.staffRole)) {
    redirect('/exchange/dashboard');
  }

  const { exchange, staffRole } = membership;
  const canEdit = staffRole === 'OWNER' || staffRole === 'MANAGER';

  return <OperationsWorkspace exchange={exchange} canEdit={canEdit} />;
}
