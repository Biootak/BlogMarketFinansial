'use client';

import { X, User, Activity, FileText, Clock, Mail, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ActivityLog } from '@/actions/reports/activityLogs';

interface ActivityDetailModalProps {
  activity: ActivityLog | null;
  isOpen: boolean;
  onClose: () => void;
}

function getActionColor(action: string) {
  const actionLower = action.toLowerCase();
  if (actionLower.includes('create') || actionLower.includes('ایجاد')) {
    return {
      bg: 'bg-emerald-100',
      text: 'text-emerald-700',
      border: 'border-emerald-200',
      gradient: 'from-emerald-500 to-teal-600',
    };
  }
  if (actionLower.includes('update') || actionLower.includes('ویرایش')) {
    return {
      bg: 'bg-blue-100',
      text: 'text-blue-700',
      border: 'border-blue-200',
      gradient: 'from-blue-500 to-indigo-600',
    };
  }
  if (actionLower.includes('delete') || actionLower.includes('حذف')) {
    return {
      bg: 'bg-red-100',
      text: 'text-red-700',
      border: 'border-red-200',
      gradient: 'from-red-500 to-rose-600',
    };
  }
  if (actionLower.includes('login') || actionLower.includes('ورود')) {
    return {
      bg: 'bg-violet-100',
      text: 'text-violet-700',
      border: 'border-violet-200',
      gradient: 'from-violet-500 to-purple-600',
    };
  }
  return {
    bg: 'bg-gray-100',
    text: 'text-gray-700',
    border: 'border-gray-200',
    gradient: 'from-gray-500 to-gray-600',
  };
}

