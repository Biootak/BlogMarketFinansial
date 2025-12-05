'use client';

import { useState } from 'react';
import { Activity, Terminal, Sparkles } from 'lucide-react';
import dynamic from 'next/dynamic';
import { ReportsSkeleton } from '@/components/Skeletons';
import {
  ReportHeader,
  ReportTabs,
  ReportContainer,
  ReportBackground,
  type ReportTab,
} from '@/components/Dashboard/Reports';

const ActivityLog = dynamic(() => import('@/components/Dashboard/Reports/ActivityLog'), {
  loading: () => <ReportsSkeleton />,
  ssr: false,
});

const SystemLogsData = dynamic(() => import('./SystemLogsData'), {
  loading: () => <ReportsSkeleton />,
  ssr: false,
});

const ComprehensiveReportView = dynamic(
  () => import('./components/ComprehensiveReportView').then((mod) => ({ default: mod.ComprehensiveReportView })),
  {
    loading: () => <ReportsSkeleton />,
    ssr: false,
  }
);

const AuthorAnalyticsView = dynamic(
  () => import('./components/AuthorAnalyticsView').then((mod) => ({ default: mod.AuthorAnalyticsView })),
  {
    loading: () => <ReportsSkeleton />,
    ssr: false,
  }
);

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('comprehensive');

  const tabs: ReportTab[] = [
    {
      id: 'comprehensive',
      label: 'گزارش جامع',
      icon: Sparkles,
      gradient: 'from-purple-500 via-purple-600 to-pink-600',
      glowColor: 'rgba(168, 85, 247, 0.5)',
    },
    {
      id: 'author',
      label: 'آمار نویسنده',
      icon: Activity,
      gradient: 'from-pink-500 via-rose-600 to-red-600',
      glowColor: 'rgba(236, 72, 153, 0.5)',
    },
    {
      id: 'activity',
      label: 'گزارش فعالیت‌ها',
      icon: Activity,
      gradient: 'from-emerald-500 via-emerald-600 to-teal-600',
      glowColor: 'rgba(16, 185, 129, 0.5)',
    },
    {
      id: 'logs',
      label: 'لاگ‌های سیستم',
      icon: Terminal,
      gradient: 'from-amber-500 via-amber-600 to-orange-600',
      glowColor: 'rgba(245, 158, 11, 0.5)',
    },
  ];

  const activeTabData = tabs.find((tab) => tab.id === activeTab);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'comprehensive':
        return <ComprehensiveReportView />;
      case 'author':
        return <AuthorAnalyticsView />;
      case 'activity':
        return <ActivityLog />;
      case 'logs':
        return <SystemLogsData />;
      default:
        return <ComprehensiveReportView />;
    }
  };

  return (
    <div className="min-h-screen py-4 sm:py-6 md:py-10 lg:py-14 px-3 sm:px-4 md:px-6 lg:px-8" dir="rtl">
      <ReportBackground />

      <div className="max-w-[1400px] mx-auto space-y-6 sm:space-y-8 md:space-y-10 lg:space-y-12">
        <ReportHeader />

        <ReportTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

        <ReportContainer gradient={activeTabData?.gradient}>
          {renderTabContent()}
        </ReportContainer>
      </div>
    </div>
  );
}
