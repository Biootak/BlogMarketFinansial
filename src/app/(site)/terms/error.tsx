'use client';

import SiteRouteError from '@/components/ui/SiteRouteError';

export default function TermsError({
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
      section="قوانین"
      backHref="/"
      backLabel="صفحه اصلی"
    />
  );
}
