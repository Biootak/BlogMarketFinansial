'use client';

import ButtonPrimary from '@/components/Button/ButtonPrimary';
import { useEffect } from 'react';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Development only — do not expose stack traces in production.
    if (process.env.NODE_ENV === 'development') {
      console.error('[posts] error boundary caught:', error);
    }
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <h2 className="text-2xl font-bold mb-4">مشکلی پیش آمد!</h2>
      <p className="mb-4">خطایی در بارگذاری پست‌ها رخ داده است. لطفاً دوباره تلاش کنید.</p>
      <ButtonPrimary onClick={() => reset()}>دوباره تلاش کنید</ButtonPrimary>
    </div>
  );
}
