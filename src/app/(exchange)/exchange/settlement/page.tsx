/**
 * /exchange/settlement — تسویه‌حساب صرافی
 *
 * صراف دوره‌های تسویه، حجم معاملات، کارمزد پلتفرم و درآمد خالص خود را می‌بیند.
 * OWNER/MANAGER می‌توانند وضعیت را تأیید کنند.
 */

import { getExchangeForUser } from '@/actions/exchanges';
import { auth } from '@/auth';
import { PageHeader } from '@/components/Dashboard/primitives';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import SettlementWorkspace from './_components/SettlementWorkspace';

export const metadata: Metadata = { title: 'تسویه‌حساب | پنل صرافی' };

export default async function SettlementPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin');

  const membership = await getExchangeForUser(session.user.id);
  if (!membership) redirect('/dashboard');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-6)' }}>
      <PageHeader
        title="تسویه‌حساب"
        description="دوره‌های تسویه، حجم معاملات و کارمزد پلتفرم."
        breadcrumb={[{ label: 'پنل صرافی' }, { label: 'تسویه‌حساب' }]}
      />
      <SettlementWorkspace
        exchangeId={membership.exchange.id}
        staffRole={membership.staffRole}
      />
    </div>
  );
}
