'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Server, Database, Clock, Download, Loader2 } from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
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
  todayViews: 0,
};

export default function SystemReports() {
  const [data, setData] = useState<SystemReportData>(defaultData);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    try {
      setDownloading(true);
      const response = await fetch('/api/system-reports/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) throw new Error('خطا در دانلود فایل');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'system-report.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast({
        title: 'موفقیت',
        description: 'گزارش با موفقیت دریافت شد',
        variant: 'success',
      });
    } catch (error) {
      console.error('Error downloading file:', error);
      toast({
        title: 'خطا',
        description: 'خطا در دانلود فایل',
        variant: 'destructive',
      });
    } finally {
      setDownloading(false);
    }
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/system-reports', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error details:', errorData);
        throw new Error('خطا در دریافت اطلاعات');
      }
      const result = await response.json();
      setData({
        users: result.userStats.total,
        activeUsers: result.userStats.active,
        newUsers: result.userStats.newThisMonth,
        posts: result.postStats.total,
        publishedPosts: result.postStats.published,
        comments: result.commentStats?.total || 0,
        pendingComments: result.commentStats?.pending || 0,
        views: result.viewStats.total,
        todayViews: result.viewStats.today || 0,
      });
      toast({
        title: 'موفقیت',
        description: 'گزارش با موفقیت دریافت شد',
        variant: 'success',
      });
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'خطا',
        description: 'خطا در دریافت گزارش',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return <Loading />;
  }

  const chartData = [
    {
      key: 'users',
      name: 'کاربران',
      تعداد: data.users,
      فعال: data.activeUsers,
      جدید: data.newUsers,
    },
    { key: 'posts', name: 'پست‌ها', تعداد: data.posts, منتشرشده: data.publishedPosts },
    { key: 'comments', name: 'نظرات', تعداد: data.comments, درانتظار: data.pendingComments },
    { key: 'views', name: 'بازدیدها', تعداد: data.views, امروز: data.todayViews },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">گزارش‌های سیستم</h2>
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={handleDownload} disabled={downloading}>
            {downloading ? (
              <>
                <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                در حال دانلود...
              </>
            ) : (
              <>
                <Download className="ml-2 h-4 w-4" />
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
            <div className="flex items-center gap-2">
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
