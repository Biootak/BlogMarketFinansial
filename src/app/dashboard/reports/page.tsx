'use client';

import { useState } from 'react';
import { Activity, BarChart3, Terminal, RefreshCw, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import dynamic from 'next/dynamic';
import { ReportsSkeleton } from '@/components/Skeletons';
import { cn } from '@/lib/utils';

const SystemReports = dynamic(() => import('@/components/Dashboard/Reports/SystemReports'), {
  loading: () => <ReportsSkeleton />,
  ssr: false,
});

const ActivityLog = dynamic(() => import('@/components/Dashboard/Reports/ActivityLog'), {
  loading: () => <ReportsSkeleton />,
  ssr: false,
});

const SystemLogsData = dynamic(() => import('./SystemLogsData'), {
  loading: () => <ReportsSkeleton />,
  ssr: false,
});

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      window.location.reload();
    }, 300);
  };

  const tabs = [
    {
      id: 'overview',
      label: 'نمای کلی',
      icon: <BarChart3 className="w-4 h-4" />,
      component: <SystemReports />,
      gradient: 'from-blue-500 to-indigo-600',
    },
    {
      id: 'activity',
      label: 'گزارش فعالیت‌ها',
      icon: <Activity className="w-4 h-4" />,
      component: <ActivityLog />,
      gradient: 'from-emerald-500 to-teal-600',
    },
    {
      id: 'logs',
      label: 'لاگ‌های سیستم',
      icon: <Terminal className="w-4 h-4" />,
      component: <SystemLogsData />,
      gradient: 'from-amber-500 to-orange-600',
    },
  ];

  const activeTabData = tabs.find((tab) => tab.id === activeTab);

  return (
    <div className="min-h-screen py-6 md:py-8 lg:py-10 px-4 md:px-6" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Section */}
        <header className="relative">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-[rgb(var(--c-primary-500))] to-[rgb(var(--c-primary-700))] rounded-xl blur-lg opacity-40" />
                  <div className="relative p-3 bg-gradient-to-br from-[rgb(var(--c-primary-500))] to-[rgb(var(--c-primary-700))] rounded-xl shadow-lg">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-l from-[rgb(var(--c-primary-900))] to-[rgb(var(--c-primary-700))] bg-clip-text text-transparent">
                    گزارش‌های سیستم
                  </h1>
                  <p className="text-sm md:text-base text-[rgb(var(--c-primary-600))] mt-1">
                    مشاهده وضعیت، آمار و گزارش‌های جامع سیستم
                  </p>
                </div>
              </div>
            </div>

            <Button
              variant="outline"
              size="icon"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className={cn(
                'relative w-11 h-11 rounded-xl border-2 border-[rgb(var(--c-primary-200))]',
                'bg-white/80 backdrop-blur-sm shadow-lg shadow-[rgb(var(--c-primary-200))]/20',
                'hover:bg-[rgb(var(--c-primary-50))] hover:border-[rgb(var(--c-primary-300))]',
                'hover:shadow-xl hover:shadow-[rgb(var(--c-primary-300))]/30',
                'transition-all duration-300 ease-out',
                'group'
              )}
            >
              <RefreshCw
                className={cn(
                  'w-5 h-5 text-[rgb(var(--c-primary-600))] group-hover:text-[rgb(var(--c-primary-700))]',
                  'transition-all duration-300',
                  isRefreshing && 'animate-spin'
                )}
              />
            </Button>
          </div>
        </header>

        {/* Tabs Navigation */}
        <nav className="relative">
          <div className="flex flex-wrap gap-3">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'relative flex items-center gap-2.5 px-5 py-3 rounded-xl font-medium text-sm',
                    'transition-all duration-300 ease-out',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--c-primary-500))] focus-visible:ring-offset-2',
                    isActive
                      ? [
                          'bg-gradient-to-l',
                          tab.gradient,
                          'text-white shadow-lg',
                          'hover:shadow-xl hover:scale-[1.02]',
                        ]
                      : [
                          'bg-white/70 backdrop-blur-sm',
                          'border border-[rgb(var(--c-primary-200))]',
                          'text-[rgb(var(--c-primary-700))]',
                          'hover:bg-white hover:border-[rgb(var(--c-primary-300))]',
                          'hover:shadow-md hover:shadow-[rgb(var(--c-primary-200))]/30',
                        ]
                  )}
                >
                  <span
                    className={cn(
                      'transition-transform duration-300',
                      isActive && 'scale-110'
                    )}
                  >
                    {tab.icon}
                  </span>
                  <span>{tab.label}</span>
                  {isActive && (
                    <span className="absolute inset-0 rounded-xl bg-white/10 animate-pulse" />
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Content Area */}
        <main className="relative">
          {/* Glass Card Container */}
          <div className="dash-panel relative overflow-hidden">
            {/* Top Gradient Line */}
            <div
              className={cn(
                'absolute top-0 inset-x-0 h-1 bg-gradient-to-l',
                activeTabData?.gradient || 'from-blue-500 to-indigo-600'
              )}
            />

            {/* Inner Glow Effect */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/40 to-transparent dark:from-white/[0.03] pointer-events-none" />

            {/* Content */}
            <div className="relative p-6 md:p-8 lg:p-10 min-h-[500px]">
              {activeTabData?.component}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
