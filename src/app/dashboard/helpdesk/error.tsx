'use client';

import { RouteError } from '@/components/Dashboard/primitives';

export default function HelpdeskError({
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
      section="مرکز تیکت‌ها"
      backHref="/dashboard"
      backLabel="بازگشت به داشبورد"
    />
  );
}
