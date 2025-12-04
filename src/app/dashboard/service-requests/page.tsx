import { Suspense } from 'react';
import type { Metadata } from 'next';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import ServiceRequestsTable from '@/components/Dashboard/ServiceRequests/ServiceRequestsTable';
import ServiceRequestsStats from '@/components/Dashboard/ServiceRequests/ServiceRequestsStats';

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
        {/* Header Section */}
        <div className="relative">
          <div className="flex items-start justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl blur-lg opacity-40" />
                  <div className="relative p-3.5 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl shadow-lg shadow-amber-500/25">
                    <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                </div>
                <div>
                  <h1 className="text-3xl font-black bg-gradient-to-l from-neutral-900 via-neutral-800 to-neutral-700 dark:from-white dark:via-neutral-100 dark:to-neutral-300 bg-clip-text text-transparent">
                    مدیریت درخواست‌ها
                  </h1>
                  <p className="text-neutral-500 dark:text-neutral-400 mt-1 text-base">
                    مشاهده و پیگیری درخواست‌های پرداخت و حواله
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

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
