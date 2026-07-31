'use client';

import { RouteError } from '@/components/Dashboard/primitives';

export default function RouteErrorPage({
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
      section="ویرایش اعلان"
      backHref="/dashboard/communication/announcements"
      backLabel="اعلان‌ها"
    />
  );
}
