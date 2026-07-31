'use client';

import { RouteError } from '@/components/Dashboard/primitives';

export default function ApprovalsMineError({
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
      section="تأییدیه‌های من"
      backHref="/dashboard/approvals"
      backLabel="بازگشت به مرکز تأییدیه‌ها"
    />
  );
}
