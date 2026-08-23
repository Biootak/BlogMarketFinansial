'use client';

// 2026-08-23 perf: deep import — the barrel re-exports every dashboard
// primitive (ActivityFeed + admin module CSS), which landed ~450KB of
// admin assets on every public page via this global boundary.
import { RouteError } from '@/components/Dashboard/primitives/RouteError';

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteError error={error} reset={reset} backHref="/" backLabel="صفحه اصلی" />;
}
