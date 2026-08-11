import { getExchangeForUser } from '@/actions/exchanges';
/**
 * /exchange/customers/import — ویزارد ورود دسته‌جمعی.
 *
 * دو مسیر: CSV (drag/drop) و paste-rows. در هر دو،
 * validation و pre-flight preview قبل از ثبت.
 */
import { auth } from '@/auth';
import { PageHeader } from '@/components/Dashboard/primitives';
import { CustomerImportWizard } from '@/components/Exchange/customers/CustomerImportWizard';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = { title: 'ورود دسته‌جمعی مشتریان · صرافی' };

export default async function ImportPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/auth?callbackUrl=/exchange/customers/import');

  const membership = await getExchangeForUser();
  if (!membership) redirect('/forbidden');

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
