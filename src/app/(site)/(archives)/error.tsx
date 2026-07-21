'use client';

import SiteRouteError from '@/components/ui/SiteRouteError';

export default function ArchiveError({
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
      section="آرشیو"
      backHref="/"
      backLabel="صفحه اصلی"
    />
  );
}
