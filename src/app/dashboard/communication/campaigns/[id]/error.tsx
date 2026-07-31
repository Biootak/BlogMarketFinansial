'use client';

import { RouteError } from '@/components/Dashboard/primitives';

export default function RouteErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteError
      error={error}
      reset={reset}
      section="جزئیات کمپین"
      backHref="/dashboard/communication/campaigns"
      backLabel="کمپین‌ها"
    />
  );
}
