'use client';

import SiteRouteError from '@/components/ui/SiteRouteError';

export default function ContactError({
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
      section="تماس با ما"
      backHref="/"
      backLabel="صفحه اصلی"
    />
  );
}
