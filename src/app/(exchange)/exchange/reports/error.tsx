'use client';

import ExchangeRouteError from '@/components/Exchange/ExchangeRouteError';

export default function ReportsExchangeError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ExchangeRouteError error={error} reset={reset} section="گزارش‌ها" />;
}
