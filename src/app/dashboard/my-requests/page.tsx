import { requireUser } from '@/lib/require-auth';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/Dashboard/primitives';
import MyRequestsClient from './_components/MyRequestsClient';

export const metadata: Metadata = {
  title: 'درخواست‌های من | داشبورد',
};

export default async function MyRequestsPage() {
  const auth = await requireUser();
  if (!auth.success) {
    redirect('/auth?callbackUrl=/dashboard/my-requests');
  }

  return (
    <div className="route-frame" dir="rtl">
      <PageHeader
        variant="compact"
        breadcrumb={[{ label: 'داشبورد', href: '/dashboard' }, { label: 'درخواست‌های من' }]}
        title="درخواست‌های من"
        description="پیگیری وضعیت درخواست‌های خدمات شما"
        eyebrow="پشتیبانی"
        icon="ticket"
        accent="cyan"
      />
      <MyRequestsClient />
    </div>
  );
}

