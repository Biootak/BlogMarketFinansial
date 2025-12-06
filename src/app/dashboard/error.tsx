'use client';

import { Button } from '@/components/ui/button';
import { AlertTriangle, Home, RefreshCw, ServerOff, WifiOff } from 'lucide-react';
import Link from 'next/link';
import { useEffect } from 'react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function DashboardError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // فقط در development لاگ کن
    if (process.env.NODE_ENV === 'development') {
      console.error('Dashboard Error:', {
        message: error.message,
        digest: error.digest,
      });
    }
  }, [error]);

  // تشخیص نوع خطا
  const getErrorInfo = () => {
    const message = error.message?.toLowerCase() || '';

    if (
      message.includes('database') ||
      message.includes('prisma') ||
      message.includes("can't reach")
    ) {
      return {
        icon: ServerOff,
        title: 'خطای سرور',
        description: 'سرور موقتاً در دسترس نیست. لطفاً کمی صبر کنید.',
        color: 'text-orange-500',
        bg: 'bg-orange-100 dark:bg-orange-900/30',
      };
    }

    if (message.includes('network') || message.includes('fetch') || message.includes('timeout')) {
      return {
        icon: WifiOff,
        title: 'خطای اتصال',
        description: 'اتصال به سرور برقرار نشد. اتصال اینترنت را بررسی کنید.',
        color: 'text-red-500',
        bg: 'bg-red-100 dark:bg-red-900/30',
      };
    }

    return {
      icon: AlertTriangle,
      title: 'خطا در بارگذاری',
      description: 'مشکلی در بارگذاری این بخش پیش آمده است.',
      color: 'text-amber-500',
      bg: 'bg-amber-100 dark:bg-amber-900/30',
    };
  };

  const errorInfo = getErrorInfo();
  const Icon = errorInfo.icon;

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4" dir="rtl">
      <div className="max-w-md w-full bg-white dark:bg-neutral-800 rounded-2xl shadow-lg p-8 text-center border border-neutral-200 dark:border-neutral-700">
        {/* Icon */}
        <div
          className={`w-16 h-16 mx-auto mb-4 rounded-full ${errorInfo.bg} flex items-center justify-center`}
        >
          <Icon className={`w-8 h-8 ${errorInfo.color}`} />
        </div>

        {/* Title */}
        <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-50 mb-2">
          {errorInfo.title}
        </h2>

        {/* Description */}
        <p className="text-neutral-600 dark:text-neutral-400 mb-6">{errorInfo.description}</p>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <Button onClick={reset} className="w-full gap-2">
            <RefreshCw className="w-4 h-4" />
            تلاش مجدد
          </Button>

          <Link href="/dashboard">
            <Button variant="outline" className="w-full gap-2">
              <Home className="w-4 h-4" />
              داشبورد
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
