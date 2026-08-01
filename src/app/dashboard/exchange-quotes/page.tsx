import { getPendingQuotes } from '@/actions/exchange-quotes';
import { PageHeader, Section } from '@/components/Dashboard/primitives';
import { requireAdmin } from '@/lib/require-auth';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import ExchangeQuotesApprovalWorkspace from './_components/ExchangeQuotesApprovalWorkspace';

export const metadata: Metadata = { title: 'تایید قیمت‌گذاری صرافی‌ها' };
export const dynamic = 'force-dynamic';

export default async function ExchangeQuotesPage() {
  const auth = await requireAdmin();
  if (!auth.success) redirect('/dashboard');

  const pending = await getPendingQuotes();

  return (
    <main className="max-w-[1440px] mx-auto flex flex-col gap-5">
      <PageHeader
        variant="compact"
        breadcrumb={[
          { label: 'مرکز فرماندهی', href: '/dashboard' },
          { label: 'عملیات صرافی' },
          { label: 'تأیید قیمت‌ها' },
        ]}
        eyebrow="عملیات صرافی"
        title="صف تأیید قیمت‌گذاری"
        description="بررسی و تأیید قیمت‌های ارسالی صرافی‌ها با مقایسه با نرخ بازار."
        icon="bar-chart"
        accent="amber"
      />

      <Section>
        <ExchangeQuotesApprovalWorkspace initialPending={pending} />
      </Section>
    </main>
  );
}
