'use client';

import { RouteError } from '@/components/Dashboard/primitives';

export default function RateListsError({
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
      section="فهرست نرخ‌ها"
      backHref="/dashboard/exchange-rates"
      backLabel="بازگشت به نرخ ارز"
    />
  );
}
