'use client';

import { useEffect, useState, useCallback } from 'react';
import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import {
  Users,
  FileText,
  MessageSquare,
  Eye,
  TrendingUp,
  Download,
  RefreshCw,
  Clock,
  Zap,
  Database,
  Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DetailedSystemReport } from '@/lib/reports/reportService';

export default function AdvancedSystemReports() {
  const [data, setData] = useState<DetailedSystemReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/system-reports');
      
      if (!response.ok) {
        throw new Error('خطا در دریافت اطلاعات');
      }
      
      const result = await response.json();
      setData(result);
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

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleClearCache = async () => {
    try {
      const response = await fetch('/api/system-reports/clear-cache', {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('خطا در پاک کردن کش');
      }
      
      toast({
        title: 'موفقیت',
        description: 'کش با موفقیت پاک شد',
        variant: 'success',
      });
      
      await fetchData();
    } catch (error) {
      toast({
        title: 'خطا',
        description: 'خطا در پاک کردن کش',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-gray-600">در حال بارگذاری گزارش‌ها...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Performance Metrics */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-600" />
            <span className="text-sm text-gray-700">
              زمان پردازش: <strong>{data.performance.queryTime}ms</strong>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-emerald-600" />
            <span className="text-sm text-gray-700">
              {data.performance.cacheHit ? (
                <span className="text-emerald-600 font-semibold">از کش</span>
              ) : (
                <span className="text-amber-600 font-semibold">از دیتابیس</span>
              )}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-purple-600" />
            <span className="text-sm text-gray-700">
              کش: <strong>{data.system.cache.size} آیتم</strong>
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            onClick={handleClearCache}
            variant="outline"
            size="sm"
            className="text-xs"
          >
            پاک کردن کش
          </Button>
          <Button
            onClick={handleRefresh}
            disabled={refreshing}
            variant="outline"
            size="sm"
            className="text-xs"
          >
            {refreshing ? (
              <RefreshCw className="w-3 h-3 animate-spin" />
            ) : (
              <RefreshCw className="w-3 h-3" />
            )}
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Users Card */}
        <StatsCard
          title="کاربران"
          value={data.users.total}
          icon={<Users className="w-5 h-5 text-white" />}
          gradient="from-blue-500 to-indigo-600"
          details={[
            { label: 'فعال', value: data.users.active },
            { label: 'امروز', value: data.users.newToday },
            { label: 'این هفته', value: data.users.newThisWeek },
            { label: 'این ماه', value: data.users.newThisMonth },
          ]}
          growth={data.users.growthRate}
        />

        {/* Posts Card */}
        <StatsCard
          title="پست‌ها"
          value={data.posts.total}
          icon={<FileText className="w-5 h-5 text-white" />}
          gradient="from-violet-500 to-purple-600"
          details={[
            { label: 'منتشر شده', value: data.posts.published },
            { label: 'پیش‌نویس', value: data.posts.draft },
            { label: 'در انتظار', value: data.posts.pendingReview },
          ]}
          growth={0}
        />

        {/* Comments Card */}
        <StatsCard
          title="نظرات"
          value={data.comments.total}
          icon={<MessageSquare className="w-5 h-5 text-white" />}
          gradient="from-amber-500 to-orange-600"
          details={[
            { label: 'تأیید شده', value: data.comments.approved },
            { label: 'در انتظار', value: data.comments.pending },
            { label: 'امروز', value: data.comments.todayCount },
          ]}
          growth={0}
        />

        {/* Views Card */}
        <StatsCard
          title="بازدیدها"
          value={data.views.total}
          icon={<Eye className="w-5 h-5 text-white" />}
          gradient="from-emerald-500 to-teal-600"
          details={[
            { label: 'امروز', value: data.views.today },
            { label: 'این هفته', value: data.views.thisWeek },
            { label: 'این ماه', value: data.views.thisMonth },
          ]}
          growth={0}
        />
      </div>

      {/* Detailed Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Authors */}
        <div className="p-6 bg-white rounded-xl border border-gray-200 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-purple-600" />
            نویسندگان برتر
          </h3>
          <div className="space-y-3">
            {data.posts.topAuthors.map((author, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div>
                  <p className="font-semibold text-gray-900">{author.name}</p>
                  <p className="text-sm text-gray-500">
                    {author.postCount} پست • {author.totalViews.toLocaleString('fa-IR')} بازدید
                  </p>
                </div>
                <div className="text-2xl font-bold text-purple-600">#{idx + 1}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Posts */}
        <div className="p-6 bg-white rounded-xl border border-gray-200 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
            پست‌های پربازدید
          </h3>
          <div className="space-y-3">
            {data.views.topPosts.slice(0, 5).map((post, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{post.title}</p>
                  <p className="text-sm text-gray-500">
                    {post.views.toLocaleString('fa-IR')} بازدید
                  </p>
                </div>
                <div className="text-2xl font-bold text-emerald-600">#{idx + 1}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

interface StatsCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  gradient: string;
  details: Array<{ label: string; value: number }>;
  growth: number;
}

function StatsCard({ title, value, icon, gradient, details, growth }: StatsCardProps) {
  return (
    <div className="relative overflow-hidden rounded-xl bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className={cn('p-3 rounded-xl shadow-lg bg-gradient-to-br', gradient)}>
            {icon}
          </div>
          {growth > 0 && (
            <div className="flex items-center gap-1 text-emerald-600 text-sm font-medium">
              <TrendingUp className="w-4 h-4" />
              <span>+{growth.toFixed(1)}%</span>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-3xl font-bold text-gray-900">
            {value.toLocaleString('fa-IR')}
          </p>

          <div className="flex flex-wrap gap-2 pt-2">
            {details.map((detail, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
                {detail.value.toLocaleString('fa-IR')} {detail.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
