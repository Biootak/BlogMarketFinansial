import { DashboardPageSkeleton } from '@/components/Skeletons';

/**
 * Loading state for /dashboard/rate-lists.
 * The page itself redirects to /dashboard/exchange-rates?tab=lists, but
 * this skeleton covers the brief moment before the redirect completes.
 */
export default function RateListsLoading() {
  return <DashboardPageSkeleton />;
}
