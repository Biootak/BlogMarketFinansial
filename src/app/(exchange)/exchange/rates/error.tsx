'use client';

import ExchangeRouteError from '@/components/Exchange/ExchangeRouteError';

export default function RatesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ExchangeRouteError error={error} reset={reset} section="نرخ‌ها" />;
}
