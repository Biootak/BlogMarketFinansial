'use client';

import { RouteError } from '@/components/Dashboard/primitives';

export default function ExchangeAuditError({
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
      section="سوابق عملیات"
      backHref="/exchange/audit"
      backLabel="بازگشت به سوابق عملیات"
      suggestions={[
        { href: '/exchange/staff', label: 'کارکنان', sub: 'تیم و دسترسی‌ها' },
        { href: '/exchange/reports', label: 'گزارش‌ها', sub: 'گزارش‌های دوره‌ای' },
      ]}
    />
  );
}
