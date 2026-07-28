import { ExchangeRatesSkeleton } from '@/components/Skeletons';

/**
 * Loading state for /dashboard/credit-rates.
 * Mirrors the visual structure of the actual page so the swap is seamless.
 */
export default function CreditRatesLoading() {
  return <ExchangeRatesSkeleton />;
}
