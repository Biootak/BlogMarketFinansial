import type { Metadata } from 'next';
import { checkSuperAdmin } from '@/lib/auth';
import SystemReports from '@/components/Dashboard/Reports/SystemReports';
import ActivityLog from '@/components/Dashboard/Reports/ActivityLog';
import SystemLogs from '@/components/Dashboard/Reports/SystemLogs';
import SystemStatus from '@/components/Dashboard/Reports/SystemStatus';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Activity, BarChart3, Settings2, Terminal } from 'lucide-react';

export const metadata: Metadata = {
  title: 'گزارش‌های سیستم',
  description: 'گزارش‌های سیستم، تاریخچه فعالیت‌ها و لاگ‌های سیستم',
};

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
        <Card className="relative overflow-hidden border rounded-xl shadow-lg backdrop-blur-sm bg-white">
          <div className="absolute inset-0 bg-gradient-to-br from-[rgb(var(--c-primary-100))] via-[rgb(var(--c-primary-50))] to-transparent opacity-50" />
          
          <div className="relative p-2 sm:p-3 md:p-4">
            <Tabs dir="rtl" defaultValue="status" className="space-y-4 sm:space-y-6">
              <div className="flex justify-start overflow-x-auto pb-2 border-b border-[rgb(var(--c-primary-100))]">
                <TabsList className="inline-flex h-12 sm:h-14 md:h-16 items-center justify-center rounded-xl bg-[rgb(var(--c-primary-50))]/80 backdrop-blur-sm p-1.5 sm:p-2 text-[rgb(var(--c-primary-600))] border border-[rgb(var(--c-primary-200))] shadow-sm">
                  <TabsTrigger 
                    value="status"
                    className="inline-flex items-center justify-center whitespace-nowrap rounded-lg px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3 text-xs sm:text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--c-primary-500))] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-gradient-to-l from-[rgb(var(--c-primary-600))] to-[rgb(var(--c-primary-500))] data-[state=active]:text-white data-[state=active]:shadow-md hover:bg-[rgb(var(--c-primary-100))]"
                  >
                    <Settings2 className="ml-1 sm:ml-2 h-4 w-4 sm:h-5 sm:w-5" />
                    <span className="hidden sm:inline">وضعیت سیستم</span>
                    <span className="sm:hidden">وضعیت</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="overview"
                    className="inline-flex items-center justify-center whitespace-nowrap rounded-lg px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3 text-xs sm:text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--c-primary-500))] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-gradient-to-l from-[rgb(var(--c-primary-600))] to-[rgb(var(--c-primary-500))] data-[state=active]:text-white data-[state=active]:shadow-md hover:bg-[rgb(var(--c-primary-100))]"
                  >
                    <BarChart3 className="ml-1 sm:ml-2 h-4 w-4 sm:h-5 sm:w-5" />
                    <span className="hidden sm:inline">نمای کلی</span>
                    <span className="sm:hidden">نما</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="activity"
                    className="inline-flex items-center justify-center whitespace-nowrap rounded-lg px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3 text-xs sm:text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--c-primary-500))] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-gradient-to-l from-[rgb(var(--c-primary-600))] to-[rgb(var(--c-primary-500))] data-[state=active]:text-white data-[state=active]:shadow-md hover:bg-[rgb(var(--c-primary-100))]"
                  >
                    <Activity className="ml-1 sm:ml-2 h-4 w-4 sm:h-5 sm:w-5" />
                    <span className="hidden sm:inline">تاریخچه فعالیت‌ها</span>
                    <span className="sm:hidden">تاریخچه</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="logs"
                    className="inline-flex items-center justify-center whitespace-nowrap rounded-lg px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3 text-xs sm:text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--c-primary-500))] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-gradient-to-l from-[rgb(var(--c-primary-600))] to-[rgb(var(--c-primary-500))] data-[state=active]:text-white data-[state=active]:shadow-md hover:bg-[rgb(var(--c-primary-100))]"
                  >
                    <Terminal className="ml-1 sm:ml-2 h-4 w-4 sm:h-5 sm:w-5" />
                    <span className="hidden sm:inline">لاگ‌های سیستم</span>
                    <span className="sm:hidden">لاگ‌ها</span>
                  </TabsTrigger>
                </TabsList>
              </div>
              
              <div className="mt-4 sm:mt-6 md:mt-8">
                <TabsContent value="status" className="space-y-4 sm:space-y-6 md:space-y-8">
                  <div className="relative rounded-xl overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-[rgb(var(--c-primary-100))] via-[rgb(var(--c-primary-50))] to-transparent opacity-50" />
                    <div className="relative p-1">
                      <SystemStatus />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="overview" className="space-y-4 sm:space-y-6 md:space-y-8">
                  <div className="relative rounded-xl overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-[rgb(var(--c-primary-100))] via-[rgb(var(--c-primary-50))] to-transparent opacity-50" />
                    <div className="relative p-1">
                      <SystemReports />
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="activity" className="space-y-4 sm:space-y-6 md:space-y-8">
                  <div className="relative rounded-xl overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-[rgb(var(--c-primary-100))] via-[rgb(var(--c-primary-50))] to-transparent opacity-50" />
                    <div className="relative p-1">
                      <ActivityLog />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="logs" className="space-y-4 sm:space-y-6 md:space-y-8">
                  <div className="relative rounded-xl overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-[rgb(var(--c-primary-100))] via-[rgb(var(--c-primary-50))] to-transparent opacity-50" />
                    <div className="relative p-1">
                      <SystemLogs />
                    </div>
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </Card>
      </div>
    </div>
  );
}
