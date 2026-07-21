'use client';

import SiteRouteError from '@/components/ui/SiteRouteError';
import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function MoneyTransferError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <SiteRouteError
      error={error}
      reset={reset}
      section="حواله پول"
      backHref="/"
      backLabel="صفحه اصلی"
    />
  );
}
