'use client';

import { RouteError } from '@/components/Dashboard/primitives';

export default function PostEditError({
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
      section="ویرایش پست"
      backHref="/dashboard/posts"
      backLabel="پست‌ها"
    />
  );
}
