'use client';

import { RouteError } from '@/components/Dashboard/primitives/RouteError';

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
      section="ثبت درخواست صرافی"
      backHref="/apply-exchange"
      backLabel="درخواست همکاری"
    />
  );
}
