'use client';

import { RouteError } from '@/components/Dashboard/primitives';

export default function ExchangeLedgerError({
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
      section="دفتر کل"
      backHref="/exchange/ledger"
      backLabel="بازگشت به دفتر کل"
      suggestions={[
        { href: '/exchange/settlement', label: 'تسویه‌حساب', sub: 'دوره‌ها و کارمزدها' },
        { href: '/exchange/transactions', label: 'تراکنش‌ها', sub: 'ثبت و مشاهدهٔ تراکنش‌ها' },
      ]}
    />
  );
}
