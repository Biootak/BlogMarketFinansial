'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import Loading from '@/components/Button/Loading';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { newVerification } from '@/actions/auth-actions';

const EmailIcon = () => (
  <div className="flex justify-center items-center">
    <svg
      xmlns="http://www.w3.org/2000/svg"
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
        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
      />
    </svg>
  </div>
);

const VerifyRequest = () => {
  const [error, setError] = useState<string | undefined>();
  const [success, setSuccess] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const onSubmit = useCallback(() => {
    if (isSubmitted || !token) {
      setIsLoading(false);
      return;
    }

    setIsSubmitted(true);
    newVerification(token)
      .then((data) => {
        if (data.success) {
          setSuccess(data.message);
        } else {
          setError(data.error);
        }
      })
      .catch((err) => {
        console.error('Verification error:', err);
        setError('خطایی در تأیید ایمیل رخ داد');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [token, isSubmitted]);

  useEffect(() => {
    onSubmit();
  }, [onSubmit]);

  const renderMessage = () => {
    if (isLoading) {
      return <Loading size="lg" variant="secondary" type="spinner" />;
    }
    if (success) {
      return <p className="text-green-500 text-center mt-4">{success}</p>;
    }
    if (error) {
      return <p className="text-red-500 text-center mt-4">{error}</p>;
    }
    return null;
  };
  return (
    <div
      dir="rtl"
      className="flex items-center justify-center bg-gradient-to-bl from-primary-100 via-neutral-100 to-secondary-100 dark:from-neutral-900 dark:via-neutral-800 dark:to-neutral-700 px-4 py-10 sm:px-6 lg:px-8 font-vazirmatn"
    >
      <div className="w-full max-w-md bg-white dark:bg-neutral-800 p-5 rounded-2xl shadow-lg transition-all duration-500 ease-in-out transform hover:scale-105 animate-fadeIn">
        <div className="text-center">
          <EmailIcon />
          <h2 className="mt-3 text-xl font-bold text-neutral-900 dark:text-neutral-50">
            تأیید درخواست
          </h2>
          <p className="mt-1 text-base text-neutral-700 dark:text-neutral-300">
            در حال تایید ایمیل شما هستیم.
          </p>
          <div className="flex justify-center items-center mt-2">{renderMessage()}</div>
        </div>

        <div className="mt-4">
          <Link
            href="/signin"
            className="group relative w-full flex justify-center items-center py-2 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-primary-700 hover:bg-primary-800 dark:bg-primary-600 dark:hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all duration-300 ease-in-out transform hover:-translate-y-1 hover:shadow-md"
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
};

export default function VerifyRequestPage() {
  return (
    <Suspense fallback={<Loading />}>
      <VerifyRequest />
    </Suspense>
  );
}
