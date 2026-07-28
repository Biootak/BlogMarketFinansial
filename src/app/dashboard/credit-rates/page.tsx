import { PageHeader, Section } from '@/components/Dashboard/primitives';
import { CreditRatesClient } from './_components/CreditRatesClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'نرخ‌های اعتباری | داشبورد',
};

export default function CreditRatesPage() {
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
        <CreditRatesClient />
      </Section>
    </main>
  );
}
