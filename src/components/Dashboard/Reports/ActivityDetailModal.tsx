'use client';

import type { ActivityLog } from '@/actions/reports/activityLogs';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { Activity, Calendar, Clock, FileText, Mail, User, X } from 'lucide-react';

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
  if (!activity) return null;

  const colors = getActionColor(activity.action);

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent
        side="left"
        className="w-full sm:max-w-lg p-0 flex flex-col [&>button]:hidden"
        dir="rtl"
      >
        {/* Header */}
        <div className={cn('p-4 sm:p-6 bg-gradient-to-br text-white relative', colors.gradient)}>
          {/* Close Button */}
          <Button
            onClick={onClose}
            variant="ghost"
            size="icon"
            className="absolute left-3 top-3 h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all hover:scale-110"
          >
            <X className="h-4 w-4" />
          </Button>

          <SheetHeader>
            <div className="flex items-center gap-3 pl-10">
              {/* User Avatar */}
              <div
                className={cn(
                  'w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center',
                  'bg-white/20 backdrop-blur-sm',
                  'text-white font-bold text-lg sm:text-xl',
                  'shadow-lg flex-shrink-0',
                )}
              >
                {(activity.user.name || activity.user.email || '?').charAt(0).toUpperCase()}
              </div>
              <div className="text-right">
                <SheetTitle className="text-white text-base sm:text-lg">جزئیات فعالیت</SheetTitle>
                <SheetDescription className="text-white/80 text-xs sm:text-sm">
                  اطلاعات کامل این فعالیت
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>
        </div>

        {/* Content - Scrollable */}
        <ScrollArea className="flex-1 px-4 sm:px-6">
          <div className="space-y-4 py-4">
            {/* User Info Section */}
            <div className="space-y-3">
              <h3 className="text-sm sm:text-base font-bold text-gray-900 flex items-center gap-2">
                <User className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                اطلاعات کاربر
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                  <div className="flex items-center gap-2 text-gray-600 mb-1.5">
                    <User className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span className="text-[10px] sm:text-xs font-medium">نام کاربر</span>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-900 font-semibold truncate">
                    {activity.user.name || 'کاربر ناشناس'}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                  <div className="flex items-center gap-2 text-gray-600 mb-1.5">
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
            <div className="space-y-3">
              <h3 className="text-sm sm:text-base font-bold text-gray-900 flex items-center gap-2">
                <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                اطلاعات عملیات
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                  <div className="flex items-center gap-2 text-gray-600 mb-2">
                    <Activity className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span className="text-[10px] sm:text-xs font-medium">نوع عملیات</span>
                  </div>
                  <span
                    className={cn(
                      'inline-flex items-center px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold border shadow-sm',
                      colors.bg,
                      colors.text,
                      colors.border,
                    )}
                  >
                    {activity.action}
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                  <div className="flex items-center gap-2 text-gray-600 mb-2">
                    <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span className="text-[10px] sm:text-xs font-medium">جزئیات کامل</span>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-900 leading-relaxed whitespace-pre-wrap break-words">
                    {activity.details || 'جزئیاتی ثبت نشده است'}
                  </p>
                </div>
              </div>
            </div>

            {/* Time Info Section */}
            <div className="space-y-3">
              <h3 className="text-sm sm:text-base font-bold text-gray-900 flex items-center gap-2">
                <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                زمان انجام
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                  <div className="flex items-center gap-2 text-gray-600 mb-1.5">
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
                <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                  <div className="flex items-center gap-2 text-gray-600 mb-1.5">
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
            <div className="p-3 rounded-lg bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] sm:text-xs font-medium text-gray-600 flex-shrink-0">
                  شناسه فعالیت
                </span>
                <code className="text-[10px] sm:text-xs font-mono text-gray-900 bg-white px-2 py-1 rounded-md border border-gray-200 truncate">
                  {activity.id}
                </code>
              </div>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
