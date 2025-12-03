'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw, Home, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function DashboardError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error('Dashboard Error:', {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
    });
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4" dir="rtl">
      <div className="max-w-md w-full bg-white dark:bg-neutral-800 rounded-2xl shadow-lg p-8 text-center border border-neutral-200 dark:border-neutral-700">
        {/* Icon */}
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
          <AlertTriangle className="w-8 h-8 text-red-500" />
        </div>

        {/* Title */}
        <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-50 mb-2">
          خطا در بارگذاری
        </h2>

        {/* Description */}
        <p className="text-neutral-600 dark:text-neutral-400 mb-4">
          مشکلی در بارگذاری این بخش پیش آمده است.
        </p>

        {/* Error details (only in development) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mb-4 p-3 bg-neutral-100 dark:bg-neutral-900 rounded-lg text-right">
            <p className="text-xs font-mono text-red-600 dark:text-red-400 break-all">
              {error.message}
            </p>
          </div>
        )}

        {/* Error digest */}
        {error.digest && (
          <p className="text-xs text-neutral-400 mb-4 font-mono">
            کد: {error.digest}
          </p>
        )}

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
