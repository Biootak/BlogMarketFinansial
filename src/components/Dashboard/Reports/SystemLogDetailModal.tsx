'use client';

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
import { AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

interface SystemLog {
  id: string;
  level: string;
  message: string;
  source: string;
  timestamp: Date;
}

interface SystemLogDetailModalProps {
  log: SystemLog | null;
  isOpen: boolean;
  onClose: () => void;
}

function getLevelConfig(level: string) {
  switch (level.toUpperCase()) {
    case 'ERROR':
      return {
        icon: <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5" />,
        bg: 'bg-red-100',
        text: 'text-red-700',
        border: 'border-red-200',
        label: 'خطا',
        gradient: 'from-red-500 to-rose-600',
      };
    case 'WARNING':
      return {
        icon: <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5" />,
        bg: 'bg-amber-100',
        text: 'text-amber-700',
        border: 'border-amber-200',
        label: 'هشدار',
        gradient: 'from-amber-500 to-orange-600',
      };
    case 'INFO':
      return {
        icon: <Info className="w-4 h-4 sm:w-5 sm:h-5" />,
        bg: 'bg-blue-100',
        text: 'text-blue-700',
        border: 'border-blue-200',
        label: 'اطلاعات',
        gradient: 'from-blue-500 to-indigo-600',
      };
    default:
      return {
        icon: <Info className="w-4 h-4 sm:w-5 sm:h-5" />,
        bg: 'bg-gray-100',
        text: 'text-gray-700',
        border: 'border-gray-200',
        label: level,
        gradient: 'from-gray-500 to-gray-600',
      };
  }
}

export function SystemLogDetailModal({ log, isOpen, onClose }: SystemLogDetailModalProps) {
  if (!log) return null;

  const config = getLevelConfig(log.level);

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent
        side="left"
        className="w-full sm:max-w-lg p-0 flex flex-col [&>button]:hidden"
        dir="rtl"
      >
        {/* Header */}
        <div className={cn('p-4 sm:p-6 bg-gradient-to-br text-white relative', config.gradient)}>
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
            <div className="flex items-center gap-2 sm:gap-3 pl-10">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center bg-white/20 text-white flex-shrink-0">
                {config.icon}
              </div>
              <div className="text-right">
                <SheetTitle className="text-white text-base sm:text-lg">
                  جزئیات لاگ سیستم
                </SheetTitle>
                <SheetDescription className="text-white/80 text-xs sm:text-sm">
                  اطلاعات کامل لاگ
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>
        </div>

        {/* Content - Scrollable */}
        <ScrollArea className="flex-1 px-4 sm:px-6">
          <div className="space-y-4 py-4">
            {/* Level */}
            <div>
              <h3 className="text-xs sm:text-sm font-medium text-gray-700 mb-2">سطح لاگ</h3>
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium',
                  config.bg,
                  config.text,
                )}
              >
                {config.icon}
                {config.label}
              </span>
            </div>

            {/* Message */}
            <div>
              <h3 className="text-xs sm:text-sm font-medium text-gray-700 mb-2">پیام</h3>
              <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                <p className="text-xs sm:text-sm text-gray-900 leading-relaxed whitespace-pre-wrap font-mono break-words">
                  {log.message}
                </p>
              </div>
            </div>

            {/* Source */}
            <div>
              <h3 className="text-xs sm:text-sm font-medium text-gray-700 mb-2">منبع</h3>
              <code className="inline-block px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200 text-xs sm:text-sm text-gray-900 font-mono break-all">
                {log.source}
              </code>
            </div>

            {/* Time */}
            <div>
              <h3 className="text-xs sm:text-sm font-medium text-gray-700 mb-2">زمان ثبت</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                  <p className="text-[10px] sm:text-xs text-gray-600 mb-1">تاریخ</p>
                  <p className="text-xs sm:text-sm text-gray-900 font-medium">
                    {new Intl.DateTimeFormat('fa-IR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    }).format(new Date(log.timestamp))}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                  <p className="text-[10px] sm:text-xs text-gray-600 mb-1">ساعت</p>
                  <p className="text-xs sm:text-sm text-gray-900 font-medium">
                    {new Intl.DateTimeFormat('fa-IR', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    }).format(new Date(log.timestamp))}
                  </p>
                </div>
              </div>
            </div>

            {/* Log ID */}
            <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] sm:text-xs text-gray-600 flex-shrink-0">
                  شناسه لاگ
                </span>
                <code className="text-[10px] sm:text-xs font-mono text-gray-900 truncate">
                  {log.id}
                </code>
              </div>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
