'use client';

import SiteRouteError from '@/components/ui/SiteRouteError';

export default function TrackError({
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
      section="پیگیری معامله"
      backHref="/transfer"
      backLabel="صفحه انتقال"
    />
  );
}
