import { getSettlements } from '@/actions/settlement';
import { auth } from '@/auth';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { SettlementClient } from './_components/SettlementClient';

export const metadata: Metadata = {
  title: 'تسویه‌حساب صرافی‌ها | داشبورد',
};

export default async function SettlementsPage() {
  const session = await auth();
  if (!session?.user || !['ADMIN', 'OWNER', 'SUPERADMIN'].includes(session.user.role ?? '')) {
    redirect('/dashboard');
  }

  const settlements = await getSettlements({ limit: 100 });

  return (
    <div className="at-page" dir="rtl">
      <SettlementClient settlements={settlements} />
    </div>
  );
}
