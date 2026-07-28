import { UsersTableSkeleton } from '@/components/Skeletons';

/**
 * Loading state for /dashboard/exchange-quotes.
 * Mirrors the table layout of the actual approval workspace.
 */
export default function ExchangeQuotesLoading() {
  return <UsersTableSkeleton rows={8} />;
}
