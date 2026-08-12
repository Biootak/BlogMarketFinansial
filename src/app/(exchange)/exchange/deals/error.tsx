'use client';

import { RouteError } from '@/components/Dashboard/primitives';

export default function ExchangeDealsError({
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
      section="معاملات ارزی"
      backHref="/exchange/deals"
      backLabel="بازگشت به معاملات ارزی"
      suggestions={[
        { href: '/exchange/quotes', label: 'قیمت‌گذاری', sub: 'نرخ‌های فعال صرافی' },
        { href: '/exchange/transactions', label: 'تراکنش‌ها', sub: 'ثبت و مشاهدهٔ تراکنش‌ها' },
        { href: '/exchange/customers', label: 'مشتریان', sub: 'مدیریت مشتریان صرافی' },
      ]}
    />
  );
}
