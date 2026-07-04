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
    <div className="dash-scope min-h-screen">
      {/* Ambient Background — consistent with the rest of the dashboard */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-amber-500/10 to-orange-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gradient-to-br from-blue-500/8 to-indigo-500/5 rounded-full blur-3xl" />
      </div>

      {/* ServiceRequestsClient owns the page header via its CommandBar hero. */}
      <div className="space-y-4 p-4 md:p-6 max-w-[1600px] mx-auto">
        <ServiceRequestsClient />
      </div>
    </div>
  );
}