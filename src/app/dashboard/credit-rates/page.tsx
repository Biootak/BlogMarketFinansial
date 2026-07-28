import { getAllCreditRates, getCreditRateAggregates } from '@/actions/credit-rates';
import { PageHeader, Section } from '@/components/Dashboard/primitives';
import CreditRatesClient from './CreditRatesClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'نرخ‌های اعتباری | داشبورد',
};

export default async function CreditRatesPage() {
  const [ratesResult, aggResult] = await Promise.all([
    getAllCreditRates(),
    getCreditRateAggregates(),
  ]);

  const banks = ratesResult.success ? ratesResult.data.banks : [];
  const rates = ratesResult.success ? ratesResult.data.rates : [];
  const aggregates = aggResult.success ? aggResult.data : null;

  return (
    <main className="max-w-[1440px] mx-auto flex flex-col gap-5">
      <PageHeader
        breadcrumb={[
          { label: 'مرکز فرماندهی', href: '/dashboard' },
          { label: 'عملیات مالی' },
          { label: 'نرخ‌های اعتباری' },
        ]}
        eyebrow="عملیات مالی"
        title="نرخ‌های اعتباری"
        description="پایش و مدیریت نرخ سود، تسهیلات و خطوط اعتباری برای همکاری با بانک‌ها و مؤسسات."
        icon="bar-chart"
        accent="amber"
      />

      <Section>
        <CreditRatesClient
          initialBanks={banks}
          initialRates={rates}
          initialAggregates={aggregates}
        />
      </Section>
    </main>
  );
}
