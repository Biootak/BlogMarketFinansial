/**
 * /customer/requests — لیست درخواست‌های مشتری (My Requests)
 *
 * صفحهٔ source-of-truth برای درخواست‌های مشتری به صرافی. کاربر اینجا:
 *  - همهٔ درخواست‌هایش را با status می‌بیند
 *  - فیلتر بر اساس status / type
 *  - روی هر کدام کلیک می‌کند و timeline + resolution را می‌بیند
 *  - درخواست‌های PENDING/IN_REVIEW را لغو می‌کند
 */
import { getCustomerRequestStats, getCustomerRequests } from '@/actions/customer-portal';
import { auth } from '@/auth';
import { PageHeader } from '@/components/Dashboard/primitives';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import RequestsContent from './_components/RequestsContent';

export const metadata: Metadata = {
  title: 'درخواست‌های من',
  description: 'لیست درخواست‌های ارسالی به صرافی، وضعیت و کد پیگیری',
};

export const dynamic = 'force-dynamic';

export default async function CustomerRequestsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/auth?callbackUrl=/customer/requests');

  // موازی: لیست + آمار (هر دو از DB مستقل‌اند)
  const [rows, stats] = await Promise.all([
    getCustomerRequests({ limit: 50 }),
    getCustomerRequestStats(),
  ]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-6)' }}>
      <PageHeader
        title="درخواست‌های من"
        description="همهٔ درخواست‌هایی که به صرافی ارسال کرده‌اید. هر کدام کد پیگیری یکتا دارد."
        breadcrumb={[{ label: 'پورتال مشتری', href: '/customer/dashboard' }, { label: 'درخواست‌های من' }]}
        icon="clipboard-list"
        accent="violet"
      />
      <RequestsContent rows={rows} stats={stats} />
    </div>
  );
}
