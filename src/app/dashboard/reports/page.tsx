'use client';

import { useEffect, useState } from 'react';
import { Activity, BarChart3, Terminal, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getSystemReports } from '@/actions/reportActions';
import { useRouter } from 'next/navigation';
import { toast } from '@/components/ui/use-toast';
import dynamic from 'next/dynamic';
import Loading from '@/components/Loading';

// کامپوننت‌های داینامیک
const SystemReports = dynamic(() => import('@/components/Dashboard/Reports/SystemReports'), {
  loading: () => <Loading />,
  ssr: false,
});

const ActivityLog = dynamic(() => import('@/components/Dashboard/Reports/ActivityLog'), {
  loading: () => <Loading />,
  ssr: false,
});

const SystemLogsData = dynamic(() => import('./SystemLogsData'), {
  loading: () => <Loading />,
  ssr: false,
});

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('overview');

  const tabs = [
    {
      id: 'overview',
      label: 'نمای کلی',
      icon: <BarChart3 className="w-4 h-4" />,
      component: <SystemReports />,
    },
    {
      id: 'activity',
      label: 'گزارش فعالیت‌ها',
      icon: <Activity className="w-4 h-4" />,
      component: <ActivityLog />,
    },
    {
      id: 'logs',
      label: 'لاگ‌های سیستم',
      icon: <Terminal className="w-4 h-4" />,
      component: <SystemLogsData />,
    },
  ];

  return (
    <div
      className="container py-4 md:py-6 lg:py-8 min-h-screen bg-gradient-to-br from-[rgb(var(--c-primary-50))] to-[rgb(var(--c-primary-100))]"
      dir="rtl"
    >
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-[rgb(var(--c-primary-900))]">گزارش‌های سیستم</h2>
          <p className="text-[rgb(var(--c-primary-700))]">مشاهده وضعیت و گزارش‌های سیستم</p>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => window.location.reload()}
          className="hover:bg-[rgb(var(--c-primary-100))] transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
              activeTab === tab.id
                ? 'bg-[rgb(var(--c-primary-600))] text-white shadow-lg'
                : 'bg-white/50 hover:bg-white/80 text-[rgb(var(--c-primary-900))]'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="bg-white/30 backdrop-blur-sm rounded-lg p-4 md:p-6 shadow-lg min-h-[400px]">
        {tabs.find((tab) => tab.id === activeTab)?.component}
      </div>
    </div>
  );
}
