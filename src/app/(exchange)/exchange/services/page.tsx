/**
 * /exchange/services — مدیریت خدمات آنلاین صرافی (داشبورد).
 *
 *  - هر صرافی از داشبورد خودش سرویس‌هایش را انتخاب می‌کند
 *  - هر سرویس: فعال/غیرفعال + توضیح اختصاصی + لینک CTA + ترتیب
 *  - ۱۰ سرویس canonical (همان catalog) — UI یکپارچه در سایت
 *  - فقط OWNER / MANAGER می‌توانند ویرایش کنند
 */

import { getExchangeAnalyticsSummary, getMyExchangeServices } from '@/actions/exchange-services';
import { getExchangeForUser } from '@/actions/exchanges';
import { auth } from '@/auth';
import { PageHeader } from '@/components/Dashboard/primitives';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import ServicesAnalyticsWidget from './_components/ServicesAnalyticsWidget';
import ServicesWorkspace from './_components/ServicesWorkspace';

export const metadata: Metadata = { title: 'خدمات آنلاین | پنل صرافی' };

export default async function ExchangeServicesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/auth?callbackUrl=/exchange/services');

  const membership = await getExchangeForUser();
  if (!membership) redirect('/forbidden');

  if (!['OWNER', 'MANAGER'].includes(membership.staffRole)) redirect('/exchange/dashboard');

  const result = await getMyExchangeServices();
  if (!result.success) redirect('/exchange/dashboard');

  // analytics: best-effort — اگر خطا دهد، widget با empty state نمایش دهد
  const analyticsResult = await getExchangeAnalyticsSummary();
  const analytics = analyticsResult.success
    ? analyticsResult.data
    : { totalClicks: 0, byService: [], bySource: [], byDay: [] };

  const canEdit = membership.staffRole === 'OWNER' || membership.staffRole === 'MANAGER';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-5)' }}>
      <PageHeader
        title="خدمات آنلاین"
        description="سرویس‌هایی که در صفحه عمومی صرافی نمایش داده می‌شود را انتخاب و تنظیم کنید"
        breadcrumb={[
          { label: 'پنل صرافی', href: '/exchange/dashboard' },
          { label: 'خدمات آنلاین' },
        ]}
        icon="sparkles"
        accent="emerald"
        eyebrow="پروفایل عمومی"
      />

      <ServicesAnalyticsWidget summary={analytics} exchangeSlug={membership.exchange.slug} />

      <ServicesWorkspace initialItems={result.data} canEdit={canEdit} />
    </div>
  );
}
