'use client';

import { RouteError } from '@/components/Dashboard/primitives';

export default function HelpdeskMineError({
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
      section="تیکت‌های من"
      backHref="/dashboard/helpdesk"
      backLabel="بازگشت به مرکز پشتیبانی"
    />
  );
}
