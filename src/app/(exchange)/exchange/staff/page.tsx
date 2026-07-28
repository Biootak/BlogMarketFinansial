import { getExchangeForUser, getExchangeStaff } from '@/actions/exchanges';
/**
 * /exchange/staff — مدیریت کارمندان صراف
 */
import { auth } from '@/auth';
import { PageHeader } from '@/components/Dashboard/primitives';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import StaffWorkspace from './_components/StaffWorkspace';

export const metadata: Metadata = { title: 'کارمندان صرافی' };

export default async function StaffPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin');

  const membership = await getExchangeForUser();
  if (!membership) redirect('/dashboard');

  // فقط OWNER و MANAGER صرافی به این صفحه دسترسی دارند
  if (!['OWNER', 'MANAGER'].includes(membership.staffRole)) redirect('/exchange/dashboard');

  const staff = await getExchangeStaff(membership.exchange.id);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-5)' }}>
      <PageHeader
        title="کارمندان"
        description="مدیریت اعضای تیم و سطوح دسترسی"
        breadcrumb={[{ label: 'پنل صرافی' }, { label: 'کارمندان' }]}
      />
      <StaffWorkspace
        exchangeId={membership.exchange.id}
        initialStaff={staff}
        currentUserId={session.user.id}
      />
    </div>
  );
}
