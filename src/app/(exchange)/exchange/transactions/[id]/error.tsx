'use client';

import { RouteError } from '@/components/Dashboard/primitives';

export default function TransactionDetailError({
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
      section="جزئیات تراکنش"
      backHref="/exchange/transactions"
      backLabel="تراکنش‌ها"
    />
  );
}
