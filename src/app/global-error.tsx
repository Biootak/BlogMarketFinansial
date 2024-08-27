'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect } from 'react';

const ErrorIcon = () => (
  <div className="flex justify-center items-center mb-4">
    <Image src="/images/pixeltrue-error.svg" alt="خطا" width={150} height={150} />
  </div>
);

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const errorMessage = 'متأسفانه مشکلی پیش آمده است';
  const errorDescription =
    'لطفاً صفحه را بازنشانی کنید یا بعداً دوباره تلاش کنید. اگر مشکل ادامه داشت، با پشتیبانی تماس بگیرید.';

  return (
    <div
      dir="rtl"
      className="flex items-center justify-center min-h-screen bg-gradient-to-bl from-primary-100 via-neutral-100 to-secondary-100 dark:from-neutral-900 dark:via-neutral-800 dark:to-neutral-700 px-4 py-10 sm:px-6 lg:px-8 font-vazirmatn"
    >
      <div className="w-full max-w-md bg-white dark:bg-neutral-800 p-6 rounded-2xl shadow-lg transition-all duration-500 ease-in-out transform hover:shadow-xl animate-fadeIn">
        <div className="text-center">
          <ErrorIcon />
          <h2 className="mt-3 text-2xl font-bold text-neutral-900 dark:text-neutral-50">
            {errorMessage}
          </h2>
          <p className="mt-2 text-lg text-neutral-700 dark:text-neutral-300">{errorDescription}</p>
        </div>
        <div className="mt-6 space-y-2">
          <button
            type="button"
            onClick={reset}
            className="group relative w-full flex justify-center items-center py-2 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-primary-700 hover:bg-primary-800 dark:bg-primary-600 dark:hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all duration-300 ease-in-out transform hover:-translate-y-1 hover:shadow-md"
          >
            تلاش مجدد
          </button>
          <Link
            href="/"
            className="group relative w-full flex justify-center items-center py-2 px-4 border border-transparent text-sm font-medium rounded-lg text-primary-700 bg-transparent hover:bg-primary-50 dark:text-primary-400 dark:hover:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all duration-300 ease-in-out"
          >
            بازگشت به صفحه اصلی
            <span className="absolute left-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              ←
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
