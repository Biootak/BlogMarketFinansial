'use client';

import { useEffect, useState, useCallback } from 'react';
import { getSystemLogs } from '@/actions/reportActions';
import {
  AlertCircle,
  Info,
  AlertTriangle,
  Terminal,
  ChevronRight,
  ChevronLeft,
  Filter,
  Clock,
  Code,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { ReportsSkeleton } from '@/components/Skeletons';
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
  const [level, setLevel] = useState<string>('all');
  const limit = 10;

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const result = await getSystemLogs(page, limit, level === 'all' ? undefined : level);

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
  }, [page, level]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const totalPages = Math.ceil(total / limit);

  if (loading) {
    return <ReportsSkeleton />;
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Premium Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/30">
            <Terminal className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-gray-900">لاگ‌های سیستم</h3>
            <p className="text-xs sm:text-sm text-gray-500">مشاهده و فیلتر لاگ‌های سیستم</p>
          </div>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500">
            <Filter className="w-4 h-4" />
            <span className="hidden sm:inline">فیلتر:</span>
          </div>
          <Select value={level} onValueChange={setLevel}>
            <SelectTrigger
              className={cn(
                'w-[140px] sm:w-[160px] rounded-xl',
                'border-2 border-gray-200 hover:border-[rgb(var(--c-primary-300))]',
                'bg-white/90 backdrop-blur-sm',
                'focus:ring-2 focus:ring-[rgb(var(--c-primary-200))]',
                'transition-all duration-200 shadow-sm'
              )}
            >
              <SelectValue placeholder="انتخاب سطح" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-gray-200 shadow-2xl">
              <SelectItem value="all" className="rounded-lg">همه</SelectItem>
              <SelectItem value="INFO" className="rounded-lg">اطلاعات</SelectItem>
              <SelectItem value="WARNING" className="rounded-lg">هشدار</SelectItem>
              <SelectItem value="ERROR" className="rounded-lg">خطا</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <div
          className={cn(
            'p-3 sm:p-4 rounded-xl sm:rounded-2xl',
            'bg-gradient-to-br from-blue-50 to-indigo-50',
            'border-2 border-blue-100',
            'shadow-md hover:shadow-lg transition-shadow duration-200'
          )}
        >
          <div className="flex items-center gap-1.5 sm:gap-2 text-blue-600 mb-1 sm:mb-2">
            <Info className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="text-[10px] sm:text-xs font-semibold">اطلاعات</span>
          </div>
          <p className="text-lg sm:text-xl md:text-2xl font-black text-blue-700">
            {logs.filter((l) => l.level === 'INFO').length.toLocaleString('fa-IR')}
          </p>
        </div>

        <div
          className={cn(
            'p-3 sm:p-4 rounded-xl sm:rounded-2xl',
            'bg-gradient-to-br from-amber-50 to-orange-50',
            'border-2 border-amber-100',
            'shadow-md hover:shadow-lg transition-shadow duration-200'
          )}
        >
          <div className="flex items-center gap-1.5 sm:gap-2 text-amber-600 mb-1 sm:mb-2">
            <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="text-[10px] sm:text-xs font-semibold">هشدار</span>
          </div>
          <p className="text-lg sm:text-xl md:text-2xl font-black text-amber-700">
            {logs.filter((l) => l.level === 'WARNING').length.toLocaleString('fa-IR')}
          </p>
        </div>

        <div
          className={cn(
            'p-3 sm:p-4 rounded-xl sm:rounded-2xl',
            'bg-gradient-to-br from-red-50 to-rose-50',
            'border-2 border-red-100',
            'shadow-md hover:shadow-lg transition-shadow duration-200'
          )}
        >
          <div className="flex items-center gap-1.5 sm:gap-2 text-red-600 mb-1 sm:mb-2">
            <AlertCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="text-[10px] sm:text-xs font-semibold">خطا</span>
          </div>
          <p className="text-lg sm:text-xl md:text-2xl font-black text-red-700">
            {logs.filter((l) => l.level === 'ERROR').length.toLocaleString('fa-IR')}
          </p>
        </div>
      </div>

      {/* Desktop Table View */}
      <div
        className={cn(
          'hidden md:block',
          'overflow-hidden rounded-xl sm:rounded-2xl',
          'bg-white/90 backdrop-blur-sm',
          'border-2 border-gray-200/60',
          'shadow-xl shadow-gray-200/30'
        )}
      >
        <div className="overflow-x-auto scrollbar-custom">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-l from-gray-50 to-gray-100/80 border-b-2 border-gray-200">
                <th className="px-4 lg:px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider w-32">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-gray-500" />
                    سطح
                  </div>
                </th>
                <th className="px-4 lg:px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-gray-500" />
                    پیام
                  </div>
                </th>
                <th className="px-4 lg:px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider w-36">
                  <div className="flex items-center gap-2">
                    <Code className="w-4 h-4 text-gray-500" />
                    منبع
                  </div>
                </th>
                <th className="px-4 lg:px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider w-48">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-500" />
                    زمان
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="p-5 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-50">
                        <Terminal className="w-10 h-10 text-gray-400" />
                      </div>
                      <div>
                        <p className="text-gray-700 font-semibold mb-1">هیچ لاگی یافت نشد</p>
                        <p className="text-sm text-gray-500">لاگ‌های سیستم اینجا نمایش داده می‌شوند</p>
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
                      className={cn(
                        'group transition-all duration-200',
                        'hover:bg-gradient-to-l hover:from-gray-50/80 hover:to-transparent',
                        'hover:shadow-sm'
                      )}
                    >
                      <td className="px-4 lg:px-6 py-4">
                        <span
                          className={cn(
                            'inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border shadow-sm',
                            config.bg,
                            config.text,
                            config.border
                          )}
                        >
                          {config.icon}
                          {config.label}
                        </span>
                      </td>
                      <td className="px-4 lg:px-6 py-4">
                        <p className="text-sm text-gray-700 line-clamp-2 leading-relaxed">
                          {log.message}
                        </p>
                      </td>
                      <td className="px-4 lg:px-6 py-4">
                        <span
                          className={cn(
                            'inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium',
                            'bg-gray-100 text-gray-700 border border-gray-200'
                          )}
                        >
                          {log.source}
                        </span>
                      </td>
                      <td className="px-4 lg:px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Clock className="w-4 h-4 flex-shrink-0" />
                          <span className="whitespace-nowrap">
                            {new Date(log.timestamp).toLocaleString('fa-IR')}
                          </span>
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
      <div className="md:hidden space-y-3">
        {logs.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-12 px-4 bg-white/90 rounded-xl border-2 border-gray-200">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-50">
              <Terminal className="w-8 h-8 text-gray-400" />
            </div>
            <div className="text-center">
              <p className="text-gray-700 font-semibold mb-1">هیچ لاگی یافت نشد</p>
              <p className="text-sm text-gray-500">لاگ‌های سیستم اینجا نمایش داده می‌شوند</p>
            </div>
          </div>
        ) : (
          logs.map((log) => {
            const config = getLevelConfig(log.level);
            return (
              <div
                key={log.id}
                className={cn(
                  'p-4 rounded-xl',
                  'bg-white/90 backdrop-blur-sm',
                  'border-2 border-gray-200',
                  'shadow-md hover:shadow-lg',
                  'transition-all duration-200'
                )}
              >
                {/* Level Badge */}
                <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-100">
                  <span
                    className={cn(
                      'inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border shadow-sm',
                      config.bg,
                      config.text,
                      config.border
                    )}
                  >
                    {config.icon}
                    {config.label}
                  </span>
                  <span
                    className={cn(
                      'inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium',
                      'bg-gray-100 text-gray-700 border border-gray-200'
                    )}
                  >
                    {log.source}
                  </span>
                </div>

                {/* Message */}
                <div className="mb-3 p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1.5 flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5" />
                    پیام
                  </p>
                  <p className="text-sm text-gray-700 leading-relaxed">{log.message}</p>
                </div>

                {/* Time */}
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{new Date(log.timestamp).toLocaleString('fa-IR')}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Premium Pagination */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 sm:p-5 bg-white/80 backdrop-blur-sm rounded-xl border-2 border-gray-200 shadow-md">
        <div
          className={cn(
            'px-4 py-2.5 rounded-lg',
            'bg-gradient-to-l from-gray-100 to-gray-50',
            'text-gray-700 text-xs sm:text-sm font-medium',
            'border-2 border-gray-200 shadow-sm'
          )}
        >
          نمایش{' '}
          <span className="font-bold text-[rgb(var(--c-primary-700))]">
            {Math.min(page * limit, total).toLocaleString('fa-IR')}
          </span>{' '}
          از{' '}
          <span className="font-bold text-[rgb(var(--c-primary-700))]">
            {total.toLocaleString('fa-IR')}
          </span>{' '}
          مورد
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className={cn(
              'rounded-xl px-3 sm:px-4 py-2 text-sm font-semibold',
              'border-2 border-gray-200 hover:border-[rgb(var(--c-primary-400))]',
              'hover:bg-[rgb(var(--c-primary-50))] hover:text-[rgb(var(--c-primary-700))]',
              'transition-all duration-200',
              'disabled:opacity-40 disabled:cursor-not-allowed',
              'shadow-sm hover:shadow-md'
            )}
          >
            <ChevronRight className="w-4 h-4 sm:ml-1" />
            <span className="hidden sm:inline">قبلی</span>
          </Button>

          <div className="hidden md:flex items-center gap-1.5">
            {Array.from({ length: Math.min(5, totalPages || 1) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) pageNum = i + 1;
              else if (page <= 3) pageNum = i + 1;
              else if (page >= totalPages - 2) pageNum = totalPages - 4 + i;
              else pageNum = page - 2 + i;
              return (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => setPage(pageNum)}
                  className={cn(
                    'w-10 h-10 rounded-xl text-sm font-bold',
                    'transition-all duration-200 border-2',
                    page === pageNum
                      ? [
                          'bg-gradient-to-l from-[rgb(var(--c-primary-600))] to-[rgb(var(--c-primary-700))]',
                          'text-white border-[rgb(var(--c-primary-600))]',
                          'shadow-lg shadow-[rgb(var(--c-primary-400))]/40',
                          'scale-110',
                        ]
                      : [
                          'bg-white border-gray-200',
                          'hover:bg-[rgb(var(--c-primary-50))] hover:border-[rgb(var(--c-primary-300))]',
                          'text-gray-700 hover:text-[rgb(var(--c-primary-700))]',
                          'hover:scale-105',
                        ]
                  )}
                >
                  {pageNum.toLocaleString('fa-IR')}
                </button>
              );
            })}
          </div>

          <div className="md:hidden px-4 py-2 bg-gradient-to-l from-[rgb(var(--c-primary-600))] to-[rgb(var(--c-primary-700))] text-white rounded-xl font-bold text-sm shadow-lg">
            {page.toLocaleString('fa-IR')} / {totalPages.toLocaleString('fa-IR')}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => p + 1)}
            disabled={page * limit >= total}
            className={cn(
              'rounded-xl px-3 sm:px-4 py-2 text-sm font-semibold',
              'border-2 border-gray-200 hover:border-[rgb(var(--c-primary-400))]',
              'hover:bg-[rgb(var(--c-primary-50))] hover:text-[rgb(var(--c-primary-700))]',
              'transition-all duration-200',
              'disabled:opacity-40 disabled:cursor-not-allowed',
              'shadow-sm hover:shadow-md'
            )}
          >
            <span className="hidden sm:inline">بعدی</span>
            <ChevronLeft className="w-4 h-4 sm:mr-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}
