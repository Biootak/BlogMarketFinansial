'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Server, Database, Clock, Download, Loader2 } from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import type { DayRange } from '@hassanmojab/react-modern-calendar-datepicker';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';
import Loading from '@/components/Loading';
import { Users, FileText, MessageSquare, Eye } from 'lucide-react';

interface SystemReportData {
  users: number;
  activeUsers: number;
  newUsers: number;
  posts: number;
  publishedPosts: number;
  comments: number;
  pendingComments: number;
  views: number;
  todayViews: number;
}

const defaultData: SystemReportData = {
  users: 0,
  activeUsers: 0,
  newUsers: 0,
  posts: 0,
  publishedPosts: 0,
  comments: 0,
  pendingComments: 0,
  views: 0,
  todayViews: 0
};

export default function SystemReports() {
  const [data, setData] = useState<SystemReportData>(defaultData);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DayRange | null>({
    from: { year: 2025, month: 1, day: 1 },
    to: { year: 2025, month: 1, day: 8 }
  });
  console.log('Initial dateRange:', dateRange);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    if (!dateRange?.from || !dateRange?.to) {
      return;
    }
    
    try {
      setDownloading(true);
      const body = {
        from: new Date(dateRange.from.year, dateRange.from.month - 1, dateRange.from.day).toISOString(),
        to: new Date(dateRange.to.year, dateRange.to.month - 1, dateRange.to.day).toISOString()
      };
      
      const response = await fetch('/api/system-reports/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });
      if (!response.ok) throw new Error('خطا در دانلود فایل');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `system-report-${body.from}-to-${body.to}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading file:', error);
      toast({
        variant: "destructive",
        title: "خطا",
        description: "خطا در دانلود فایل",
      });
    } finally {
      setDownloading(false);
    }
  };

  const fetchData = useCallback(async () => {
    console.log('fetchData called');
    if (!dateRange?.from || !dateRange?.to) {
      return;
    }

    try {
      setLoading(true);
      const url = `/api/system-reports?from=${new Date(dateRange.from.year, dateRange.from.month - 1, dateRange.from.day).toISOString()}&to=${new Date(dateRange.to.year, dateRange.to.month - 1, dateRange.to.day).toISOString()}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
      });
      console.log('Response Status:', response.status);
      const result = await response.json();
      console.log('Data received:', result);
      if (!response.ok) throw new Error('خطا در دریافت اطلاعات');
      
      setData({
        users: result.userStats.total,
        activeUsers: result.userStats.active,
        newUsers: result.userStats.newThisMonth,
        posts: result.postStats.total,
        publishedPosts: result.postStats.published,
        comments: result.commentStats?.total || 0,
        pendingComments: result.commentStats?.pending || 0,
        views: result.viewStats.total,
        todayViews: result.viewStats.today || 0
      });
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        variant: "destructive",
        title: "خطا",
        description: "خطا در دریافت اطلاعات",
      });
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    console.log('useEffect called with dateRange:', dateRange);
    if (dateRange?.from && dateRange?.to) {
      fetchData();
    }
  }, [dateRange, fetchData]);

  if (loading) {
    return <Loading />;
  }

  const chartData = [
    { name: 'کاربران', تعداد: data.users, فعال: data.activeUsers, جدید: data.newUsers },
    { name: 'پست‌ها', تعداد: data.posts, منتشرشده: data.publishedPosts },
    { name: 'نظرات', تعداد: data.comments, درانتظار: data.pendingComments },
    { name: 'بازدیدها', تعداد: data.views, امروز: data.todayViews },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">گزارش‌های سیستم</h2>
        <div className="flex items-center gap-4">
          <DatePickerWithRange
            date={dateRange}
            onDateChange={setDateRange}
          />
          <Button
            variant="outline"
            onClick={handleDownload}
            disabled={downloading || !dateRange?.from || !dateRange?.to}
          >
            {downloading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                در حال دانلود...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                دانلود گزارش
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">کاربران</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.users.toLocaleString()}</div>
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <Badge variant="secondary">{data.activeUsers} فعال</Badge>
              <Badge variant="secondary">{data.newUsers} جدید</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">پست‌ها</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.posts.toLocaleString()}</div>
            <Badge variant="secondary">{data.publishedPosts} منتشر شده</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">نظرات</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.comments.toLocaleString()}</div>
            <Badge variant="secondary">{data.pendingComments} در انتظار تأیید</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">بازدیدها</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.views.toLocaleString()}</div>
            <Badge variant="secondary">{data.todayViews} امروز</Badge>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>نمودار آماری</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="تعداد" fill="#3b82f6" />
                <Bar dataKey="فعال" fill="#10b981" />
                <Bar dataKey="جدید" fill="#f59e0b" />
                <Bar dataKey="منتشرشده" fill="#8b5cf6" />
                <Bar dataKey="درانتظار" fill="#ef4444" />
                <Bar dataKey="امروز" fill="#ec4899" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
