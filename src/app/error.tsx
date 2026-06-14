'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Wrench, WifiOff, Lock, Search, AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // لاگ کردن خطا (می‌تونی به Sentry یا سرویس دیگه بفرستی)
    console.error('Application Error:', {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
    });
  }, [error]);

  // نمایش پیام مناسب بر اساس نوع خطا
  const getErrorInfo = () => {
    const message = error.message?.toLowerCase() || '';

    // خطاهای دیتابیس
    if (message.includes('database') || message.includes('prisma') || message.includes("can't reach")) {
      return {
        title: 'خطای سرور',
        description: 'سرور موقتاً در دسترس نیست. لطفاً چند لحظه صبر کنید و دوباره تلاش کنید.',
        icon: Wrench,
      };
    }

    if (message.includes('network') || message.includes('fetch') || message.includes('timeout')) {
      return {
        title: 'خطای اتصال',
        description: 'اتصال به سرور برقرار نشد. لطفاً اتصال اینترنت خود را بررسی کنید.',
        icon: WifiOff,
      };
    }

    if (message.includes('unauthorized') || message.includes('401')) {
      return {
        title: 'دسترسی غیرمجاز',
        description: 'شما دسترسی به این بخش را ندارید. لطفاً وارد حساب کاربری شوید.',
        icon: Lock,
      };
    }

    if (message.includes('not found') || message.includes('404')) {
      return {
        title: 'یافت نشد',
        description: 'صفحه یا منبع مورد نظر یافت نشد.',
        icon: Search,
      };
    }

    return {
      title: 'خطای غیرمنتظره',
      description: 'متأسفانه مشکلی پیش آمده است. لطفاً دوباره تلاش کنید.',
      icon: AlertTriangle,
    };
  };

  const errorInfo = getErrorInfo();
  const Icon = errorInfo.icon;

  return (
    <div
      dir="rtl"
      className="min-h-[60vh] flex items-center justify-center p-4"
    >
      <div className="max-w-md w-full bg-white dark:bg-neutral-800 rounded-2xl shadow-xl p-8 text-center">
        {/* Icon */}
        <div className="mb-4 flex justify-center">
          <Icon className="w-14 h-14 text-rose-500" strokeWidth={1.5} aria-hidden />
        </div>
        {/* Title */}
        <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50 mb-2">
          {errorInfo.title}
        </h2>

        {/* Description */}
        <p className="text-neutral-600 dark:text-neutral-400 mb-6">
          {errorInfo.description}
        </p>

        {/* Error digest for debugging - فقط در development */}
        {process.env.NODE_ENV === 'development' && error.digest && (
          <p className="text-xs text-neutral-400 dark:text-neutral-500 mb-4 font-mono">
            کد خطا: {error.digest}
          </p>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <Button
            onClick={reset}
            className="w-full gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            تلاش مجدد
          </Button>

          <Link href="/" className="w-full">
            <Button variant="outline" className="w-full gap-2">
              <Home className="w-4 h-4" />
              بازگشت به صفحه اصلی
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
