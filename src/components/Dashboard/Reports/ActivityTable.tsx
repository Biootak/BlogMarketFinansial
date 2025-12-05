'use client';

import type { ActivityLog } from '@/actions/reports/activityLogs';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  ChevronRight,
  ChevronLeft,
  User,
  Clock,
  FileText,
  MoreHorizontal,
  Activity as ActivityIcon,
} from 'lucide-react';

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
    return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  }
  if (actionLower.includes('update') || actionLower.includes('ویرایش')) {
    return 'bg-blue-100 text-blue-700 border-blue-200';
  }
  if (actionLower.includes('delete') || actionLower.includes('حذف')) {
    return 'bg-red-100 text-red-700 border-red-200';
  }
  if (actionLower.includes('login') || actionLower.includes('ورود')) {
    return 'bg-violet-100 text-violet-700 border-violet-200';
  }
  return 'bg-gray-100 text-gray-700 border-gray-200';
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
    <div className="space-y-4 sm:space-y-5">
      {/* Desktop Table View - Hidden on mobile */}
      <div
        className={cn(
          'hidden md:block',
          'overflow-hidden rounded-xl sm:rounded-2xl',
          'bg-white/90 backdrop-blur-sm',
          'border border-gray-200/60',
          'shadow-xl shadow-gray-200/30'
        )}
      >
        <div className="overflow-x-auto scrollbar-custom">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-l from-gray-50 to-gray-100/80 border-b-2 border-gray-200">
                <th className="px-4 lg:px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-500" />
                    کاربر
                  </div>
                </th>
                <th className="px-4 lg:px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <ActivityIcon className="w-4 h-4 text-gray-500" />
                    عملیات
                  </div>
                </th>
                <th className="px-4 lg:px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-gray-500" />
                    جزئیات
                  </div>
                </th>
                <th className="px-4 lg:px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-500" />
                    زمان
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {activities.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="p-5 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-50">
                        <FileText className="w-10 h-10 text-gray-400" />
                      </div>
                      <div>
                        <p className="text-gray-700 font-semibold mb-1">هیچ فعالیتی یافت نشد</p>
                        <p className="text-sm text-gray-500">فعالیت‌های جدید اینجا نمایش داده می‌شوند</p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                activities.map((activity) => (
                  <tr
                    key={activity.id}
                    className={cn(
                      'group transition-all duration-200',
                      'hover:bg-gradient-to-l hover:from-[rgb(var(--c-primary-50))]/60 hover:to-transparent',
                      'hover:shadow-sm'
                    )}
                  >
                    <td className="px-4 lg:px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            'w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0',
                            'bg-gradient-to-br from-[rgb(var(--c-primary-100))] to-[rgb(var(--c-primary-200))]',
                            'text-[rgb(var(--c-primary-700))] font-bold text-base',
                            'shadow-md group-hover:shadow-lg transition-shadow duration-200'
                          )}
                        >
                          {(activity.user.name || activity.user.email || '?').charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 truncate">
                            {activity.user.name || 'کاربر ناشناس'}
                          </p>
                          <p className="text-xs text-gray-500 truncate">{activity.user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 lg:px-6 py-4">
                      <span
                        className={cn(
                          'inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold border shadow-sm',
                          getActionColor(activity.action)
                        )}
                      >
                        {activity.action}
                      </span>
                    </td>
                    <td className="px-4 lg:px-6 py-4">
                      <p className="text-sm text-gray-700 max-w-xs truncate" title={activity.details}>
                        {activity.details || '-'}
                      </p>
                    </td>
                    <td className="px-4 lg:px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock className="w-4 h-4 flex-shrink-0" />
                        <span className="whitespace-nowrap">
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

      {/* Mobile Card View - Shown only on mobile */}
      <div className="md:hidden space-y-3">
        {activities.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-12 px-4 bg-white/90 rounded-xl border border-gray-200">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-50">
              <FileText className="w-8 h-8 text-gray-400" />
            </div>
            <div className="text-center">
              <p className="text-gray-700 font-semibold mb-1">هیچ فعالیتی یافت نشد</p>
              <p className="text-sm text-gray-500">فعالیت‌های جدید اینجا نمایش داده می‌شوند</p>
            </div>
          </div>
        ) : (
          activities.map((activity) => (
            <div
              key={activity.id}
              className={cn(
                'p-4 rounded-xl',
                'bg-white/90 backdrop-blur-sm',
                'border border-gray-200',
                'shadow-md hover:shadow-lg',
                'transition-all duration-200'
              )}
            >
              {/* User Info */}
              <div className="flex items-center gap-3 mb-3 pb-3 border-b border-gray-100">
                <div
                  className={cn(
                    'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0',
                    'bg-gradient-to-br from-[rgb(var(--c-primary-100))] to-[rgb(var(--c-primary-200))]',
                    'text-[rgb(var(--c-primary-700))] font-bold text-lg',
                    'shadow-md'
                  )}
                >
                  {(activity.user.name || activity.user.email || '?').charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">
                    {activity.user.name || 'کاربر ناشناس'}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{activity.user.email}</p>
                </div>
              </div>

              {/* Action Badge */}
              <div className="mb-3">
                <span
                  className={cn(
                    'inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold border shadow-sm',
                    getActionColor(activity.action)
                  )}
                >
                  <ActivityIcon className="w-3.5 h-3.5 ml-1.5" />
                  {activity.action}
                </span>
              </div>

              {/* Details */}
              {activity.details && (
                <div className="mb-3 p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" />
                    جزئیات
                  </p>
                  <p className="text-sm text-gray-700">{activity.details}</p>
                </div>
              )}

              {/* Time */}
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Clock className="w-3.5 h-3.5" />
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
            </div>
          ))
        )}
      </div>

      {/* Premium Pagination */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 sm:p-5 bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200 shadow-md">
        {/* Info */}
        <div
          className={cn(
            'px-4 py-2.5 rounded-lg',
            'bg-gradient-to-l from-gray-100 to-gray-50',
            'text-gray-700 text-xs sm:text-sm font-medium',
            'border border-gray-200 shadow-sm'
          )}
        >
          نمایش{' '}
          <span className="font-bold text-[rgb(var(--c-primary-700))]">
            {((page - 1) * limit + 1).toLocaleString('fa-IR')}
          </span>{' '}
          تا{' '}
          <span className="font-bold text-[rgb(var(--c-primary-700))]">
            {Math.min(page * limit, total).toLocaleString('fa-IR')}
          </span>{' '}
          از{' '}
          <span className="font-bold text-[rgb(var(--c-primary-700))]">
            {total.toLocaleString('fa-IR')}
          </span>{' '}
          مورد
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page === 1}
            className={cn(
              'rounded-xl px-3 sm:px-4 py-2 text-sm font-semibold',
              'border-2 border-gray-200 hover:border-[rgb(var(--c-primary-400))]',
              'hover:bg-[rgb(var(--c-primary-50))] hover:text-[rgb(var(--c-primary-700))]',
              'transition-all duration-200',
              'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent',
              'shadow-sm hover:shadow-md'
            )}
          >
            <ChevronRight className="w-4 h-4 sm:ml-1" />
            <span className="hidden sm:inline">قبلی</span>
          </Button>

          {/* Page Numbers - Desktop */}
          <div className="hidden md:flex items-center gap-1.5">
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
                    'w-10 h-10 rounded-xl text-sm font-bold',
                    'transition-all duration-200',
                    'border-2',
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

          {/* Current Page - Mobile */}
          <div className="md:hidden px-4 py-2 bg-gradient-to-l from-[rgb(var(--c-primary-600))] to-[rgb(var(--c-primary-700))] text-white rounded-xl font-bold text-sm shadow-lg">
            {page.toLocaleString('fa-IR')} / {totalPages.toLocaleString('fa-IR')}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={page * limit >= total}
            className={cn(
              'rounded-xl px-3 sm:px-4 py-2 text-sm font-semibold',
              'border-2 border-gray-200 hover:border-[rgb(var(--c-primary-400))]',
              'hover:bg-[rgb(var(--c-primary-50))] hover:text-[rgb(var(--c-primary-700))]',
              'transition-all duration-200',
              'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent',
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
