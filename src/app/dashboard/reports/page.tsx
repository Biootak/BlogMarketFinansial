'use client';

import { useState } from 'react';
import { Activity, BarChart3, Terminal, RefreshCw } from 'lucide-react';
import dynamic from 'next/dynamic';
import { ReportsSkeleton } from '@/components/Skeletons';
import { PageHeader } from '@/components/Dashboard/primitives';
import { HiOutlineSquares2X2, HiOutlineChartBar, HiOutlineCommandLine } from 'react-icons/hi2';

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
      icon: HiOutlineSquares2X2,
      component: <SystemReports />,
    },
    {
      id: 'activity',
      label: 'گزارش فعالیت‌ها',
      icon: HiOutlineChartBar,
      component: <ActivityLog />,
    },
    {
      id: 'logs',
      label: 'لاگ‌های سیستم',
      icon: HiOutlineCommandLine,
      component: <SystemLogsData />,
    },
  ];

  const activeTabData = tabs.find((tab) => tab.id === activeTab);

  return (
    <div className="at-page" dir="rtl">
      <PageHeader
        breadcrumb={[
          { label: 'داشبورد', href: '/dashboard' },
          { label: 'گزارش‌ها' },
        ]}
        eyebrow="تحلیل"
        title="گزارش‌ها"
        description="گزارش‌های سیستمی، فعالیت‌ها و لاگ‌های رویداد"
        actions={
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="at-btn at-btn--icon"
            aria-label="به‌روزرسانی"
            title="به‌روزرسانی"
          >
            <RefreshCw className={`size-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        }
      />

      {/* Tab bar — atelier */}
      <nav className="at-form-tabs" role="tablist" style={{ marginBottom: '18px' }}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(tab.id)}
              className={`at-form-tab ${isActive ? 'is-active' : ''}`}
            >
              <Icon className="size-4" />
              {tab.label}
            </button>
          );
        })}
      </nav>

      {/* Content card */}
      <div className="at-form-section">
        <div className="at-form-section__body" style={{ minHeight: '480px' }}>
          {activeTabData?.component}
        </div>
      </div>
    </div>
  );
}