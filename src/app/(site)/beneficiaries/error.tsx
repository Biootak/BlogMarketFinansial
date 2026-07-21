'use client';

import SiteRouteError from '@/components/ui/SiteRouteError';

export default function BeneficiariesError({
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
      section="دریافت‌کنندگان"
      backHref="/dashboard"
      backLabel="داشبورد"
    />
  );
}
