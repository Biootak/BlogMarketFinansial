/**
 * /customer/deals — معاملات ارزی من (پورتال مشتری)
 *
 * 2026-08-12: مشتری قبلاً راهی برای دیدن معاملات ارزی‌اش (CurrencyDeal با
 * کد پیگیری و وضعیت) در پورتال خودش نداشت — فقط /dashboard/my-deals (پلتفرم)
 * وجود داشت. حالا با همان کامپوننت مشترک MyDealsClient (که خودش با
 * getMyDeals داده می‌گیرد) در پورتال مشتری هم در دسترس است — بدون کد تکراری
 * و با ظاهری کاملاً یکسان در هر دو داشبورد.
 */

import MyDealsClient from '@/app/dashboard/my-deals/_components/MyDealsClient';
import { PageHeader } from '@/components/Dashboard/primitives';
import { requireUser } from '@/lib/require-auth';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'معاملات ارزی من | پورتال مشتری',
  description: 'تاریخچه و وضعیت معاملات ارزی شما',
};

export default async function CustomerDealsPage() {
  const auth = await requireUser();
  if (!auth.success) redirect('/auth?callbackUrl=/customer/deals');

  return (
    <div className="route-frame" dir="rtl">
      <PageHeader
        variant="compact"
        breadcrumb={[
          { label: 'پورتال مشتری', href: '/customer/dashboard' },
          { label: 'معاملات ارزی' },
        ]}
        title="معاملات ارزی من"
        description="تاریخچه، کد پیگیری و وضعیت معاملات ارزی شما"
        eyebrow="مالی"
        icon="arrow-left-right"
        accent="emerald"
      />
      <MyDealsClient />
    </div>
  );
}
