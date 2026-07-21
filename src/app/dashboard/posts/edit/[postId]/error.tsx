'use client';

import { Button } from '@/components/ui/button';
import * as Sentry from '@sentry/nextjs';
import { AlertTriangle, ArrowRight, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useEffect } from 'react';

export default function PostEditError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4" dir="rtl">
      <div className="max-w-sm w-full text-center flex flex-col items-center gap-4">
        <div className="w-14 h-14 rounded-full flex items-center justify-center bg-amber-100 dark:bg-amber-900/30">
          <AlertTriangle className="w-7 h-7 text-amber-500" strokeWidth={1.75} aria-hidden />
        </div>
        <div>
          <h2 className="text-lg font-bold mb-1">خطا در ویرایش پست</h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
            مشکلی در بارگذاری ویرایشگر پیش آمده است. لطفاً دوباره تلاش کنید.
          </p>
          {process.env.NODE_ENV === 'development' && error.digest && (
            <p className="mt-2 text-xs text-neutral-400 font-mono">کد: {error.digest}</p>
          )}
        </div>
        <div className="flex flex-col gap-2 w-full">
          <Button onClick={reset} className="w-full gap-2">
            <RefreshCw className="w-4 h-4" aria-hidden />
            تلاش مجدد
          </Button>
          <Link href="/dashboard/posts">
            <Button variant="outline" className="w-full gap-2">
              <ArrowRight className="w-4 h-4" aria-hidden />
              بازگشت به پست‌ها
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
