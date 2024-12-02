'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { 
  Loader2, 
  AlertCircle,
  Users,
  FileText,
  MessageCircle,
  BarChart
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';

interface ChartData {
  name: string;
  value: number;
}

interface SystemReport {
  userStats: {
    total: number;
    active: number;
    newThisMonth: number;
    roleDistribution: ChartData[];
  };
  postStats: {
    total: number;
    published: number;
    draft: number;
    monthlyPosts: {
      month: string;
      count: number;
    }[];
    categoryDistribution: ChartData[];
  };
  commentStats: {
    total: number;
    approved: number;
    pending: number;
    monthly: {
      month: string;
      count: number;
    }[];
  };
  viewStats: {
    total: number;
    monthly: {
      month: string;
      count: number;
    }[];
    topPosts: {
      title: string;
      views: number;
    }[];
  };
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function SystemReports() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SystemReport | null>(null);

  useEffect(() => {
    const loadReports = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch('/api/system-reports');
        if (!response.ok) {
          throw new Error('Failed to load system reports');
        }
        
        const result = await response.json();
        if (result.success) {
          setData(result.data);
        } else {
          throw new Error(result.message || 'Failed to load system reports');
        }
      } catch (error) {
        console.error('Error loading system reports:', error);
        setError('خطا در بارگذاری گزارش‌های سیستم');
        toast({
          title: 'خطا',
          description: 'خطا در بارگذاری گزارش‌های سیستم',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    loadReports();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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

  if (!data) {
    return null;
  }

  return (
    <div className="container mx-auto p-4 lg:p-8 min-h-screen" style={{ direction: 'rtl' }}>
      <div className="flex flex-col gap-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold">
            گزارش‌های سیستم
          </h1>
          <p className="text-sm text-muted-foreground">
            آخرین به‌روزرسانی: {new Date().toLocaleDateString('fa-IR')}
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <Card className="bg-white dark:bg-gray-800 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-semibold">کل کاربران</CardTitle>
              <Users className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-1">
                {data.userStats.total.toLocaleString('fa-IR')}
              </div>
              <p className="text-sm text-muted-foreground">
                {data.userStats.newThisMonth.toLocaleString('fa-IR')} کاربر جدید در این ماه
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-gray-800 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-semibold">مطالب منتشر شده</CardTitle>
              <FileText className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-1">
                {data.postStats.total.toLocaleString('fa-IR')}
              </div>
              <p className="text-sm text-muted-foreground">
                {data.postStats.published.toLocaleString('fa-IR')} مطلب منتشر شده
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-gray-800 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-semibold">نظرات</CardTitle>
              <MessageCircle className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-1">
                {data.commentStats.total.toLocaleString('fa-IR')}
              </div>
              <p className="text-sm text-muted-foreground">
                {data.commentStats.pending.toLocaleString('fa-IR')} نظر در انتظار تایید
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-gray-800 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-semibold">بازدید کل</CardTitle>
              <BarChart className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-1">
                {data.viewStats.total.toLocaleString('fa-IR')}
              </div>
              <p className="text-sm text-muted-foreground">
                از شروع فعالیت سایت
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* User Roles Distribution */}
          <Card className="bg-white dark:bg-gray-800 shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl font-bold">توزیع نقش‌های کاربران</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] w-full" style={{ direction: 'ltr' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.userStats.roleDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      outerRadius={120}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {data.userStats.roleDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend 
                      verticalAlign="bottom" 
                      height={36}
                      align="center"
                      layout="horizontal"
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Monthly Posts */}
          <Card className="bg-white dark:bg-gray-800 shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl font-bold">آمار مطالب ماهانه</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] w-full" style={{ direction: 'ltr' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={data.postStats.monthlyPosts}
                    layout="vertical"
                    mirror={true}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis 
                      dataKey="month" 
                      type="category"
                      orientation="right"
                      width={100}
                    />
                    <Tooltip />
                    <Legend 
                      verticalAlign="top"
                      align="center"
                      wrapperStyle={{ paddingBottom: '20px' }}
                    />
                    <Bar 
                      dataKey="count" 
                      name="تعداد مطالب" 
                      fill="#8884d8"
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Monthly Comments */}
          <Card className="bg-white dark:bg-gray-800 shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl font-bold">آمار نظرات ماهانه</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] w-full" style={{ direction: 'ltr' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart 
                    data={data.commentStats.monthly}
                    layout="vertical"
                    mirror={true}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis 
                      dataKey="month" 
                      type="category"
                      orientation="right"
                      width={100}
                    />
                    <Tooltip />
                    <Legend 
                      verticalAlign="top"
                      align="center"
                      wrapperStyle={{ paddingBottom: '20px' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="count" 
                      name="تعداد نظرات"
                      stroke="#8884d8" 
                      strokeWidth={2}
                      dot={{ r: 6 }}
                      activeDot={{ r: 8 }} 
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Monthly Views */}
          <Card className="bg-white dark:bg-gray-800 shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl font-bold">آمار بازدید ماهانه</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] w-full" style={{ direction: 'ltr' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart 
                    data={data.viewStats.monthly}
                    layout="vertical"
                    mirror={true}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis 
                      dataKey="month" 
                      type="category"
                      orientation="right"
                      width={100}
                    />
                    <Tooltip />
                    <Legend 
                      verticalAlign="top"
                      align="center"
                      wrapperStyle={{ paddingBottom: '20px' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="count" 
                      name="تعداد بازدید"
                      stroke="#82ca9d" 
                      strokeWidth={2}
                      dot={{ r: 6 }}
                      activeDot={{ r: 8 }} 
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Top Posts */}
        <Card className="bg-white dark:bg-gray-800 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-bold">پربازدیدترین مطالب</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.viewStats.topPosts.map((post, index) => (
                <div 
                  key={index} 
                  className="flex items-center justify-between p-4 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
                >
                  <span className="text-sm text-muted-foreground">
                    {post.views.toLocaleString('fa-IR')} بازدید
                  </span>
                  <span className="font-medium flex-1 mr-4">{post.title}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
