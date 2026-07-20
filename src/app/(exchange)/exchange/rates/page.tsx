/**
 * /exchange/rates — مدیریت نرخ‌های صراف در پنل اختصاصی
 *
 * صراف می‌تواند نرخ خودش را که در صفحه عمومی /money-transfer نمایش داده می‌شود
 * از اینجا ویرایش کند.
 */

import { getExchangeForUser } from '@/actions/exchanges';
import { getExchangeProvider } from '@/actions/transfer-providers';
import { auth } from '@/auth';
import { PageHeader } from '@/components/Dashboard/primitives';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import ExchangeRatesWorkspace from './_components/ExchangeRatesWorkspace';

export const metadata: Metadata = { title: 'مدیریت نرخ‌ها' };

export default async function ExchangeRatesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin');

  const membership = await getExchangeForUser(session.user.id);
  if (!membership) redirect('/dashboard');

  const { exchange } = membership;

  const provider = await getExchangeProvider(exchange.id);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-6)' }}>
      <PageHeader
        title="مدیریت نرخ‌ها"
        description="نرخ‌های صرافی خود را تنظیم کنید تا در صفحه مقایسه سایت نمایش داده شوند"
        breadcrumb={[{ label: 'پنل صرافی' }, { label: 'نرخ‌ها' }]}
      />

      <ExchangeRatesWorkspace exchange={exchange} provider={provider} />
    </div>
  );
}
