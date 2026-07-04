import { type Metadata } from 'next';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import ServiceRequestsClient from '@/components/Dashboard/ServiceRequests/ServiceRequestsClient';

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