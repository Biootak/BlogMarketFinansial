'use client';

import { X, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

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
        icon: <AlertCircle className="w-5 h-5" />,
        bg: 'bg-red-100',
        text: 'text-red-700',
        border: 'border-red-200',
        label: 'خطا',
        gradient: 'from-red-500 to-rose-600',
      };
    case 'WARNING':
      return {
        icon: <AlertTriangle className="w-5 h-5" />,
        bg: 'bg-amber-100',
        text: 'text-amber-700',
        border: 'border-amber-200',
        label: 'هشدار',
        gradient: 'from-amber-500 to-orange-600',
      };
    case 'INFO':
      return {
        icon: <Info className="w-5 h-5" />,
        bg: 'bg-blue-100',
        text: 'text-blue-700',
        border: 'border-blue-200',
        label: 'اطلاعات',
        gradient: 'from-blue-500 to-indigo-600',
      };
    default:
      return {
        icon: <Info className="w-5 h-5" />,
        bg: 'bg-gray-100',
        text: 'text-gray-700',
        border: 'border-gray-200',
        label: level,
        gradient: 'from-gray-500 to-gray-600',
      };
  }
}

export function SystemLogDetailModal({ log, isOpen, onClose }: SystemLogDetailModalProps) {
  if (!isOpen || !log) return null;

  const config = getLevelConfig(log.level);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="relative w-full max-w-lg sm:max-w-2xl max-h-[85vh] sm:max-h-[90vh] flex flex-col bg-white rounded-xl sm:rounded-2xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={cn('flex-shrink-0 p-4 sm:p-6 bg-gradient-to-l', config.gradient)}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center bg-white/20 text-white flex-shrink-0">{config.icon}</div>
              <div className="min-w-0 flex-1">
                <h2 className="text-base sm:text-xl font-bold text-white truncate">جزئیات لاگ سیستم</h2>
                <p className="text-white/80 text-xs sm:text-sm truncate">اطلاعات کامل</p>
              </div>
            </div>
            <button type="button" onClick={onClose} className="p-1.5 sm:p-2 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-all flex-shrink-0">
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 sm:space-y-4">
          {/* Level */}
          <div>
            <h3 className="text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">سطح لاگ</h3>
            <span className={cn('inline-flex items-center gap-1 sm:gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium', config.bg, config.text)}>
              {config.icon}
              {config.label}
            </span>
          </div>

          {/* Message */}
          <div>
            <h3 className="text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">پیام</h3>
            <div className="p-2.5 sm:p-3 rounded-lg bg-gray-50 border border-gray-200 max-h-32 sm:max-h-40 overflow-y-auto">
              <p className="text-xs sm:text-sm text-gray-900 leading-relaxed whitespace-pre-wrap font-mono break-words">{log.message}</p>
            </div>
          </div>

          {/* Source */}
          <div>
            <h3 className="text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">منبع</h3>
            <code className="inline-block px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg bg-gray-50 border border-gray-200 text-xs sm:text-sm text-gray-900 font-mono break-all">{log.source}</code>
          </div>

          {/* Time */}
          <div>
            <h3 className="text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">زمان ثبت</h3>
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <div className="p-2.5 sm:p-3 rounded-lg bg-gray-50 border border-gray-200">
                <p className="text-[10px] sm:text-xs text-gray-600 mb-0.5 sm:mb-1">تاریخ</p>
                <p className="text-xs sm:text-sm text-gray-900 font-medium">
                  {new Intl.DateTimeFormat('fa-IR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  }).format(new Date(log.timestamp))}
                </p>
              </div>
              <div className="p-2.5 sm:p-3 rounded-lg bg-gray-50 border border-gray-200">
                <p className="text-[10px] sm:text-xs text-gray-600 mb-0.5 sm:mb-1">ساعت</p>
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
          <div className="p-2.5 sm:p-3 rounded-lg bg-gray-50 border border-gray-200">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] sm:text-xs text-gray-600 flex-shrink-0">شناسه لاگ</span>
              <code className="text-[10px] sm:text-xs font-mono text-gray-900 truncate">{log.id}</code>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 p-3 sm:p-4 bg-gray-50 border-t border-gray-200">
          <button type="button" onClick={onClose} className="w-full px-4 py-2 sm:px-6 sm:py-2.5 rounded-lg sm:rounded-xl bg-gray-900 text-white text-sm sm:text-base font-medium hover:bg-gray-800 transition-all">
            بستن
          </button>
        </div>
      </div>
    </div>
  );
}
