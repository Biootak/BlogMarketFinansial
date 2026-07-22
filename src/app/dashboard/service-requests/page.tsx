import ServiceRequestsClient from '@/components/Dashboard/ServiceRequests/ServiceRequestsClient';
import { requireAdmin } from '@/lib/require-auth';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'مدیریت درخواست‌های خدمات | داشبورد',
};

export default async function ServiceRequestsPage() {
  const auth = await requireAdmin();
  if (!auth.success) redirect('/dashboard');

  return (
    <div className="at-page" dir="rtl">
      <ServiceRequestsClient />
    </div>
  );
}
