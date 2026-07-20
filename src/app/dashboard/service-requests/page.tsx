import { auth } from '@/auth';
import ServiceRequestsClient from '@/components/Dashboard/ServiceRequests/ServiceRequestsClient';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'مدیریت درخواست‌های خدمات | داشبورد',
};

export default async function ServiceRequestsPage() {
  const session = await auth();

  if (!session?.user || !['ADMIN', 'OWNER'].includes(session.user.role as string)) {
    redirect('/dashboard');
  }

  return (
    <div className="at-page" dir="rtl">
      <ServiceRequestsClient />
    </div>
  );
}
