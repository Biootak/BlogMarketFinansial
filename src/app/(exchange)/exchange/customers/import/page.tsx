/**
 * /exchange/customers/import — ویزارد ورود دسته‌جمعی.
 *
 * دو مسیر: CSV (drag/drop) و paste-rows. در هر دو،
 * validation و pre-flight preview قبل از ثبت.
 */
import { auth } from '@/auth';
import { getExchangeForUser } from '@/actions/exchanges';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/Dashboard/primitives';
import { CustomerImportWizard } from '@/components/exchange/customers/CustomerImportWizard';

export const metadata: Metadata = { title: 'ورود دسته‌جمعی مشتریان · صرافی' };

export default async function ImportPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin');

  const membership = await getExchangeForUser();
  if (!membership) redirect('/dashboard');

  if (membership.staffRole === 'VIEWER') {
    redirect('/exchange/customers');
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-5)' }}>
      <PageHeader
        title="ورود دسته‌جمعی"
        description="از CSV یا paste ساده. پیش‌نمایش قبل از ثبت، خطاها به تفکیک."
        breadcrumb={[
          { label: 'پنل صرافی' },
          { label: 'مشتریان', href: '/exchange/customers' },
          { label: 'ورود دسته‌جمعی' },
        ]}
      />
      <CustomerImportWizard
        exchangeId={membership.exchange.id}
        primaryCurrency={membership.exchange.primaryCurrency ?? 'AFN'}
      />
    </div>
  );
}
