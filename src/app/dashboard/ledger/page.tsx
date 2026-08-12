import { getLedgerEntries, getLedgerExchanges } from '@/actions/ledger-actions';
import { auth } from '@/auth';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import LedgerClient from './_components/LedgerClient';

export const metadata: Metadata = {
  title: 'دفتر کل | داشبورد',
  description: 'کاوشگر تراکنش‌های دفتر کل پلتفرم',
};

export default async function LedgerPage() {
  const session = await auth();
  if (!session?.user) redirect('/auth?callbackUrl=/dashboard/ledger');
  const role = session.user.role ?? '';
  if (!['OWNER', 'SUPERADMIN', 'ADMIN'].includes(role)) redirect('/forbidden');

  const [list, exchanges] = await Promise.all([
    getLedgerEntries({ direction: 'ALL' }, { limit: 40 }),
    getLedgerExchanges(),
  ]);

  return (
    <div className="route-frame" dir="rtl">
      <LedgerClient
        initial={list.success ? (list.data ?? null) : null}
        exchanges={exchanges.success ? (exchanges.data ?? []) : []}
      />
    </div>
  );
}
