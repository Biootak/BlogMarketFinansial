'use client';

import { ChartSkeleton, StatsCardSkeleton } from '@/components/Skeletons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
;
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
} from '@/components/ui/chart';
import { ArrowUpRight, BarChart3, Download, Eye, FileText, Loader2, MessageSquare, TrendingUp, Users } from 'lucide-react';

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
      className={cn(
        'group relative overflow-hidden rounded-xl sm:rounded-2xl',
        'bg-white/80 backdrop-blur-sm',
        'border border-white/60',
        'shadow-md sm:shadow-lg shadow-gray-200/50',
        'hover:shadow-xl sm:hover:shadow-2xl hover:shadow-gray-300/40',
        'hover:border-white/80 hover:-translate-y-0.5 sm:hover:-translate-y-1',
        'transition-all duration-300 ease-out',
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Gradient Accent */}
      <div
        className={cn(
          'absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 -mr-8 -mt-8 sm:-mr-10 sm:-mt-10 rounded-full opacity-20 blur-xl sm:blur-2xl',
          gradient,
        )}
      />

      <div className="relative p-5 sm:p-6 md:p-7">
        <div className="flex items-start justify-between mb-4 sm:mb-5">
          <div
            className={cn(
              'p-2.5 sm:p-3 md:p-3.5 rounded-lg sm:rounded-xl shadow-md sm:shadow-lg flex-shrink-0',
              iconBg,
            )}
          >
            {icon}
          </div>
          <div className="flex items-center gap-1 sm:gap-1.5 text-emerald-600 text-xs sm:text-sm font-medium">
            <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4" />
            <span>+12%</span>
          </div>
        </div>

        <div className="space-y-2.5 sm:space-y-3 md:space-y-4">
          <p className="text-xs sm:text-sm font-medium text-gray-500 mb-1">{title}</p>
          <p className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight mb-3">
            {value.toLocaleString('fa-IR')}
          </p>

          <div className="flex flex-wrap gap-2 sm:gap-2.5">
            {badges.map((badge, idx) => (
              <span
                key={idx}
                className={cn(
                  'inline-flex items-center gap-1 sm:gap-1.5 px-2 py-1 sm:px-3 sm:py-1.5 rounded-md sm:rounded-lg text-[10px] sm:text-xs font-medium',
                  'bg-gray-100/80 text-gray-700',
                  'border border-gray-200/50',
                  'transition-colors duration-200',
                  'hover:bg-gray-200/80',
                )}
              >
                <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-current opacity-60" />
                <span className="truncate">
                  {badge.value.toLocaleString('fa-IR')} {badge.label}
                </span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Hover Effect Line */}
      <div
        className={cn(
          'absolute bottom-0 inset-x-0 h-0.5 sm:h-1 opacity-0 group-hover:opacity-100',
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
      <div className="bg-white/95 backdrop-blur-sm rounded-lg sm:rounded-xl p-3 sm:p-4 shadow-xl sm:shadow-2xl border border-gray-100 max-w-[200px] sm:max-w-none">
        <p className="font-semibold text-gray-900 mb-1.5 sm:mb-2 text-xs sm:text-sm truncate">
          {label}
        </p>
        <div className="space-y-1 sm:space-y-1.5">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
              <span
                className="w-2 h-2 sm:w-3 sm:h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-gray-600 truncate">{entry.name}:</span>
              <span className="font-medium text-gray-900 flex-shrink-0">
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

      // سازگاری با API جدید
      if (result.users) {
        // API جدید (DetailedSystemReport)
        setData({
          users: result.users.total,
          activeUsers: result.users.active,
          newUsers: result.users.newThisMonth,
          posts: result.posts.total,
          publishedPosts: result.posts.published,
          comments: result.comments?.total || 0,
          pendingComments: result.comments?.pending || 0,
          views: result.views.total,
          todayViews: result.views.today || 0,
        });
      } else if (result.userStats) {
        // API قدیمی (سازگاری با کد قبلی)
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
      } else {
        throw new Error('ساختار داده نامعتبر');
      }
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
    <div className="space-y-6 sm:space-y-8 md:space-y-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-5">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-gray-900">نمای کلی آمار</h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-1.5">خلاصه‌ای از وضعیت کلی سیستم</p>
        </div>
        <Button
          onClick={handleDownload}
          disabled={downloading}
          className={cn(
            'relative overflow-hidden rounded-lg sm:rounded-xl px-4 py-2 sm:px-5 sm:py-2.5 text-sm sm:text-base',
            'bg-gradient-to-l from-[rgb(var(--c-primary-600))] to-[rgb(var(--c-primary-700))]',
            'hover:from-[rgb(var(--c-primary-700))] hover:to-[rgb(var(--c-primary-800))]',
            'text-white font-medium shadow-lg shadow-[rgb(var(--c-primary-400))]/30',
            'hover:shadow-xl hover:shadow-[rgb(var(--c-primary-500))]/40',
            'transition-all duration-300',
            'disabled:opacity-70 disabled:cursor-not-allowed',
            'w-full sm:w-auto',
          )}
        >
          {downloading ? (
            <>
              <Loader2 className="ml-2 h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" />
              در حال دانلود...
            </>
          ) : (
            <>
              <Download className="ml-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
              دانلود گزارش
            </>
          )}
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 md:gap-6">
        {statCards.map((card, index) => (
          <StatCard key={card.title} {...card} delay={index * 100} />
        ))}
      </div>

      {/* Chart Section */}
      <div
        className={cn(
          'relative overflow-hidden rounded-xl sm:rounded-2xl',
          'bg-white/80 backdrop-blur-sm',
          'border border-white/60',
          'shadow-lg shadow-gray-200/50',
          'mt-6 sm:mt-8',
        )}
      >
        <div className="p-5 sm:p-6 md:p-7 border-b border-gray-100">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg flex-shrink-0">
              <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-sm sm:text-base text-gray-900 truncate">
                نمودار آماری
              </h3>
              <p className="text-xs sm:text-sm text-gray-500 truncate">مقایسه آمار بخش‌های مختلف</p>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-5 md:p-7">
          <div className="h-[250px] sm:h-[300px] md:h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barCategoryGap="15%">
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
                  tick={{ fill: '#6b7280', fontSize: 10 }}
                />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 10 }} />
                <Tooltip
                  content={<CustomTooltip />}
                  cursor={{ fill: 'rgba(59, 130, 246, 0.05)' }}
                />
                <Legend wrapperStyle={{ paddingTop: '12px', fontSize: '12px' }} />
                <Bar dataKey="تعداد" fill="url(#colorTotal)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="فعال" fill="url(#colorActive)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="جدید" fill="url(#colorNew)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="منتشرشده" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="درانتظار" fill="#ef4444" radius={[4, 4, 0, 0]} />
                <Bar dataKey="امروز" fill="#ec4899" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

// Import for chart icon

