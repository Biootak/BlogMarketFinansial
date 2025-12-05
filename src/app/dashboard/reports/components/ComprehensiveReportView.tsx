'use client';

import { useEffect, useState } from 'react';
import { getReportData, getComparisonData, type ReportData } from '@/actions/reportActions';
import { KPICards } from './KPICards';
import { TrendChart } from './TrendChart';
import { CategoryDistribution } from './CategoryDistribution';
import { TopPostsTable } from './TopPostsTable';
import { TopAuthorsTable } from './TopAuthorsTable';
import { DateRangePicker } from './DateRangePicker';
import { ExportButton } from './ExportButton';
import { ReportErrorBoundary } from './ReportErrorBoundary';
import { DatabaseStatus } from './DatabaseStatus';
import { toast } from '@/components/ui/use-toast';
import { RefreshCw, TrendingUp, TrendingDown, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ComprehensiveReportView() {
  const [data, setData] = useState<ReportData | null>(null);
  const [comparison, setComparison] = useState<{
    userGrowth: number;
    viewGrowth: number;
    engagementGrowth: number;
  } | null>(null);
  const [showComparison, setShowComparison] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
    to: new Date(),
  });

  const fetchData = async () => {
    setIsLoading(true);
    
    // Check if this is a large date range
    const daysDiff = Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24));
    const isLargeRange = daysDiff > 365;
    
    if (isLargeRange) {
      toast({
        title: 'در حال پردازش...',
        description: 'بازه زمانی بزرگ است، لطفاً صبر کنید',
      });
    }
    
    try {
      const [reportResult, comparisonResult] = await Promise.all([
        getReportData(dateRange),
        getComparisonData(dateRange),
      ]);

      if (reportResult.success && reportResult.data) {
        setData(reportResult.data);
      } else {
        toast({
          title: 'خطا',
          description: reportResult.message || 'خطا در دریافت گزارش‌ها',
          variant: 'destructive',
        });
      }

      if (comparisonResult.success && comparisonResult.data) {
        setComparison(comparisonResult.data);
      }
    } catch (error) {
      toast({
        title: 'خطا',
        description: 'خطا در دریافت گزارش‌ها',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  const handleRefresh = () => {
    fetchData();
  };

  return (
    <ReportErrorBoundary>
      <div className="space-y-4 sm:space-y-6">
        {/* Database Status */}
        <DatabaseStatus />

        {/* Header with Date Range Picker */}
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">گزارش جامع</h2>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              آمار و تحلیل کامل عملکرد سیستم
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
            <div className="flex-1 min-w-0">
              <DateRangePicker value={dateRange} onChange={setDateRange} />
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              {data && <ExportButton data={data} dateRange={dateRange} disabled={isLoading} />}
              <button
                type="button"
                onClick={() => setShowComparison(!showComparison)}
                className={cn(
                  'p-2 sm:p-2.5 border rounded-lg sm:rounded-xl transition-colors flex-shrink-0',
                  showComparison
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                )}
                title={showComparison ? 'مخفی کردن مقایسه' : 'نمایش مقایسه'}
              >
                <Eye className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await fetch('/api/reports/clear-cache', { method: 'POST' });
                    toast({
                      title: 'موفق',
                      description: 'کش پاک شد، در حال بروزرسانی...',
                    });
                    handleRefresh();
                  } catch (error) {
                    toast({
                      title: 'خطا',
                      description: 'خطا در پاک کردن کش',
                      variant: 'destructive',
                    });
                  }
                }}
                disabled={isLoading}
                className="p-2 sm:p-2.5 bg-white border border-gray-200 rounded-lg sm:rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50 flex-shrink-0"
                title="پاک کردن کش و بروزرسانی"
              >
                <RefreshCw className={cn('w-4 h-4 sm:w-5 sm:h-5 text-gray-600', isLoading && 'animate-spin')} />
              </button>
            </div>
          </div>
        </div>

        {/* Comparison Stats */}
        {showComparison && comparison && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] sm:text-xs text-gray-500 mb-0.5 sm:mb-1 truncate">رشد کاربران</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900 truncate">
                    {comparison.userGrowth.toFixed(1)}%
                  </p>
                </div>
                {comparison.userGrowth >= 0 ? (
                  <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-500 flex-shrink-0" />
                ) : (
                  <TrendingDown className="w-6 h-6 sm:w-8 sm:h-8 text-red-500 flex-shrink-0" />
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] sm:text-xs text-gray-500 mb-0.5 sm:mb-1 truncate">رشد بازدیدها</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900 truncate">
                    {comparison.viewGrowth.toFixed(1)}%
                  </p>
                </div>
                {comparison.viewGrowth >= 0 ? (
                  <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-500 flex-shrink-0" />
                ) : (
                  <TrendingDown className="w-6 h-6 sm:w-8 sm:h-8 text-red-500 flex-shrink-0" />
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] sm:text-xs text-gray-500 mb-0.5 sm:mb-1 truncate">رشد تعاملات</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900 truncate">
                    {comparison.engagementGrowth.toFixed(1)}%
                  </p>
                </div>
                {comparison.engagementGrowth >= 0 ? (
                  <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-500 flex-shrink-0" />
                ) : (
                  <TrendingDown className="w-6 h-6 sm:w-8 sm:h-8 text-red-500 flex-shrink-0" />
                )}
              </div>
            </div>
          </div>
        )}

        {/* KPI Cards */}
        {data && <KPICards data={data.kpis} isLoading={isLoading} />}

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {data && (
            <>
              <TrendChart data={data.trends} metric="views" isLoading={isLoading} />
              <CategoryDistribution data={data.categories} isLoading={isLoading} />
            </>
          )}
        </div>

        {/* Engagement Trend */}
        {data && (
          <TrendChart data={data.trends} metric="engagement" isLoading={isLoading} />
        )}

        {/* Tables Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {data && (
            <>
              <TopPostsTable data={data.topPosts} isLoading={isLoading} />
              <TopAuthorsTable data={data.topAuthors} isLoading={isLoading} />
            </>
          )}
        </div>
      </div>
    </ReportErrorBoundary>
  );
}
