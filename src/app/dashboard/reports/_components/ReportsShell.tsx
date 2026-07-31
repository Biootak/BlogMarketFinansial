'use client';

/**
 * ReportsShell — client component با tab switcher برای صفحه گزارش‌ها
 * page.tsx (Server Component) auth را enforce می‌کند، این فایل UI را مدیریت می‌کند.
 */

import { PageHeader } from '@/components/Dashboard/primitives';
import { ReportsSkeleton } from '@/components/Skeletons';
import { RefreshCw } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import {
  HiOutlineBanknotes,
  HiOutlineChartBar,
  HiOutlineCommandLine,
  HiOutlineSquares2X2,
} from 'react-icons/hi2';

const SystemReports = dynamic(() => import('@/components/Dashboard/Reports/SystemReports'), {
  loading: () => <ReportsSkeleton />,
  ssr: false,
});

const ActivityLog = dynamic(() => import('@/components/Dashboard/Reports/ActivityLog'), {
  loading: () => <ReportsSkeleton />,
  ssr: false,
});

const SystemLogsData = dynamic(() => import('../SystemLogsData'), {
  loading: () => <ReportsSkeleton />,
  ssr: false,
});

const FinanceReport = dynamic(() => import('@/components/Dashboard/Reports/FinanceReport'), {
  loading: () => <ReportsSkeleton />,
  ssr: false,
});

export default function ReportsShell() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('finance');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    router.refresh();
    setTimeout(() => setIsRefreshing(false), 800);
  }, [router]);

  const tabs = [
    {
      id: 'finance',
      label: 'گزارش مالی',
      icon: HiOutlineBanknotes,
      component: <FinanceReport />,
    },
    {
      id: 'overview',
      label: 'نمای کلی بلاگ',
      icon: HiOutlineSquares2X2,
      component: <SystemReports />,
    },
    {
      id: 'activity',
      label: 'فعالیت‌ها',
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
        breadcrumb={[{ label: 'داشبورد', href: '/dashboard' }, { label: 'گزارش‌ها' }]}
        eyebrow="تحلیل"
        title="گزارش‌ها"
        description="گزارش‌های سیستمی، فعالیت‌ها و لاگ‌های رویداد"
        icon="bar-chart"
        accent="cyan"
        actions={
          <button
            type="button"
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

      {/* Content */}
      <div className="at-form-section">
        <div className="at-form-section__body" style={{ minHeight: '480px' }}>
          {activeTabData?.component}
        </div>
      </div>
    </div>
  );
}
