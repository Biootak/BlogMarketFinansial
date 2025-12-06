import { auth } from '@/auth';
import ServiceRequestsStats from '@/components/Dashboard/ServiceRequests/ServiceRequestsStats';
import ServiceRequestsTable from '@/components/Dashboard/ServiceRequests/ServiceRequestsTable';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';

export const metadata: Metadata = {
  title: 'مدیریت درخواست‌های خدمات | داشبورد',
};

export default async function ServiceRequestsPage() {
  const session = await auth();

  if (!session?.user || !['ADMIN', 'SUPER_ADMIN'].includes(session.user.role as string)) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/40 p-4 sm:p-6 md:p-8 lg:p-10 dark:from-slate-950 dark:via-slate-900 dark:to-blue-950/30">
      <div className="mx-auto max-w-[1600px] space-y-8">
        {/* Header Section */}
        <div className="space-y-2">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 opacity-20 blur-lg" />
              <div className="relative rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 p-3.5 shadow-lg shadow-blue-500/25">
                <svg
                  className="h-7 w-7 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
                مدیریت درخواست‌ها
              </h1>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 sm:text-base">
                مشاهده و پیگیری درخواست‌های پرداخت و حواله
              </p>
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <Suspense
          fallback={
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="h-28 animate-pulse rounded-2xl border border-slate-200/50 bg-gradient-to-br from-slate-100 to-slate-50 dark:border-slate-700/50 dark:from-slate-800 dark:to-slate-900"
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
            <div className="h-[500px] animate-pulse rounded-2xl border border-slate-200/50 bg-gradient-to-br from-slate-100 to-slate-50 dark:border-slate-700/50 dark:from-slate-800 dark:to-slate-900" />
          }
        >
          <ServiceRequestsTable />
        </Suspense>
      </div>
    </div>
  );
}
