'use client';

import Link from 'next/link';
import { useEffect } from 'react';

const ErrorIcon = () => (
  <div className="flex justify-center items-center">
    <svg
      className="h-16 w-16 text-primary-700 dark:text-primary-400 animate-pulse"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
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

  let errorMessage = 'متأسفانه مشکلی پیش آمده است';
  let errorDescription =
    'لطفاً صفحه را بازنشانی کنید یا بعداً دوباره تلاش کنید. اگر مشکل ادامه داشت، با پشتیبانی تماس بگیرید.';

  if (error.message === 'OAuthAccountNotLinked') {
    errorMessage = 'حساب کاربری مرتبط نیست';
    errorDescription = 'این ایمیل قبلاً با روش دیگری ثبت شده است. لطفاً از همان روش استفاده کنید.';
  }

  return (
    <div
      dir="rtl"
      className="flex items-center justify-center bg-gradient-to-bl from-primary-100 via-neutral-100 to-secondary-100 dark:from-neutral-900 dark:via-neutral-800 dark:to-neutral-700 px-4 py-10 sm:px-6 lg:px-8 font-vazirmatn"
    >
      <div className="w-full max-w-md bg-white dark:bg-neutral-800 p-5 rounded-2xl shadow-lg transition-all duration-500 ease-in-out transform hover:scale-105 animate-fadeIn">
        <div className="text-center">
          <ErrorIcon />
          <h2 className="mt-3 text-xl font-bold text-neutral-900 dark:text-neutral-50">
            {errorMessage}
          </h2>
          <p className="mt-1 text-base text-neutral-700 dark:text-neutral-300">
            {errorDescription}
          </p>
        </div>
        <div className="mt-4 space-y-2">
          <button
            type="button"
            onClick={reset}
            className="group relative w-full flex justify-center items-center py-2 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-primary-700 hover:bg-primary-800 dark:bg-primary-600 dark:hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all duration-300 ease-in-out transform hover:-translate-y-1 hover:shadow-md"
          >
            تلاش مجدد
          </button>
          <Link
            href="/signin"
            className="group relative w-full flex justify-center items-center py-2 px-4 border border-transparent text-sm font-medium rounded-lg text-primary-700 bg-transparent hover:bg-primary-50 dark:text-primary-400 dark:hover:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all duration-300 ease-in-out"
          >
            بازگشت به صفحه ورود
            <span className="absolute left-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              ←
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
