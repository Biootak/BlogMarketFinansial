'use client';

import SiteRouteError from '@/components/ui/SiteRouteError';

export default function KycError({
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
      section="احراز هویت"
      backHref="/dashboard"
      backLabel="داشبورد"
    />
  );
}
