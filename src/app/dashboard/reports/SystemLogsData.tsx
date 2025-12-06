'use client';

import {
  type SystemLogFilters,
  getSystemLogSources,
  getSystemLogStats,
  getSystemLogs,
} from '@/actions/reports/systemLogs';
import {
  AlertCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Code,
  Download,
  Eye,
  Info,
  Terminal,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { SystemLogDetailModal } from '@/components/Dashboard/Reports/SystemLogDetailModal';
import { SystemLogFilters as SystemLogFiltersComponent } from '@/components/Dashboard/Reports/SystemLogFilters';
import { ReportsSkeleton } from '@/components/Skeletons';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

interface SystemLog {
  id: string;
  level: string;
  message: string;
  source: string;
  timestamp: Date;
}

function getLevelConfig(level: string) {
  switch (level.toUpperCase()) {
    case 'ERROR':
      return {
        icon: <AlertCircle className="w-4 h-4" />,
        bg: 'bg-red-100',
        text: 'text-red-700',
        border: 'border-red-200',
        label: 'خطا',
        gradient: 'from-red-500 to-rose-600',
      };
    case 'WARNING':
      return {
        icon: <AlertTriangle className="w-4 h-4" />,
        bg: 'bg-amber-100',
        text: 'text-amber-700',
        border: 'border-amber-200',
        label: 'هشدار',
        gradient: 'from-amber-500 to-orange-600',
      };
    case 'INFO':
      return {
        icon: <Info className="w-4 h-4" />,
        bg: 'bg-blue-100',
        text: 'text-blue-700',
        border: 'border-blue-200',
        label: 'اطلاعات',
        gradient: 'from-blue-500 to-indigo-600',
      };
    default:
      return {
        icon: <Info className="w-4 h-4" />,
        bg: 'bg-gray-100',
        text: 'text-gray-700',
        border: 'border-gray-200',
        label: level,
        gradient: 'from-gray-500 to-gray-600',
      };
  }
}

export default function SystemLogsData() {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [total, setTotal] = useState<number>(0);
  const [filters, setFilters] = useState<SystemLogFilters>({});
  const [sources, setSources] = useState<string[]>([]);
  const [stats, setStats] = useState<{
    totalLogs: number;
    last24Hours: number;
    errorCount: number;
    warningCount: number;
    infoCount: number;
  } | null>(null);
  const [selectedLog, setSelectedLog] = useState<SystemLog | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const limit = 10;

  // دریافت لیست منابع
  useEffect(() => {
    const fetchSources = async () => {
      const result = await getSystemLogSources();
      if (result.success && result.data) {
        setSources(result.data);
      }
    };
    fetchSources();
  }, []);

  // دریافت آمار
  const fetchStats = useCallback(async () => {
    const result = await getSystemLogStats(filters);
    if (result.success && result.data) {
      setStats(result.data);
    }
  }, [filters]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const result = await getSystemLogs(page, limit, filters);

      if (result.success && result.data) {
        setLogs(result.data.logs);
        setTotal(result.data.total);
      } else {
        toast({
          variant: 'destructive',
          title: 'خطا',
          description: result.message || 'خطا در دریافت لاگ‌ها',
        });
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
      toast({
        variant: 'destructive',
        title: 'خطا',
        description: error instanceof Error ? error.message : 'خطا در دریافت لاگ‌ها',
      });
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleFilterChange = (newFilters: SystemLogFilters) => {
    setFilters(newFilters);
    setPage(1); // بازگشت به صفحه اول
  };

  const handleViewDetails = (log: SystemLog) => {
    setSelectedLog(log);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedLog(null);
  };

  // Export به CSV
  const handleExport = () => {
    try {
      const headers = ['سطح', 'پیام', 'منبع', 'زمان'];
      const rows = logs.map((log) => [
        log.level,
        log.message,
        log.source,
        new Intl.DateTimeFormat('fa-IR', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        }).format(new Date(log.timestamp)),
      ]);

      const csvContent = [headers, ...rows].map((row) => row.join(',')).join('\n');
      const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `system-logs-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();

      toast({
        title: 'موفق',
        description: 'گزارش با موفقیت دانلود شد',
      });
    } catch (_error) {
      toast({
        title: 'خطا',
        description: 'خطا در دانلود گزارش',
        variant: 'destructive',
      });
    }
  };

  const totalPages = Math.ceil(total / limit);

  if (loading) {
    return <ReportsSkeleton />;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start sm:items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <div className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl gradient-warning-br shadow-lg flex-shrink-0">
            <Terminal className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm sm:text-lg font-semibold text-gray-900 truncate">
              لاگ‌های سیستم
            </h3>
            <p className="text-xs sm:text-sm text-gray-500 truncate">مشاهده و تحلیل لاگ‌های سیستم</p>
          </div>
        </div>

        {/* Export Button */}
        <Button
          onClick={handleExport}
          disabled={logs.length === 0}
          className="flex items-center justify-center gap-1.5 sm:gap-2 px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg sm:rounded-xl bg-gradient-to-l from-blue-600 to-blue-700 text-white font-semibold text-xs sm:text-sm hover:shadow-lg transition-all duration-200 flex-shrink-0"
        >
          <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span>دانلود CSV</span>
        </Button>
      </div>

      {/* Stats Summary */}
      {stats && (
        <div className="grid grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-3 lg:grid-cols-5 sm:gap-4">
          <div
            className={cn(
              'p-3 sm:p-4 rounded-lg sm:rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100',
            )}
          >
            <div className="flex items-center gap-1.5 sm:gap-2 text-amber-600 mb-1 sm:mb-2">
              <Terminal className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="text-[10px] sm:text-xs font-medium truncate">کل لاگ‌ها</span>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-amber-700 truncate">
              {stats.totalLogs.toLocaleString('fa-IR')}
            </p>
          </div>

          <div
            className={cn(
              'p-3 sm:p-4 rounded-lg sm:rounded-xl bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-100',
            )}
          >
            <div className="flex items-center gap-1.5 sm:gap-2 text-purple-600 mb-1 sm:mb-2">
              <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="text-[10px] sm:text-xs font-medium truncate">24 ساعت</span>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-purple-700 truncate">
              {stats.last24Hours.toLocaleString('fa-IR')}
            </p>
          </div>

          <div
            className={cn(
              'p-3 sm:p-4 rounded-lg sm:rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100',
            )}
          >
            <div className="flex items-center gap-1.5 sm:gap-2 text-blue-600 mb-1 sm:mb-2">
              <Info className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="text-[10px] sm:text-xs font-medium truncate">اطلاعات</span>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-blue-700 truncate">
              {stats.infoCount.toLocaleString('fa-IR')}
            </p>
          </div>

          <div
            className={cn(
              'p-3 sm:p-4 rounded-lg sm:rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100',
            )}
          >
            <div className="flex items-center gap-1.5 sm:gap-2 text-amber-600 mb-1 sm:mb-2">
              <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="text-[10px] sm:text-xs font-medium truncate">هشدار</span>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-amber-700 truncate">
              {stats.warningCount.toLocaleString('fa-IR')}
            </p>
          </div>

          <div
            className={cn(
              'p-3 sm:p-4 rounded-lg sm:rounded-xl bg-gradient-to-br from-red-50 to-rose-50 border border-red-100',
            )}
          >
            <div className="flex items-center gap-1.5 sm:gap-2 text-red-600 mb-1 sm:mb-2">
              <AlertCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="text-[10px] sm:text-xs font-medium truncate">خطا</span>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-red-700 truncate">
              {stats.errorCount.toLocaleString('fa-IR')}
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <SystemLogFiltersComponent onFilterChange={handleFilterChange} sources={sources} />

      {/* Desktop Table View */}
      <div
        className={cn(
          'hidden md:block overflow-hidden rounded-xl bg-white border border-gray-200 shadow-sm',
        )}
      >
        <div className="overflow-x-auto scrollbar-custom">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700">سطح</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700">پیام</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700">منبع</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700">زمان</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700">
                  عملیات
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="p-4 rounded-xl bg-gray-100">
                        <Terminal className="w-8 h-8 text-gray-400" />
                      </div>
                      <div>
                        <p className="text-gray-700 font-medium">هیچ لاگی یافت نشد</p>
                        <p className="text-sm text-gray-500">
                          لاگ‌های سیستم اینجا نمایش داده می‌شوند
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const config = getLevelConfig(log.level);
                  return (
                    <tr
                      key={log.id}
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium',
                            config.bg,
                            config.text,
                          )}
                        >
                          {config.icon}
                          {config.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-700 line-clamp-2">{log.message}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-gray-100 text-gray-700">
                          {log.source}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-600 whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleString('fa-IR')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDetails(log)}
                            className="h-8 w-8 p-0"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-2 sm:space-y-3">
        {logs.length === 0 ? (
          <div className="flex flex-col items-center gap-2 sm:gap-3 py-8 sm:py-12 px-3 sm:px-4 bg-white rounded-lg sm:rounded-xl border border-gray-200">
            <div className="p-3 sm:p-4 rounded-lg sm:rounded-xl bg-gray-100">
              <Terminal className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />
            </div>
            <div className="text-center">
              <p className="text-sm sm:text-base text-gray-700 font-medium">هیچ لاگی یافت نشد</p>
              <p className="text-xs sm:text-sm text-gray-500">
                لاگ‌های سیستم اینجا نمایش داده می‌شوند
              </p>
            </div>
          </div>
        ) : (
          logs.map((log) => {
            const config = getLevelConfig(log.level);
            return (
              <div
                key={log.id}
                className="p-3 sm:p-4 rounded-lg sm:rounded-xl bg-white border border-gray-200"
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-2 sm:mb-3 pb-2 sm:pb-3 border-b border-gray-100 gap-2">
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 sm:gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md sm:rounded-lg text-[10px] sm:text-xs font-medium',
                      config.bg,
                      config.text,
                    )}
                  >
                    {config.icon}
                    {config.label}
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md sm:rounded-lg text-[10px] sm:text-xs font-medium bg-gray-100 text-gray-700 truncate max-w-[120px]">
                    {log.source}
                  </span>
                </div>

                {/* Message */}
                <div className="mb-2 sm:mb-3">
                  <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">{log.message}</p>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-2 sm:pt-3 border-t border-gray-100 gap-2">
                  <span className="text-[10px] sm:text-xs text-gray-500 truncate">
                    {new Date(log.timestamp).toLocaleString('fa-IR')}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleViewDetails(log)}
                    className="h-7 sm:h-8 px-2 sm:px-3 text-xs"
                  >
                    <Eye className="w-3 h-3 sm:w-4 sm:h-4 ml-1" />
                    جزئیات
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between p-4 bg-white rounded-xl border border-gray-200">
        <div className="text-sm text-gray-600">
          نمایش{' '}
          <span className="font-semibold">
            {Math.min(page * limit, total).toLocaleString('fa-IR')}
          </span>{' '}
          از <span className="font-semibold">{total.toLocaleString('fa-IR')}</span> مورد
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>

          <div className="hidden sm:flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages || 1) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) pageNum = i + 1;
              else if (page <= 3) pageNum = i + 1;
              else if (page >= totalPages - 2) pageNum = totalPages - 4 + i;
              else pageNum = page - 2 + i;
              return (
                <Button
                  key={pageNum}
                  variant={page === pageNum ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPage(pageNum)}
                  className="w-9 h-9"
                >
                  {pageNum.toLocaleString('fa-IR')}
                </Button>
              );
            })}
          </div>

          <div className="sm:hidden px-3 py-1.5 bg-gray-100 rounded-lg text-sm font-medium">
            {page.toLocaleString('fa-IR')} / {totalPages.toLocaleString('fa-IR')}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => p + 1)}
            disabled={page * limit >= total}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Detail Modal */}
      <SystemLogDetailModal log={selectedLog} isOpen={isModalOpen} onClose={handleCloseModal} />
    </div>
  );
}
