'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Activity {
  id: string;
  action: string;
  userId: string;
  userEmail: string;
  details: string;
  createdAt: string;
}

export default function ActivityLog() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);

  useEffect(() => {
    const loadActivities = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch('/api/activity-log');
        
        if (!response.ok) {
          throw new Error('Failed to load activity log');
        }
        
        const result = await response.json();
        if (result.success) {
          setActivities(result.data);
        } else {
          throw new Error(result.message || 'Failed to load activity log');
        }
      } catch (error) {
        console.error('Error loading activity log:', error);
        setError('خطا در بارگذاری تاریخچه فعالیت‌ها');
        toast({
          title: 'خطا',
          description: 'خطا در بارگذاری تاریخچه فعالیت‌ها',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    loadActivities();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">تاریخچه فعالیت‌ها</h3>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[150px]">کاربر</TableHead>
              <TableHead className="w-[120px]">عملیات</TableHead>
              <TableHead>جزئیات</TableHead>
              <TableHead className="w-[180px] text-left">زمان</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {activities.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  هیچ فعالیتی ثبت نشده است
                </TableCell>
              </TableRow>
            ) : (
              activities.map((activity) => (
                <TableRow key={activity.id}>
                  <TableCell className="font-medium">
                    {activity.userEmail}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {activity.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="whitespace-pre-wrap">
                    {activity.details}
                  </TableCell>
                  <TableCell className="text-left font-mono text-xs">
                    {new Date(activity.createdAt).toLocaleString('fa-IR')}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
