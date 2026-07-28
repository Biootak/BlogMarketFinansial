import { DashboardPageSkeleton } from '@/components/Skeletons';

/**
 * Loading state for /dashboard/header-ad.
 * The page itself redirects to /dashboard/advertisements, but this skeleton
 * covers the brief moment before the redirect completes.
 */
export default function HeaderAdLoading() {
  return <DashboardPageSkeleton />;
}
