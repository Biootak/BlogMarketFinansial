'use client';

import { getActivityLog } from '@/actions/reports/activityLogs';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { formatDate } from '@/lib/utils';
import { useCallback, useEffect, useState } from 'react';

interface Activity {
  id: string;
  userId: string;
  action: string;
  details: string;
  createdAt: string;
  user: {
    name: string;
    email: string;
  };
}

export default function ActivityLogsData() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const limit = 10;

  const fetchActivities = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await getActivityLog(page, limit);
      
      if (result.success && result.data) {
        setActivities(result.data.activities);
        setTotal(result.data.total);
      } else {
        toast({
          variant: 'destructive',
          title: 'خطا',
          description: result.message || 'خطا در دریافت لاگ‌های فعالیت',
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'خطا',
        description: 'خطا در دریافت لاگ‌های فعالیت',
      });
    } finally {
      setIsLoading(false);
    }
  }, [page, toast]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>کاربر</TableHead>
              <TableHead>عملیات</TableHead>
              <TableHead>جزئیات</TableHead>
              <TableHead>تاریخ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {activities.map((activity) => (
              <TableRow key={activity.id}>
                <TableCell>{activity.user.name}</TableCell>
                <TableCell>{activity.action}</TableCell>
                <TableCell>{activity.details}</TableCell>
                <TableCell>{formatDate(activity.createdAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1 || isLoading}
        >
          قبلی
        </Button>
        <span>
          صفحه {page} از {totalPages}
        </span>
        <Button
          variant="outline"
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page >= totalPages || isLoading}
        >
          بعدی
        </Button>
      </div>
    </div>
  );
}
