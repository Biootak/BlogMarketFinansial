'use client';

import { RouteError } from '@/components/Dashboard/primitives';

export default function CommunicationError({
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
      section="مرکز ارتباطات"
      backHref="/dashboard"
      backLabel="بازگشت به داشبورد"
    />
  );
}
