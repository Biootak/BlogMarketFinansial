/**
 * /customer — ریدایرکت هوشمند به پورتال مشتری
 *
 * اگر کاربر لاگین نیست → /auth
 * اگر لاگین است اما Customer Portal ندارد → /dashboard
 * در غیر این صورت → /customer/dashboard
 */

import { requireCustomerAccess } from '@/lib/customer-auth';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function CustomerIndex() {
  const access = await requireCustomerAccess();
  if (!access) {
    redirect('/auth?callbackUrl=/customer/dashboard');
  }
  redirect('/customer/dashboard');
}
