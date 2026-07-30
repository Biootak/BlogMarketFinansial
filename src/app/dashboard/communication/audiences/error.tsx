'use client';

import { RouteError } from '@/components/Dashboard/primitives';

export default function AudiencesError({
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
      section="مخاطبان هدف"
      backHref="/dashboard/communication"
      backLabel="بازگشت به مرکز ارتباطات"
    />
  );
}
