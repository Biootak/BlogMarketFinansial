'use client';

import { AlertTriangle, RefreshCw, WifiOff, ServerOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorStateProps {
  title?: string;
  message?: string;
  type?: 'default' | 'network' | 'database' | 'notFound';
  onRetry?: () => void;
  className?: string;
  compact?: boolean;
}

const errorConfig = {
  default: {
    icon: AlertTriangle,
    title: 'خطایی رخ داده است',
    message: 'مشکلی در بارگذاری اطلاعات پیش آمده است.',
    color: 'text-amber-500',
    bg: 'bg-amber-50 dark:bg-amber-900/20',
  },
  network: {
    icon: WifiOff,
    title: 'خطای اتصال',
    message: 'اتصال به سرور برقرار نشد. اتصال اینترنت را بررسی کنید.',
    color: 'text-red-500',
    bg: 'bg-red-50 dark:bg-red-900/20',
  },
  database: {
    icon: ServerOff,
    title: 'خطای سرور',
    message: 'سرور موقتاً در دسترس نیست. لطفاً کمی صبر کنید.',
    color: 'text-orange-500',
    bg: 'bg-orange-50 dark:bg-orange-900/20',
  },
  notFound: {
    icon: AlertTriangle,
    title: 'یافت نشد',
    message: 'اطلاعات مورد نظر یافت نشد.',
    color: 'text-slate-500',
    bg: 'bg-slate-50 dark:bg-slate-800',
  },
};

export default function ErrorState({
  title,
  message,
  type = 'default',
  onRetry,
  className = '',
  compact = false,
}: ErrorStateProps) {
  const config = errorConfig[type];
  const Icon = config.icon;

  if (compact) {
    return (
      <div
        className={`flex items-center gap-3 p-4 rounded-xl ${config.bg} ${className}`}
        dir="rtl"
      >
        <Icon className={`w-5 h-5 ${config.color} flex-shrink-0`} />
        <p className="text-sm text-neutral-600 dark:text-neutral-400 flex-1">
          {message || config.message}
        </p>
        {onRetry && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRetry}
            className="flex-shrink-0"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col items-center justify-center p-8 text-center ${className}`}
      dir="rtl"
    >
      <div
        className={`w-16 h-16 rounded-full ${config.bg} flex items-center justify-center mb-4`}
      >
        <Icon className={`w-8 h-8 ${config.color}`} />
      </div>

      <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-50 mb-2">
        {title || config.title}
      </h3>

      <p className="text-neutral-600 dark:text-neutral-400 mb-4 max-w-sm">
        {message || config.message}
      </p>

      {onRetry && (
        <Button onClick={onRetry} variant="outline" className="gap-2">
          <RefreshCw className="w-4 h-4" />
          تلاش مجدد
        </Button>
      )}
    </div>
  );
}
