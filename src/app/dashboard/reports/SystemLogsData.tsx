'use client';

import { useEffect, useState, useCallback } from 'react';
import { getSystemLogs } from '@/actions/reportActions';
import { AlertCircle, Info, AlertTriangle, Terminal, ChevronRight, ChevronLeft, Filter } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import Loading from '@/components/Loading';
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
      };
    case 'WARNING':
      return {
        icon: <AlertTriangle className="w-4 h-4" />,
        bg: 'bg-amber-100',
        text: 'text-amber-700',
        border: 'border-amber-200',
        label: 'هشدار',
      };
    case 'INFO':
      return {
        icon: <Info className="w-4 h-4" />,
        bg: 'bg-blue-100',
        text: 'text-blue-700',
        border: 'border-blue-200',
        label: 'اطلاعات',
      };
    default:
      return {
        icon: <Info className="w-4 h-4" />,
        bg: 'bg-gray-100',
        text: 'text-gray-700',
        border: 'border-gray-200',
        label: level,
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
    return <Loading />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg">
            <Terminal className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">لاگ‌های سیستم</h3>
            <p className="text-sm text-gray-500">مشاهده و فیلتر لاگ‌های سیستم</p>
          </div>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Filter className="w-4 h-4" />
            <span>فیلتر:</span>
          </div>
          <Select value={level} onValueChange={setLevel}>
            <SelectTrigger
              className={cn(
                'w-[160px] rounded-xl',
                'border-gray-200 hover:border-[rgb(var(--c-primary-300))]',
                'bg-white/80 backdrop-blur-sm',
                'focus:ring-2 focus:ring-[rgb(var(--c-primary-200))]',
                'transition-all duration-200'
              )}
            >
              <SelectValue placeholder="انتخاب سطح لاگ" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-gray-200 shadow-xl">
              <SelectItem value="all" className="rounded-lg">همه</SelectItem>
              <SelectItem value="INFO" className="rounded-lg">اطلاعات</SelectItem>
              <SelectItem value="WARNING" className="rounded-lg">هشدار</SelectItem>
              <SelectItem value="ERROR" className="rounded-lg">خطا</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className={cn('p-4 rounded-xl', 'bg-gradient-to-br from-blue-50 to-indigo-50', 'border border-blue-100')}>
          <div className="flex items-center gap-2 text-blue-600 mb-1">
            <Info className="w-4 h-4" />
            <span className="text-xs font-medium">اطلاعات</span>
          </div>
          <p className="text-xl font-bold text-blue-700">
            {logs.filter((l) => l.level === 'INFO').length.toLocaleString('fa-IR')}
          </p>
        </div>
        <div className={cn('p-4 rounded-xl', 'bg-gradient-to-br from-amber-50 to-orange-50', 'border border-amber-100')}>
          <div className="flex items-center gap-2 text-amber-600 mb-1">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-xs font-medium">هشدار</span>
          </div>
          <p className="text-xl font-bold text-amber-700">
            {logs.filter((l) => l.level === 'WARNING').length.toLocaleString('fa-IR')}
          </p>
        </div>
        <div className={cn('p-4 rounded-xl', 'bg-gradient-to-br from-red-50 to-rose-50', 'border border-red-100')}>
          <div className="flex items-center gap-2 text-red-600 mb-1">
            <AlertCircle className="w-4 h-4" />
            <span className="text-xs font-medium">خطا</span>
          </div>
          <p className="text-xl font-bold text-red-700">
            {logs.filter((l) => l.level === 'ERROR').length.toLocaleString('fa-IR')}
          </p>
        </div>
      </div>

      {/* Logs Table */}
      <div className={cn('overflow-hidden rounded-xl', 'bg-white/80 backdrop-blur-sm', 'border border-gray-200/60', 'shadow-lg shadow-gray-200/30')}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-l from-gray-50 to-gray-100/80 border-b border-gray-200">
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider w-28">سطح</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">پیام</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider w-32">منبع</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider w-44">زمان</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="p-4 rounded-full bg-gray-100">
                        <Terminal className="w-8 h-8 text-gray-400" />
                      </div>
                      <p className="text-gray-500">هیچ لاگی یافت نشد</p>
                    </div>
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const config = getLevelConfig(log.level);
                  return (
                    <tr key={log.id} className={cn('group transition-colors duration-200', 'hover:bg-gradient-to-l hover:from-gray-50/80 hover:to-transparent')}>
                      <td className="px-6 py-4">
                        <span className={cn('inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border', config.bg, config.text, config.border)}>
                          {config.icon}
                          {config.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-700 line-clamp-2">{log.message}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn('inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium', 'bg-gray-100 text-gray-600')}>
                          {log.source}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-500">{new Date(log.timestamp).toLocaleString('fa-IR')}</span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className={cn('px-4 py-2 rounded-lg', 'bg-gray-100/80 text-gray-600 text-sm')}>
          نمایش <span className="font-semibold text-gray-900">{Math.min(page * limit, total).toLocaleString('fa-IR')}</span> از{' '}
          <span className="font-semibold text-gray-900">{total.toLocaleString('fa-IR')}</span> مورد
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className={cn('rounded-lg px-4 py-2', 'border-gray-200 hover:border-[rgb(var(--c-primary-300))]', 'hover:bg-[rgb(var(--c-primary-50))]', 'transition-all duration-200', 'disabled:opacity-50')}
          >
            <ChevronRight className="w-4 h-4 ml-1" />
            قبلی
          </Button>

          <div className="hidden sm:flex items-center gap-1">
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
                  className={cn('w-9 h-9 rounded-lg text-sm font-medium', 'transition-all duration-200', page === pageNum ? 'bg-gradient-to-l from-[rgb(var(--c-primary-600))] to-[rgb(var(--c-primary-700))] text-white shadow-md' : 'hover:bg-gray-100 text-gray-600')}
                >
                  {pageNum.toLocaleString('fa-IR')}
                </button>
              );
            })}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => p + 1)}
            disabled={page * limit >= total}
            className={cn('rounded-lg px-4 py-2', 'border-gray-200 hover:border-[rgb(var(--c-primary-300))]', 'hover:bg-[rgb(var(--c-primary-50))]', 'transition-all duration-200', 'disabled:opacity-50')}
          >
            بعدی
            <ChevronLeft className="w-4 h-4 mr-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}
