'use client';

import { RouteError } from '@/components/Dashboard/primitives';

export default function ApprovalsNewError({
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
      section="درخواست تأییدیه جدید"
      backHref="/dashboard/approvals"
      backLabel="بازگشت به مرکز تأییدیه‌ها"
    />
  );
}
