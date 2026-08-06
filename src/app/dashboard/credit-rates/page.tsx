import { getAllCreditRates, getCreditRateAggregates } from '@/actions/credit-rates';
import CreditRatesClient from './CreditRatesClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'نرخ‌های اعتباری | داشبورد',
};

/**
 * سربرگ و پوستهٔ چیدمان اینجا نیستند.
 * `CreditRatesClient` خودش `<main>` و `<Section>`های خودش را رندر می‌کند و
 * سربرگ را هم — چون اکشن‌های «افزودن بانک» و «ثبت نرخ» مودال کلاینتی باز
 * می‌کنند. نسخهٔ قبلی هم سربرگ دوم می‌ساخت و هم `<main>` تودرتو.
 * قرارداد در `primitives/pageHeaders.ts` → owner: 'client'.
 */
export default async function CreditRatesPage() {
  const [ratesResult, aggResult] = await Promise.all([
    getAllCreditRates(),
    getCreditRateAggregates(),
  ]);

  const banks = ratesResult.success ? ratesResult.data.banks : [];
  const rates = ratesResult.success ? ratesResult.data.rates : [];
  const aggregates = aggResult.success ? aggResult.data : null;

  return (
    <CreditRatesClient
      initialBanks={banks}
      initialRates={rates}
      initialAggregates={aggregates}
    />
  );
}
