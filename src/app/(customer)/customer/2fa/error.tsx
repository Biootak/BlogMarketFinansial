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
      section="ورود دو مرحله‌ای"
      backHref="/customer/security"
      backLabel="مرکز امنیت"
    />
  );
}
