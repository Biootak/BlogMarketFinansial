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
import type React from 'react';
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

  // 2026-08-perf: تعریف tabs بدون component — رندر lazy روی tab فعال.
  // قبلاً همه ۴ component (SystemReports، FinanceReport، ActivityLog، SystemLogs)
  // هنگام mount با هم رندر می‌شدند (حتی اگر فقط یکی دیده می‌شد). recharts و
  // تمام side-effect های fetch آن‌ها اجرا می‌شدند. حالا فقط component tab
  // فعال mount می‌شود.
  const tabIds = ['finance', 'overview', 'activity', 'logs'] as const;
  type TabId = (typeof tabIds)[number];

  const tabs: Array<{
    id: TabId;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { id: 'finance', label: 'گزارش مالی', icon: HiOutlineBanknotes },
    { id: 'overview', label: 'نمای کلی بلاگ', icon: HiOutlineSquares2X2 },
    { id: 'activity', label: 'فعالیت‌ها', icon: HiOutlineChartBar },
    { id: 'logs', label: 'لاگ‌های سیستم', icon: HiOutlineCommandLine },
  ];

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'finance':
        return <FinanceReport />;
      case 'overview':
        return <SystemReports />;
      case 'activity':
        return <ActivityLog />;
      case 'logs':
        return <SystemLogsData />;
      default:
        return null;
    }
  };

  return (
    <div className="at-page" dir="rtl">
      <PageHeader
        variant="minimal"
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
          {renderActiveTab()}
        </div>
      </div>
    </div>
  );
}
