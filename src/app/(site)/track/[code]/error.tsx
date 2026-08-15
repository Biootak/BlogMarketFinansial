'use client';

import { RouteError } from '@/components/Dashboard/primitives/RouteError';

export default function TrackCodeError({
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
      section="پیگیری معامله"
      backHref="/track"
      backLabel="جستجوی مجدد"
    />
  );
}
