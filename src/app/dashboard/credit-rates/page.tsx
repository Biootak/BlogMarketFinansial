// src/app/dashboard/credit-rates/page.tsx
import { getAllCreditRates, getCreditRateAggregates } from '@/actions/credit-rates';
import { requireAdmin } from '@/lib/require-auth';
import { redirect } from 'next/navigation';
import CreditRatesClient from './CreditRatesClient';

export const metadata = {
  title: 'مدیریت نرخ‌های اعتباری و بانک‌ها',
};

export default async function CreditRatesPage() {
  const auth = await requireAdmin();
  if (!auth.success) {
    redirect('/dashboard');
  }

  const [ratesResult, aggregatesResult] = await Promise.all([
    getAllCreditRates(),
    getCreditRateAggregates(),
  ]);

  const initialBanks = ratesResult.success ? ratesResult.data.banks : [];
  const initialRates = ratesResult.success ? ratesResult.data.rates : [];
  const initialAggregates = aggregatesResult.success ? aggregatesResult.data : null;

  return (
    <CreditRatesClient
      initialBanks={initialBanks}
      initialRates={initialRates}
      initialAggregates={initialAggregates}
    />
  );
}
