/**
 * /customer/requests/[id] — جزئیات یک درخواست
 *
 * ساختار:
 *  - Header: نوع + کد پیگیری + status pill
 *  - Status banner: وضعیت + اقدام (لغو) در صورت pending
 *  - Timeline: تاریخچه تغییر وضعیت با rail رنگی
 *  - Payload: داده‌های ساختاریافته بر اساس نوع
 *  - Resolution: پاسخ صرافی (اگر بسته شده)
 */
import { getCustomerRequestById } from '@/actions/customer-portal';
import { auth } from '@/auth';
import { PageHeader } from '@/components/Dashboard/primitives';
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import RequestDetailContent from './_components/RequestDetailContent';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'جزئیات درخواست',
};

export default async function CustomerRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect('/auth?callbackUrl=/customer/requests');

  const detail = await getCustomerRequestById(id);
  if (!detail) notFound();

  return (
    <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-6)' }}>
      <PageHeader
        title={detail.typeLabel}
        description={`کد پیگیری ${detail.trackingCode}`}
        breadcrumb={[
          { label: 'پورتال مشتری', href: '/customer/dashboard' },
          { label: 'درخواست‌های من', href: '/customer/requests' },
          { label: detail.trackingCode },
        ]}
        icon="clipboard-list"
        accent="violet"
      />
      <RequestDetailContent detail={detail} />
    </div>
  );
}
