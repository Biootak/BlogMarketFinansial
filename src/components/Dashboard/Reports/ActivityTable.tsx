'use client';

import type { ActivityLog } from '@/actions/reports/activityLogs';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Clock, FileText, MoreHorizontal, User } from 'lucide-react';

interface ActivityTableProps {
  activities: ActivityLog[];
  loading: boolean;
  page: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
}

function getActionColor(action: string) {
  const actionLower = action.toLowerCase();
  if (actionLower.includes('create') || actionLower.includes('ایجاد')) {
    return 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800';
  }
  if (actionLower.includes('update') || actionLower.includes('ویرایش')) {
    return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800';
  }
  if (actionLower.includes('delete') || actionLower.includes('حذف')) {
    return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800';
  }
  if (actionLower.includes('login') || actionLower.includes('ورود')) {
    return 'bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-400 dark:border-violet-800';
  }
  return 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-white/10 dark:text-gray-300 dark:border-white/10';
}

export default function ActivityTable({
  activities,
  loading,
  page,
  total,
  limit,
  onPageChange,
}: ActivityTableProps) {
  if (loading) {
    return null;
  }

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-5">
      {/* Table Container */}
      <div className={cn('dash-panel overflow-hidden')}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-l from-gray-50 to-gray-100/80 dark:from-white/5 dark:to-transparent border-b border-gray-200 dark:border-white/10">
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    کاربر
                  </div>
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <MoreHorizontal className="w-4 h-4" />
                    عملیات
                  </div>
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    جزئیات
                  </div>
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    زمان
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {activities.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="p-4 rounded-full bg-gray-100">
                        <FileText className="w-8 h-8 text-gray-400" />
                      </div>
                      <p className="text-gray-500 dark:text-gray-400">هیچ فعالیتی یافت نشد</p>
                    </div>
                  </td>
                </tr>
              ) : (
                activities.map((activity, _index) => (
                  <tr
                    key={activity.id}
                    className={cn(
                      'group transition-colors duration-200',
                      'hover:bg-gradient-to-l hover:from-[rgb(var(--c-primary-50))]/50 hover:to-transparent',
                    )}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            'w-10 h-10 rounded-xl flex items-center justify-center',
                            'bg-gradient-to-br from-[rgb(var(--c-primary-100))] to-[rgb(var(--c-primary-200))]',
                            'text-[rgb(var(--c-primary-700))] font-semibold text-sm',
                            'shadow-sm',
                          )}
                        >
                          {(activity.user.name || activity.user.email || '?')
                            .charAt(0)
                            .toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {activity.user.name || 'کاربر ناشناس'}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {activity.user.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={cn(
                          'inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium border',
                          getActionColor(activity.action),
                        )}
                      >
                        {activity.action}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p
                        className="text-sm text-gray-700 dark:text-gray-300 max-w-xs truncate"
                        title={activity.details}
                      >
                        {activity.details || '-'}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                        <Clock className="w-4 h-4" />
                        <span>
                          {new Intl.DateTimeFormat('fa-IR', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          }).format(new Date(activity.createdAt))}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div
          className={cn(
            'px-4 py-2 rounded-lg',
            'bg-gray-100/80 dark:bg-white/10 text-gray-600 dark:text-gray-300 text-sm',
          )}
        >
          نمایش{' '}
          <span className="font-semibold text-gray-900 dark:text-white">
            {((page - 1) * limit + 1).toLocaleString('fa-IR')}
          </span>{' '}
          تا{' '}
          <span className="font-semibold text-gray-900 dark:text-white">
            {Math.min(page * limit, total).toLocaleString('fa-IR')}
          </span>{' '}
          از{' '}
          <span className="font-semibold text-gray-900 dark:text-white">
            {total.toLocaleString('fa-IR')}
          </span>{' '}
          مورد
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page === 1}
            className={cn(
              'rounded-lg px-4 py-2',
              'border-gray-200 hover:border-[rgb(var(--c-primary-300))]',
              'hover:bg-[rgb(var(--c-primary-50))]',
              'transition-all duration-200',
              'disabled:opacity-50 disabled:cursor-not-allowed',
            )}
          >
            <ChevronRight className="w-4 h-4 ml-1" />
            قبلی
          </Button>

          {/* Page Numbers */}
          <div className="hidden sm:flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (page <= 3) {
                pageNum = i + 1;
              } else if (page >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = page - 2 + i;
              }
              return (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => onPageChange(pageNum)}
                  className={cn(
                    'w-9 h-9 rounded-lg text-sm font-medium',
                    'transition-all duration-200',
                    page === pageNum
                      ? 'bg-gradient-to-l from-[rgb(var(--c-primary-600))] to-[rgb(var(--c-primary-700))] text-white shadow-md'
                      : 'hover:bg-gray-100 text-gray-600',
                  )}
                >
                  {pageNum.toLocaleString('fa-IR')}
                </button>
              );
            })}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={page * limit >= total}
            className={cn(
              'rounded-lg px-4 py-2',
              'border-gray-200 hover:border-[rgb(var(--c-primary-300))]',
              'hover:bg-[rgb(var(--c-primary-50))]',
              'transition-all duration-200',
              'disabled:opacity-50 disabled:cursor-not-allowed',
            )}
          >
            بعدی
            <ChevronLeft className="w-4 h-4 mr-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}
