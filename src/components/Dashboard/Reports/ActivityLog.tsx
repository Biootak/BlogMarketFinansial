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
  const [activities, setActivities] = useState<Activity[]>([]);

  useEffect(() => {
    const loadActivities = async () => {
      try {
        const response = await fetch('/api/activity-log');
        const result = await response.json();
        
        if (result.success) {
          setActivities(result.data);
        } else {
          throw new Error('Failed to load activity log');
        }
      } catch (error) {
        console.error('Error loading activity log:', error);
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
  }, [toast]);

  if (loading) {
    return <div>در حال بارگذاری...</div>;
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">تاریخچه فعالیت‌ها</h3>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>تاریخ</TableHead>
              <TableHead>کاربر</TableHead>
              <TableHead>عملیات</TableHead>
              <TableHead>جزئیات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {activities.map((activity) => (
              <TableRow key={activity.id}>
                <TableCell>
                  {new Date(activity.createdAt).toLocaleDateString('fa-IR')}
                </TableCell>
                <TableCell>{activity.userEmail}</TableCell>
                <TableCell>{activity.action}</TableCell>
                <TableCell>{activity.details}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
