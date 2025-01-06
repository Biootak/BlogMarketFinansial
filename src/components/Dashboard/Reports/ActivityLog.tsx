'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { getActivityLog } from '@/actions/reports/activityLogs';
import type { Activity } from '@/actions/reports/activityLogs';
import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const ActivityTable = dynamic(() => import('@/components/Dashboard/Reports/ActivityTable'), {
  loading: () => (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-16 w-full" />
        ))}
      </div>
    </div>
  ),
});

export default function ActivityLog() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const fetchActivities = useCallback(async () => {
    try {
      setLoading(true);
      const result = await getActivityLog(page, limit);
      if (result.success && result.data) {
        setActivities(result.data.activities.map(activity => ({
          ...activity,
          createdAt: new Date(activity.createdAt),
          user: {
            ...activity.user,
            name: activity.user.name || 'کاربر ناشناس'
          }
        })));
        setTotal(result.data.total);
      } else {
        toast({
          variant: "destructive",
          title: "خطا",
          description: result.message || "خطا در دریافت گزارش فعالیت‌ها"
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "خطا",
        description: error instanceof Error ? error.message : "خطا در دریافت گزارش فعالیت‌ها"
      });
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">گزارش فعالیت‌ها</h3>
      <Suspense fallback={<div className="flex items-center justify-center p-4"><Loader2 className="animate-spin" /></div>}>
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
