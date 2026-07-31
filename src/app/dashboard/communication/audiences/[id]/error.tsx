'use client';

import { RouteError } from '@/components/Dashboard/primitives';

export default function AudienceDetailError({
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
      section="جزئیات مخاطب"
      backHref="/dashboard/communication/audiences"
      backLabel="مخاطبان"
    />
  );
}
