'use client';

import SiteRouteError from '@/components/ui/SiteRouteError';

export default function WalletError({
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
      section="کیف پول"
      backHref="/dashboard"
      backLabel="داشبورد"
    />
  );
}
