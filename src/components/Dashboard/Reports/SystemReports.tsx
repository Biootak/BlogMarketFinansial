'use client';

import { ChartSkeleton, StatsCardSkeleton } from '@/components/Skeletons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import {
  ArrowUpRight,
  Download,
  Eye,
  FileText,
  Loader2,
  MessageSquare,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

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

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  badges: { label: string; value: number }[];
  gradient: string;
  iconBg: string;
  delay?: number;
}

function StatCard({ title, value, icon, badges, gradient, iconBg, delay = 0 }: StatCardProps) {
  return (
    <div
      className={cn('dash-panel dash-panel--hover group relative overflow-hidden')}
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Gradient Accent */}
      <div
        className={cn(
          'absolute top-0 right-0 w-32 h-32 -mr-10 -mt-10 rounded-full opacity-20 blur-2xl',
          gradient,
        )}
      />

      <div className="relative p-6">
        <div className="flex items-start justify-between mb-4">
          <div className={cn('p-3 rounded-xl shadow-lg', iconBg)}>{icon}</div>
          <div className="flex items-center gap-1 text-emerald-600 text-sm font-medium">
            <TrendingUp className="w-4 h-4" />
            <span>+12%</span>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
            {value.toLocaleString('fa-IR')}
          </p>

          <div className="flex flex-wrap gap-2 pt-2">
            {badges.map((badge, idx) => (
              <span
                key={idx}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium',
                  'bg-gray-100/80 dark:bg-white/10 text-gray-700 dark:text-gray-200',
                  'border border-gray-200/50',
                  'transition-colors duration-200',
                  'hover:bg-gray-200/80',
                )}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
                {badge.value.toLocaleString('fa-IR')} {badge.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Hover Effect Line */}
      <div
        className={cn(
          'absolute bottom-0 inset-x-0 h-1 opacity-0 group-hover:opacity-100',
          'transition-opacity duration-300',
          gradient,
        )}
      />
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 backdrop-blur-sm rounded-xl p-4 shadow-2xl border border-gray-100">
        <p className="font-semibold text-gray-900 dark:text-white mb-2">{label}</p>
        <div className="space-y-1.5">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-gray-600">{entry.name}:</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {entry.value?.toLocaleString('fa-IR')}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
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
        headers: { 'Content-Type': 'application/json' },
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
      toast({ title: 'موفقیت', description: 'گزارش با موفقیت دریافت شد', variant: 'success' });
    } catch (error) {
      console.error('Error downloading file:', error);
      toast({ title: 'خطا', description: 'خطا در دانلود فایل', variant: 'destructive' });
    } finally {
      setDownloading(false);
    }
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/system-reports', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
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
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({ title: 'خطا', description: 'خطا در دریافت گزارش', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <StatsCardSkeleton key={i} />
          ))}
        </div>
        <ChartSkeleton />
      </div>
    );
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

  const statCards = [
    {
      title: 'کاربران',
      value: data.users,
      icon: <Users className="w-5 h-5 text-white" />,
      badges: [
        { label: 'فعال', value: data.activeUsers },
        { label: 'جدید', value: data.newUsers },
      ],
      gradient: 'bg-gradient-to-br from-blue-500 to-indigo-600',
      iconBg: 'bg-gradient-to-br from-blue-500 to-indigo-600',
    },
    {
      title: 'پست‌ها',
      value: data.posts,
      icon: <FileText className="w-5 h-5 text-white" />,
      badges: [{ label: 'منتشر شده', value: data.publishedPosts }],
      gradient: 'bg-gradient-to-br from-violet-500 to-purple-600',
      iconBg: 'bg-gradient-to-br from-violet-500 to-purple-600',
    },
    {
      title: 'نظرات',
      value: data.comments,
      icon: <MessageSquare className="w-5 h-5 text-white" />,
      badges: [{ label: 'در انتظار تأیید', value: data.pendingComments }],
      gradient: 'bg-gradient-to-br from-amber-500 to-orange-600',
      iconBg: 'bg-gradient-to-br from-amber-500 to-orange-600',
    },
    {
      title: 'بازدیدها',
      value: data.views,
      icon: <Eye className="w-5 h-5 text-white" />,
      badges: [{ label: 'امروز', value: data.todayViews }],
      gradient: 'bg-gradient-to-br from-emerald-500 to-teal-600',
      iconBg: 'bg-gradient-to-br from-emerald-500 to-teal-600',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">نمای کلی آمار</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            خلاصه‌ای از وضعیت کلی سیستم
          </p>
        </div>
        <Button
          onClick={handleDownload}
          disabled={downloading}
          className={cn(
            'relative overflow-hidden rounded-xl px-5 py-2.5',
            'bg-gradient-to-l from-[rgb(var(--c-primary-600))] to-[rgb(var(--c-primary-700))]',
            'hover:from-[rgb(var(--c-primary-700))] hover:to-[rgb(var(--c-primary-800))]',
            'text-white font-medium shadow-lg shadow-[rgb(var(--c-primary-400))]/30',
            'hover:shadow-xl hover:shadow-[rgb(var(--c-primary-500))]/40',
            'transition-all duration-300',
            'disabled:opacity-70 disabled:cursor-not-allowed',
          )}
        >
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

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map((card, index) => (
          <StatCard key={card.title} {...card} delay={index * 100} />
        ))}
      </div>

      {/* Chart Section */}
      <div className={cn('dash-panel relative overflow-hidden')}>
        <div className="p-6 border-b border-gray-100 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">نمودار آماری</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">مقایسه آمار بخش‌های مختلف</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barCategoryGap="20%">
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.7} />
                  </linearGradient>
                  <linearGradient id="colorActive" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0.7} />
                  </linearGradient>
                  <linearGradient id="colorNew" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity={1} />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.7} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#6b7280', fontSize: 12 }}
                />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                <Tooltip
                  content={<CustomTooltip />}
                  cursor={{ fill: 'rgba(59, 130, 246, 0.05)' }}
                />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                <Bar dataKey="تعداد" fill="url(#colorTotal)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="فعال" fill="url(#colorActive)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="جدید" fill="url(#colorNew)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="منتشرشده" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                <Bar dataKey="درانتظار" fill="#ef4444" radius={[6, 6, 0, 0]} />
                <Bar dataKey="امروز" fill="#ec4899" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

// Import for chart icon
import { BarChart3 } from 'lucide-react';
