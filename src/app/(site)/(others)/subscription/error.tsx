'use client';

import SiteRouteError from '@/components/ui/SiteRouteError';

export default function SubscriptionError({
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
      section="اشتراک"
      backHref="/"
      backLabel="صفحه اصلی"
    />
  );
}
