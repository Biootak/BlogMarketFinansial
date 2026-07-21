'use client';

import SiteRouteError from '@/components/ui/SiteRouteError';

export default function ExchangesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <SiteRouteError
      error={error}
      reset={reset}
      section="صرافی‌ها"
      backHref="/"
      backLabel="صفحه اصلی"
    />
  );
}
