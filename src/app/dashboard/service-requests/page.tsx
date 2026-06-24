import { Suspense } from 'react';
import type { Metadata } from 'next';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import ServiceRequestsTable from '@/components/Dashboard/ServiceRequests/ServiceRequestsTable';
import ServiceRequestsStats from '@/components/Dashboard/ServiceRequests/ServiceRequestsStats';
import { PageHeader } from '@/components/Dashboard/primitives';

export const metadata: Metadata = {
  title: 'مدیریت درخواست‌های خدمات | داشبورد',
};

export default async function ServiceRequestsPage() {
  const session = await auth();

  if (!session?.user || !['ADMIN', 'SUPER_ADMIN'].includes(session.user.role as string)) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen">
      {/* Ambient Background */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-amber-500/10 to-orange-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gradient-to-br from-blue-500/8 to-indigo-500/5 rounded-full blur-3xl" />
      </div>

      <div className="space-y-8 p-8 max-w-[1600px] mx-auto">
        <PageHeader
          breadcrumb={[
            { label: 'داشبورد', href: '/dashboard' },
            { label: 'درخواست‌های خدمات' },
          ]}
          title="درخواست‌های خدمات"
          description="مدیریت درخواست‌های خدماتی کاربران"
        />

        {/* Stats Section */}
        <Suspense
          fallback={
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-5">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="h-28 bg-gradient-to-br from-neutral-100 to-neutral-50 dark:from-neutral-800 dark:to-neutral-900 rounded-2xl animate-pulse border border-neutral-200/50 dark:border-neutral-700/50"
                />
              ))}
            </div>
          }
        >
          <ServiceRequestsStats />
        </Suspense>

        {/* Table Section */}
        <Suspense
          fallback={
            <div className="animate-pulse h-[500px] bg-gradient-to-br from-neutral-100 to-neutral-50 dark:from-neutral-800 dark:to-neutral-900 rounded-3xl border border-neutral-200/50 dark:border-neutral-700/50" />
          }
        >
          <ServiceRequestsTable />
        </Suspense>
      </div>
    </div>
  );
}
