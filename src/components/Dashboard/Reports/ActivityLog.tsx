'use client';

import {
  type ActivityFilters,
  getActivityLog,
  getActivityStats,
  getActivityUsers,
} from '@/actions/reports/activityLogs';
import type { ActivityLog } from '@/actions/reports/activityLogs';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { Activity, Clock, Download, Loader2, TrendingUp } from 'lucide-react';
import dynamic from 'next/dynamic';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { ActivityFilters as ActivityFiltersComponent } from './ActivityFilters';

const ActivityTable = dynamic(() => import('@/components/Dashboard/Reports/ActivityTable'), {
  loading: () => (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    </div>
  ),
});

export default function ActivityLogComponent() {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState<ActivityFilters>({});
  const [users, setUsers] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [stats, setStats] = useState<{
    totalActivities: number;
    last24HoursCount: number;
    topActions: Array<{ action: string; count: number }>;
  } | null>(null);
  const limit = 20;

  // دریافت لیست کاربران
  useEffect(() => {
    const fetchUsers = async () => {
      const result = await getActivityUsers();
      if (result.success && result.data) {
        setUsers(
          result.data.map((user) => ({
            ...user,
            name: user.name || 'کاربر ناشناس',
          })),
        );
      }
    };
    fetchUsers();
  }, []);

  // دریافت آمار
  const fetchStats = useCallback(async () => {
    const result = await getActivityStats(filters);
    if (result.success && result.data) {
      setStats(result.data);
    }
  }, [filters]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const fetchActivities = useCallback(async () => {
    try {
      setLoading(true);
      const result = await getActivityLog(page, limit, filters);
      if (result.success && result.data) {
        setActivities(
          result.data.activities.map((activity) => ({
            ...activity,
            createdAt: new Date(activity.createdAt),
            userEmail: activity.user.email,
            user: {
              ...activity.user,
              name: activity.user.name || 'کاربر ناشناس',
            },
          })),
        );
        setTotal(result.data.total);
      } else {
        toast({
          title: 'خطا',
          description: result.message || 'خطا در دریافت گزارش فعالیت‌ها',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'خطا',
        description: error instanceof Error ? error.message : 'خطا در دریافت گزارش فعالیت‌ها',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  const handleFilterChange = (newFilters: ActivityFilters) => {
    setFilters(newFilters);
    setPage(1); // بازگشت به صفحه اول
  };

  // Export به CSV
  const handleExport = () => {
    try {
      const headers = ['کاربر', 'ایمیل', 'عملیات', 'جزئیات', 'زمان'];
      const rows = activities.map((activity) => [
        activity.user.name,
        activity.user.email,
        activity.action,
        activity.details,
        new Intl.DateTimeFormat('fa-IR', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        }).format(new Date(activity.createdAt)),
      ]);

      const csvContent = [headers, ...rows].map((row) => row.join(',')).join('\n');
      const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `activity-log-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();

      toast({
        title: 'موفق',
        description: 'گزارش با موفقیت دانلود شد',
      });
    } catch (_error) {
      toast({
        title: 'خطا',
        description: 'خطا در دانلود گزارش',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-start sm:items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <div className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl gradient-success-br shadow-lg flex-shrink-0">
            <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm sm:text-base font-semibold text-gray-900 truncate">
              گزارش فعالیت‌ها
            </h3>
            <p className="text-xs sm:text-sm text-gray-500 truncate">
              تاریخچه فعالیت‌های کاربران سیستم
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleExport}
          disabled={activities.length === 0}
          className="flex items-center justify-center gap-1.5 sm:gap-2 px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg sm:rounded-xl bg-gradient-to-l from-blue-600 to-blue-700 text-white font-semibold text-xs sm:text-sm hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
        >
          <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span>دانلود CSV</span>
        </button>
      </div>

      {/* Stats Summary */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <div
            className={cn(
              'p-3 sm:p-4 rounded-lg sm:rounded-xl',
              'bg-gradient-to-br from-emerald-50 to-teal-50',
              'border border-emerald-100',
            )}
          >
            <div className="flex items-center gap-1.5 sm:gap-2 text-emerald-600 mb-0.5 sm:mb-1">
              <Activity className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="text-[10px] sm:text-xs font-medium truncate">کل فعالیت‌ها</span>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-emerald-700 truncate">
              {stats.totalActivities.toLocaleString('fa-IR')}
            </p>
          </div>
          <div
            className={cn(
              'p-3 sm:p-4 rounded-lg sm:rounded-xl',
              'bg-gradient-to-br from-blue-50 to-indigo-50',
              'border border-blue-100',
            )}
          >
            <div className="flex items-center gap-1.5 sm:gap-2 text-blue-600 mb-0.5 sm:mb-1">
              <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="text-[10px] sm:text-xs font-medium truncate">24 ساعت گذشته</span>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-blue-700 truncate">
              {stats.last24HoursCount.toLocaleString('fa-IR')}
            </p>
          </div>
          <div
            className={cn(
              'p-3 sm:p-4 rounded-lg sm:rounded-xl',
              'bg-gradient-to-br from-violet-50 to-purple-50',
              'border border-violet-100',
            )}
          >
            <div className="flex items-center gap-1.5 sm:gap-2 text-violet-600 mb-0.5 sm:mb-1">
              <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="text-[10px] sm:text-xs font-medium truncate">پرتکرارترین</span>
            </div>
            <p className="text-xs sm:text-sm font-bold text-violet-700 truncate">
              {stats.topActions[0]?.action || '-'}
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <ActivityFiltersComponent onFilterChange={handleFilterChange} users={users} />

      {/* Table */}
      <Suspense
        fallback={
          <div className="flex items-center justify-center p-8">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-[rgb(var(--c-primary-500))]" />
              <span className="text-sm text-gray-500">در حال بارگذاری...</span>
            </div>
          </div>
        }
      >
        <ActivityTable
          activities={activities}
          loading={loading}
          page={page}
          total={total}
          limit={limit}
          onPageChange={setPage}
        />
      </Suspense>
    </div>
  );
}
