/**
 * /dashboard/my-deals — معاملات ارزی کاربر
 *
 * Shell: auth check روی server. داده‌ها توسط MyDealsClient با
 * pagination از getMyDeals (Server Action) دریافت می‌شوند.
 */

import { requireUser } from '@/lib/require-auth';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/Dashboard/primitives';
import MyDealsClient from './_components/MyDealsClient';

export const metadata: Metadata = {
  title: 'معاملات ارزی من | داشبورد',
  description: 'تاریخچه و وضعیت معاملات ارزی شما در پلتفرم',
};

export default async function MyDealsPage() {
  const auth = await requireUser();
  if (!auth.success) {
    redirect('/auth?callbackUrl=/dashboard/my-deals');
  }

  return (
    <div className="route-frame" dir="rtl">
      <PageHeader
        variant="compact"
        breadcrumb={[{ label: 'داشبورد', href: '/dashboard' }, { label: 'معاملات من' }]}
        title="معاملات ارزی من"
        description="تاریخچه و وضعیت معاملات ارزی شما در پلتفرم"
        eyebrow="مالی"
        icon="receipt"
        accent="amber"
      />
      <MyDealsClient />
    </div>
  );
}

