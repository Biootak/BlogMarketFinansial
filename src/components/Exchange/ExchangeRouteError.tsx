'use client';

/**
 * ExchangeRouteError — @deprecated 2026-07-31
 *
 * این کامپوننت deprecated است. لطفاً مستقیماً از RouteError استفاده کنید:
 * import { RouteError } from '@/components/Dashboard/primitives'
 *
 * این فایل به دلایل سازگاری با import‌های موجود باقی مانده
 * و به RouteError پلتفرم delegate می‌کند.
 */

import { RouteError } from '@/components/Dashboard/primitives';

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
  section?: string;
}

/** @deprecated Use RouteError from @/components/Dashboard/primitives */
export default function ExchangeRouteError({ error, reset, section }: Props) {
  return (
    <RouteError
      error={error}
      reset={reset}
      section={section ?? 'پنل صرافی'}
      backHref="/exchange/dashboard"
      backLabel="داشبورد صرافی"
    />
  );
}
