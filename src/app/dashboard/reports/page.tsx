'use client';

import type { Metadata } from 'next';
import { checkSuperAdmin } from '@/lib/auth';
import { Suspense } from 'react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Activity, BarChart3, Settings2, Terminal } from 'lucide-react';
import SystemReports from '@/components/Dashboard/Reports/SystemReports';
import ActivityLog from '@/components/Dashboard/Reports/ActivityLog';
import SystemLogs from '@/components/Dashboard/Reports/SystemLogs';
import SystemStatus from '@/components/Dashboard/Reports/SystemStatus';
import SystemLogsData from './SystemLogsData';
import { Loader2 } from 'lucide-react';

function LoadingFallback() {
  return (
    <div className="flex justify-center items-center min-h-[200px]">
      <Loader2 className="h-8 w-8 animate-spin" />
    </div>
  );
}

export default async function ReportsPage() {
  await checkSuperAdmin();

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8 min-h-screen rtl bg-gradient-to-br from-[rgb(var(--c-primary-50))] to-[rgb(var(--c-primary-100))]" style={{ direction: 'rtl' }}>
      <div className="flex flex-col space-y-8">
        {/* Header Section */}
        <div className="relative overflow-hidden rounded-2xl border shadow-lg">
          <div className="absolute inset-0 bg-gradient-to-l from-[rgb(var(--c-primary-400))] via-[rgb(var(--c-primary-300))] to-transparent opacity-30" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-[rgb(var(--c-primary-300))] via-[rgb(var(--c-primary-200))] to-transparent opacity-70" />
          <div className="absolute -left-32 -top-32 h-64 w-64 rounded-full bg-[rgb(var(--c-primary-300))] blur-3xl opacity-20" />
          <div className="absolute -right-32 -bottom-32 h-64 w-64 rounded-full bg-[rgb(var(--c-primary-400))] blur-3xl opacity-20" />
          
          {/* Content */}
          <div className="relative p-4 sm:p-6 md:p-8 lg:p-12">
            <div className="inline-flex items-center rounded-full bg-white/10 backdrop-blur-sm px-3 py-1 sm:px-4 sm:py-1.5 text-xs sm:text-sm font-medium text-[rgb(var(--c-primary-600))] border border-[rgb(var(--c-primary-200))] shadow-sm">
              گزارش‌های سیستم
            </div>
            <div className="mt-4 sm:mt-6 space-y-2">
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-l from-[rgb(var(--c-primary-700))] via-[rgb(var(--c-primary-600))] to-[rgb(var(--c-primary-500))]">
                مدیریت و نظارت بر سیستم
              </h2>
              <p className="text-sm sm:text-base md:text-lg text-[rgb(var(--c-primary-900))] max-w-2xl">
                در این بخش می‌توانید گزارش‌های سیستم، تاریخچه فعالیت‌ها و لاگ‌های سیستم را مشاهده و مدیریت کنید.
              </p>
            </div>
          </div>
        </div>

        {/* Tabs Section */}
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
          <div className="flex items-center justify-between space-y-2">
            <h2 className="text-3xl font-bold tracking-tight">Reports</h2>
          </div>
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="status">System Status</TabsTrigger>
              <TabsTrigger value="activity">Activity Log</TabsTrigger>
              <TabsTrigger value="logs">System Logs</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <Card className="p-6">
                <h3 className="text-xl font-semibold mb-4">System Overview</h3>
                <Suspense fallback={<LoadingFallback />}>
                  <SystemReports />
                </Suspense>
              </Card>
            </TabsContent>

            <TabsContent value="status">
              <Card className="p-6">
                <Suspense fallback={<LoadingFallback />}>
                  <SystemStatus />
                </Suspense>
              </Card>
            </TabsContent>

            <TabsContent value="activity">
              <Card className="p-6">
                <Suspense fallback={<LoadingFallback />}>
                  <ActivityLog />
                </Suspense>
              </Card>
            </TabsContent>

            <TabsContent value="logs">
              <Card className="p-6">
                <Suspense fallback={<LoadingFallback />}>
                  <SystemLogsData />
                  <SystemLogs />
                </Suspense>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
