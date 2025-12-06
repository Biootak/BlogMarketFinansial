'use client';

import { getAuthorAnalytics } from '@/actions/reportActions';
import type { TopPost } from '@/actions/reportActions';
import { toast } from '@/components/ui/use-toast';
import { RefreshCw, User } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { DateRangePicker } from './DateRangePicker';
import { KPICards } from './KPICards';
import { TopPostsTable } from './TopPostsTable';

export function AuthorAnalyticsView() {
  const { data: session } = useSession();
  const [data, setData] = useState<{
    totalViews: number;
    engagementRate: number;
    topPosts: TopPost[];
    postCount: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
    to: new Date(),
  });

  const fetchData = async () => {
    if (!session?.user?.id) return;

    setIsLoading(true);
    try {
      const result = await getAuthorAnalytics(session.user.id, dateRange);
      if (result.success && result.data) {
        setData(result.data);
      } else {
        toast({
          title: 'خطا',
          description: result.message || 'خطا در دریافت آمار نویسنده',
          variant: 'destructive',
        });
      }
    } catch (_error) {
      toast({
        title: 'خطا',
        description: 'خطا در دریافت آمار نویسنده',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dateRange, session]);

  const handleRefresh = () => {
    fetchData();
  };

  // Convert author data to KPI format
  const kpiData = data
    ? {
        totalUsers: data.postCount,
        userGrowth: 0,
        totalPosts: {
          published: data.postCount,
          draft: 0,
          pending: 0,
        },
        pageViews: data.totalViews,
        engagementRate: data.engagementRate,
      }
    : null;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-2 sm:gap-3">
          <div className="p-2 sm:p-3 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg sm:rounded-xl flex-shrink-0">
            <User className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">آمار نویسنده</h2>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5 sm:mt-1 truncate">
              عملکرد و آمار پست‌های شما
            </p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
          <div className="flex-1 min-w-0">
            <DateRangePicker value={dateRange} onChange={setDateRange} />
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isLoading}
            className="p-2 sm:p-2.5 bg-white border border-gray-200 rounded-lg sm:rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50 flex-shrink-0"
            title="بروزرسانی"
          >
            <RefreshCw
              className={`w-4 h-4 sm:w-5 sm:h-5 text-gray-600 ${isLoading ? 'animate-spin' : ''}`}
            />
          </button>
        </div>
      </div>

      {/* KPI Cards - Modified for Author */}
      {kpiData && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-gray-200 shadow-lg">
            <div className="inline-flex p-2 sm:p-3 rounded-lg sm:rounded-xl mb-3 sm:mb-4 gradient-primary-br shadow-lg">
              <User className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
            </div>
            <h3 className="text-xs sm:text-sm font-medium text-gray-600 mb-1.5 sm:mb-2 truncate">
              تعداد پست‌ها
            </h3>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900 truncate">
              {data?.postCount.toLocaleString('fa-IR')}
            </p>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-gray-200 shadow-lg">
            <div className="inline-flex p-2 sm:p-3 rounded-lg sm:rounded-xl mb-3 sm:mb-4 bg-gradient-to-br from-purple-500 to-pink-600 shadow-lg">
              <svg
                className="w-4 h-4 sm:w-6 sm:h-6 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
            </div>
            <h3 className="text-xs sm:text-sm font-medium text-gray-600 mb-1.5 sm:mb-2 truncate">
              کل بازدیدها
            </h3>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900 truncate">
              {data?.totalViews.toLocaleString('fa-IR')}
            </p>
          </div>

          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-gray-200 shadow-lg">
            <div className="inline-flex p-2 sm:p-3 rounded-lg sm:rounded-xl mb-3 sm:mb-4 gradient-success-br shadow-lg">
              <svg
                className="w-4 h-4 sm:w-6 sm:h-6 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                />
              </svg>
            </div>
            <h3 className="text-xs sm:text-sm font-medium text-gray-600 mb-1.5 sm:mb-2 truncate">
              نرخ تعامل
            </h3>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900 truncate">
              {data?.engagementRate.toFixed(2)}%
            </p>
          </div>

          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-gray-200 shadow-lg">
            <div className="inline-flex p-2 sm:p-3 rounded-lg sm:rounded-xl mb-3 sm:mb-4 gradient-warning-br shadow-lg">
              <svg
                className="w-4 h-4 sm:w-6 sm:h-6 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
            <h3 className="text-xs sm:text-sm font-medium text-gray-600 mb-1.5 sm:mb-2 truncate">
              میانگین بازدید
            </h3>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900 truncate">
              {data && data.postCount > 0
                ? Math.round(data.totalViews / data.postCount).toLocaleString('fa-IR')
                : '0'}
            </p>
          </div>
        </div>
      )}

      {/* Top Posts */}
      {data && data.topPosts.length > 0 && (
        <div>
          <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4 truncate">
            محبوب‌ترین پست‌های شما
          </h3>
          <TopPostsTable data={data.topPosts} isLoading={isLoading} />
        </div>
      )}

      {/* Empty State */}
      {data && data.postCount === 0 && (
        <div className="bg-white rounded-xl sm:rounded-2xl p-8 sm:p-12 border border-gray-200 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 rounded-full mb-3 sm:mb-4">
            <User className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-1.5 sm:mb-2">
            هنوز پستی منتشر نکرده‌اید
          </h3>
          <p className="text-sm sm:text-base text-gray-600">
            پس از انتشار پست‌های خود، آمار آن‌ها در اینجا نمایش داده می‌شود.
          </p>
        </div>
      )}
    </div>
  );
}
