'use client';

import { RouteError } from '@/components/Dashboard/primitives';

export default function ExchangeRequestsError({
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
      section="درخواست‌های مشتری"
      backHref="/exchange/requests"
      backLabel="بازگشت به درخواست‌ها"
      suggestions={[
        { href: '/exchange/kyc-review', label: 'بررسی KYC', sub: 'تأیید احراز هویت' },
        { href: '/exchange/customers', label: 'مشتریان', sub: 'مدیریت مشتریان صرافی' },
      ]}
    />
  );
}
