'use client';

import { RouteError } from '@/components/Dashboard/primitives';

export default function ApprovalsError({
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
      section="تأییدیه‌ها"
      backHref="/dashboard"
      backLabel="بازگشت به داشبورد"
    />
  );
}
