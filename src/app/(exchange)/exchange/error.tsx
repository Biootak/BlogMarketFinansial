'use client';

import { RouteError } from '@/components/Dashboard/primitives';

export default function ExchangeLayoutError({
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
      section="پنل صرافی"
      backHref="/dashboard"
      backLabel="داشبورد"
    />
  );
}
