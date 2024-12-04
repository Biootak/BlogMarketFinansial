'use client';

import { Suspense, useEffect, useState } from 'react';
import { Activity, BarChart3, Terminal } from 'lucide-react';
import SystemReports from '@/components/Dashboard/Reports/SystemReports';
import SystemLogs from '@/components/Dashboard/Reports/SystemLogs';
import SystemLogsData from './SystemLogsData';
import { Loader2 } from 'lucide-react';
import ActivityLog from '@/components/Dashboard/Reports/ActivityLog';
import { getSystemReports } from '@/actions/reportActions';
import { useRouter } from 'next/navigation';
import { toast } from '@/components/ui/use-toast';

function LoadingFallback() {
  return (
    <div className="flex justify-center items-center p-4">
      <Loader2 className="h-6 w-6 animate-spin" />
    </div>
  );
}

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await getSystemReports();
        if (!result.success) {
          toast({
            variant: "destructive",
            title: "خطا",
            description: result.message || "خطا در دریافت اطلاعات"
          });
          router.push('/dashboard');
        }
      } catch (error) {
        toast({
          variant: "destructive",
          title: "خطای دسترسی",
          description: error instanceof Error ? error.message : "شما دسترسی لازم برای مشاهده این بخش را ندارید"
        });
        router.push('/dashboard');
      }
    };
    
    fetchData();
  }, [router]);

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8 min-h-screen bg-gradient-to-br from-[rgb(var(--c-primary-50))] to-[rgb(var(--c-primary-100))]" dir="rtl">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[rgb(var(--c-primary-900))]">گزارش‌های سیستم</h2>
        <p className="text-[rgb(var(--c-primary-700))]">مشاهده وضعیت و گزارش‌های سیستم</p>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
            activeTab === 'overview'
              ? 'bg-[rgb(var(--c-primary-600))] text-white'
              : 'bg-white/50 hover:bg-white/80 text-[rgb(var(--c-primary-900))]'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>نمای کلی</span>
        </button>

        <button
          onClick={() => setActiveTab('activity')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
            activeTab === 'activity'
              ? 'bg-[rgb(var(--c-primary-600))] text-white'
              : 'bg-white/50 hover:bg-white/80 text-[rgb(var(--c-primary-900))]'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>گزارش فعالیت‌ها</span>
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
            activeTab === 'logs'
              ? 'bg-[rgb(var(--c-primary-600))] text-white'
              : 'bg-white/50 hover:bg-white/80 text-[rgb(var(--c-primary-900))]'
          }`}
        >
          <Terminal className="w-4 h-4" />
          <span>لاگ‌های سیستم</span>
        </button>
      </div>

      <div className="bg-white/30 backdrop-blur-sm rounded-lg p-4 md:p-6">
        <Suspense fallback={<LoadingFallback />}>
          {activeTab === 'overview' && <SystemReports />}
          {activeTab === 'activity' && <ActivityLog />}
          {activeTab === 'logs' && <SystemLogsData />}
        </Suspense>
      </div>
    </div>
  );
}
function checkReportAccess() {
  throw new Error('Function not implemented.');
}
