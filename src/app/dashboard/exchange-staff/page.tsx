/**
 * صفحه مدیریت کارکنان صراف‌ها — فقط OWNER و ADMIN پلتفرم
 */
import { getAllStaff } from '@/actions/exchange-staff';
import { getAllExchanges } from '@/actions/exchanges';
import { auth } from '@/auth';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import ExchangeStaffClient from './_components/ExchangeStaffClient';

export const metadata: Metadata = {
  title: 'کارکنان صراف‌ها | داشبورد',
};

export default async function ExchangeStaffPage() {
  const session = await auth();
  if (!session?.user || !['OWNER', 'ADMIN'].includes(session.user.role as string)) {
    redirect('/dashboard');
  }

  const [staff, exchanges] = await Promise.all([getAllStaff(), getAllExchanges()]);

  return (
    <main
      style={{
        maxWidth: '1280px',
        margin: '0 auto',
        padding: 'var(--ds-space-6) var(--ds-space-5)',
      }}
    >
      <ExchangeStaffClient staff={staff} exchanges={exchanges} />
    </main>
  );
}
