/**
 * /dashboard/my-deals — معاملات ارزی کاربر
 *
 * Shell: auth check روی server. داده‌ها توسط MyDealsClient با
 * pagination از getMyDeals (Server Action) دریافت می‌شوند.
 */

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

  return (
    <div className="at-page" dir="rtl">
      <MyDealsClient />
    </div>
  );
}
