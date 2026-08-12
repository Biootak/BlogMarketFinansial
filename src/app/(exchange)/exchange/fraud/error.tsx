'use client';

import { RouteError } from '@/components/Dashboard/primitives';

export default function ExchangeFraudError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteError
      error={error}
      reset={reset}
      section="بررسی تقلب"
      backHref="/exchange/fraud"
      backLabel="بازگشت به بررسی تقلب"
      suggestions={[
        { href: '/exchange/transactions', label: 'تراکنش‌ها', sub: 'ثبت و مشاهدهٔ تراکنش‌ها' },
        { href: '/exchange/kyc-review', label: 'بررسی KYC', sub: 'تأیید احراز هویت' },
      ]}
    />
  );
}
