'use client';

/**
 * ReportsShell 2026 — Command-Room Layout
 * یک صفحه‌ی «اتاق کنترل» با tab indicator slide + asymmetric layout.
 * هیچ hex رنگ نیست — فقط DS tokens.
 */

import { PageHeader } from '@/components/Dashboard/primitives';
import { ReportsSkeleton } from '@/components/Skeletons';
import { RefreshCw } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  HiOutlineBanknotes,
  HiOutlineChartBar,
  HiOutlineCommandLine,
  HiOutlineSquares2X2,
} from 'react-icons/hi2';
import s from './ReportsShell.module.css';

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

const tabIds = ['finance', 'overview', 'activity', 'logs'] as const;
type TabId = (typeof tabIds)[number];

interface Tab {
  id: TabId;
  label: string;
  desc: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  accent: string;
}

const TABS: Tab[] = [
  {
    id: 'finance',
    label: 'گزارش مالی',
    desc: 'تراکنش‌ها · صرافی‌ها · تسویه‌ها',
    icon: HiOutlineBanknotes,
    accent: 'emerald',
  },
  {
    id: 'overview',
    label: 'نمای کلی',
    desc: 'بلاگ · کاربران · بازدیدها',
    icon: HiOutlineSquares2X2,
    accent: 'violet',
  },
  {
    id: 'activity',
    label: 'فعالیت‌ها',
    desc: 'تاریخچه · رویدادها · کاربران',
    icon: HiOutlineChartBar,
    accent: 'cyan',
  },
  {
    id: 'logs',
    label: 'لاگ سیستم',
    desc: 'خطاها · هشدارها · رویدادها',
    icon: HiOutlineCommandLine,
    accent: 'rose',
  },
];

export default function ReportsShell() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>('finance');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, []);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    router.refresh();
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = setTimeout(() => setIsRefreshing(false), 800);
  }, [router]);

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

  const activeIdx = TABS.findIndex((t) => t.id === activeTab);

  return (
    <div className={s.shell} dir="rtl">
      {/* ── Page Header ── */}
      <PageHeader
        variant="minimal"
        breadcrumb={[{ label: 'داشبورد', href: '/dashboard' }, { label: 'گزارش‌ها' }]}
        eyebrow="تحلیل و آمار"
        title="گزارش‌ها"
        description="داده‌های مالی، فعالیت کاربران و وضعیت سیستم"
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

      {/* ── Tab Navigation ── */}
      <nav className={s.tabNav} role="tablist" aria-label="بخش‌های گزارش">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`tabpanel-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`${s.tabItem} ${isActive ? s.tabItemActive : ''}`}
              data-accent={tab.accent}
            >
              <span className={s.tabIconWrap} aria-hidden>
                <Icon size={18} />
              </span>
              <span className={s.tabText}>
                <span className={s.tabLabel}>{tab.label}</span>
                <span className={s.tabDesc}>{tab.desc}</span>
              </span>
              {isActive && <span className={s.tabPip} aria-hidden />}
            </button>
          );
        })}

        {/* Slide indicator — positioniert via CSS custom prop */}
        <span
          className={s.tabSlider}
          style={{ '--tab-idx': activeIdx } as React.CSSProperties}
          aria-hidden
        />
      </nav>

      {/* ── Tab Content ── */}
      <div
        id={`tabpanel-${activeTab}`}
        role="tabpanel"
        aria-label={TABS.find((t) => t.id === activeTab)?.label}
        className={s.contentPanel}
      >
        {renderActiveTab()}
      </div>
    </div>
  );
}
