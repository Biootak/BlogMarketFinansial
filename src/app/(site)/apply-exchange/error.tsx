'use client';

import SiteRouteError from '@/components/ui/SiteRouteError';

export default function ApplyExchangeError({
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
      section="ثبت‌نام صرافی"
      backHref="/"
      backLabel="صفحه اصلی"
    />
  );
}
