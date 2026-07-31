'use client';

import { RouteError } from '@/components/Dashboard/primitives';

export default function HelpdeskNewError({
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
      section="تیکت جدید"
      backHref="/dashboard/helpdesk"
      backLabel="بازگشت به مرکز پشتیبانی"
    />
  );
}
