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
    // اینجا می‌توانید خطا را به یک سرویس گزارش خطا ارسال کنید
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <h2 className="text-2xl font-bold mb-4">مشکلی پیش آمد!</h2>
      <p className="mb-4">{error.message}</p>
      <ButtonPrimary onClick={() => reset()}>دوباره تلاش کنید</ButtonPrimary>
    </div>
  );
}
