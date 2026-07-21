/**
 * /dashboard/my-deals — معاملات ارزی کاربر
 *
 * A5-fix (2026-07): این صفحه CurrencyDeal های ثبت‌شده کاربر لاگین‌شده را
 * از طریق getMyDeals نمایش می‌دهد. این صفحه فقط برای کاربران احراز هویت‌شده
 * قابل دسترسی است.
 */

import { getMyDeals } from '@/actions/currency-deals';
import { auth } from '@/auth';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import MyDealsClient from './_components/MyDealsClient';

export const metadata: Metadata = {
  title: 'معاملات ارزی من | داشبورد',
  description: 'تاریخچه و وضعیت معاملات ارزی شما در پلتفرم',
};

export default async function MyDealsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect('/signin?callbackUrl=/dashboard/my-deals');
  }

  const deals = await getMyDeals();

  return (
    <div className="at-page" dir="rtl">
      <MyDealsClient initialDeals={deals} />
    </div>
  );
}
