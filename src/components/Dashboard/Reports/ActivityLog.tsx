'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { getActivityLog } from '@/actions/reports/activityLogs';
import dynamic from 'next/dynamic';
import { Loader2, Activity, Clock } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { ActivityLog } from '@/actions/reports/activityLogs';

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
  const limit = 20;

  const fetchActivities = useCallback(async () => {
    try {
      setLoading(true);
      const result = await getActivityLog(page, limit);
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
  }, [page]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg">
          <Activity className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">گزارش فعالیت‌ها</h3>
          <p className="text-sm text-gray-500">تاریخچه فعالیت‌های کاربران سیستم</p>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div
          className={cn(
            'p-4 rounded-xl',
            'bg-gradient-to-br from-emerald-50 to-teal-50',
            'border border-emerald-100'
          )}
        >
          <div className="flex items-center gap-2 text-emerald-600 mb-1">
            <Activity className="w-4 h-4" />
            <span className="text-xs font-medium">کل فعالیت‌ها</span>
          </div>
          <p className="text-2xl font-bold text-emerald-700">{total.toLocaleString('fa-IR')}</p>
        </div>
        <div
          className={cn(
            'p-4 rounded-xl',
            'bg-gradient-to-br from-blue-50 to-indigo-50',
            'border border-blue-100'
          )}
        >
          <div className="flex items-center gap-2 text-blue-600 mb-1">
            <Clock className="w-4 h-4" />
            <span className="text-xs font-medium">صفحه فعلی</span>
          </div>
          <p className="text-2xl font-bold text-blue-700">{page.toLocaleString('fa-IR')}</p>
        </div>
        <div
          className={cn(
            'p-4 rounded-xl',
            'bg-gradient-to-br from-violet-50 to-purple-50',
            'border border-violet-100',
            'col-span-2 sm:col-span-1'
          )}
        >
          <div className="flex items-center gap-2 text-violet-600 mb-1">
            <Loader2 className="w-4 h-4" />
            <span className="text-xs font-medium">نمایش در صفحه</span>
          </div>
          <p className="text-2xl font-bold text-violet-700">{limit.toLocaleString('fa-IR')}</p>
        </div>
      </div>

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