export function ActivityDetailModal({ activity, isOpen, onClose }: ActivityDetailModalProps) {
  if (!isOpen || !activity) return null;

  const colors = getActionColor(activity.action);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className={cn(
          'relative w-full max-w-lg sm:max-w-2xl max-h-[85vh] sm:max-h-[90vh]',
          'flex flex-col bg-white rounded-xl sm:rounded-2xl shadow-2xl',
          'animate-in zoom-in-95 duration-200'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={cn('flex-shrink-0 p-4 sm:p-6 bg-gradient-to-l', colors.gradient)}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
              {/* User Avatar */}
              <div
                className={cn(
                  'w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl flex items-center justify-center',
                  'bg-white/20 backdrop-blur-sm',
                  'text-white font-bold text-lg sm:text-2xl',
                  'shadow-lg flex-shrink-0'
                )}
              >
                {(activity.user.name || activity.user.email || '?').charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg sm:text-2xl font-bold text-white mb-0.5 sm:mb-1 truncate">جزئیات فعالیت</h2>
                <p className="text-white/80 text-xs sm:text-sm truncate">اطلاعات کامل این فعالیت</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-white/20 hover:bg-white/30 text-white transition-all duration-200 flex-shrink-0"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5">
          {/* User Info Section */}
          <div className="space-y-2 sm:space-y-3">
            <h3 className="text-sm sm:text-base font-bold text-gray-900 flex items-center gap-1.5 sm:gap-2">
              <User className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
              اطلاعات کاربر
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
              <div className="p-3 sm:p-4 rounded-lg sm:rounded-xl bg-gray-50 border border-gray-200">
                <div className="flex items-center gap-1.5 sm:gap-2 text-gray-600 mb-1 sm:mb-2">
                  <User className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="text-[10px] sm:text-xs font-medium">نام کاربر</span>
                </div>
                <p className="text-xs sm:text-sm text-gray-900 font-semibold truncate">
                  {activity.user.name || 'کاربر ناشناس'}
                </p>
              </div>
              <div className="p-3 sm:p-4 rounded-lg sm:rounded-xl bg-gray-50 border border-gray-200">
                <div className="flex items-center gap-1.5 sm:gap-2 text-gray-600 mb-1 sm:mb-2">
                  <Mail className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="text-[10px] sm:text-xs font-medium">ایمیل</span>
                </div>
                <p className="text-xs sm:text-sm text-gray-900 font-semibold break-all">
                  {activity.user.email}
                </p>
              </div>
            </div>
          </div>

          {/* Action Info Section */}
          <div className="space-y-2 sm:space-y-3">
            <h3 className="text-sm sm:text-base font-bold text-gray-900 flex items-center gap-1.5 sm:gap-2">
              <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
              اطلاعات عملیات
            </h3>
            <div className="space-y-2 sm:space-y-3">
              <div className="p-3 sm:p-4 rounded-lg sm:rounded-xl bg-gray-50 border border-gray-200">
                <div className="flex items-center gap-1.5 sm:gap-2 text-gray-600 mb-1.5 sm:mb-2">
                  <Activity className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="text-[10px] sm:text-xs font-medium">نوع عملیات</span>
                </div>
                <span
                  className={cn(
                    'inline-flex items-center px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold border shadow-sm',
                    colors.bg,
                    colors.text,
                    colors.border
                  )}
                >
                  {activity.action}
                </span>
              </div>

              <div className="p-3 sm:p-4 rounded-lg sm:rounded-xl bg-gray-50 border border-gray-200">
                <div className="flex items-center gap-1.5 sm:gap-2 text-gray-600 mb-1.5 sm:mb-2">
                  <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="text-[10px] sm:text-xs font-medium">جزئیات کامل</span>
                </div>
                <div className="max-h-24 sm:max-h-32 overflow-y-auto">
                  <p className="text-xs sm:text-sm text-gray-900 leading-relaxed whitespace-pre-wrap break-words">
                    {activity.details || 'جزئیاتی ثبت نشده است'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Time Info Section */}
          <div className="space-y-2 sm:space-y-3">
            <h3 className="text-sm sm:text-base font-bold text-gray-900 flex items-center gap-1.5 sm:gap-2">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
              زمان انجام
            </h3>
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <div className="p-3 sm:p-4 rounded-lg sm:rounded-xl bg-gray-50 border border-gray-200">
                <div className="flex items-center gap-1.5 sm:gap-2 text-gray-600 mb-1 sm:mb-2">
                  <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="text-[10px] sm:text-xs font-medium">تاریخ</span>
                </div>
                <p className="text-xs sm:text-sm text-gray-900 font-semibold">
                  {new Intl.DateTimeFormat('fa-IR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  }).format(new Date(activity.createdAt))}
                </p>
              </div>
              <div className="p-3 sm:p-4 rounded-lg sm:rounded-xl bg-gray-50 border border-gray-200">
                <div className="flex items-center gap-1.5 sm:gap-2 text-gray-600 mb-1 sm:mb-2">
                  <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="text-[10px] sm:text-xs font-medium">ساعت</span>
                </div>
                <p className="text-xs sm:text-sm text-gray-900 font-semibold">
                  {new Intl.DateTimeFormat('fa-IR', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  }).format(new Date(activity.createdAt))}
                </p>
              </div>
            </div>
          </div>

          {/* Activity ID */}
          <div className="p-3 sm:p-4 rounded-lg sm:rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] sm:text-xs font-medium text-gray-600 flex-shrink-0">شناسه فعالیت</span>
              <code className="text-[10px] sm:text-xs font-mono text-gray-900 bg-white px-2 py-0.5 sm:px-3 sm:py-1 rounded-md sm:rounded-lg border border-gray-200 truncate">
                {activity.id}
              </code>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 p-3 sm:p-4 bg-gray-50 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="w-full px-4 py-2 sm:px-6 sm:py-3 rounded-lg sm:rounded-xl bg-gradient-to-l from-gray-700 to-gray-800 text-white text-sm sm:text-base font-semibold hover:shadow-lg transition-all duration-200"
          >
            بستن
          </button>
        </div>
      </div>
    </div>
  );
}
