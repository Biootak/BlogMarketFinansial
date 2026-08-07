/**
 * /exchange/profile — پروفایل عمومی صرافی
 *
 * صفحه‌ای مستقل از /exchange/settings:
 *   - settings → پیکربندی عملیاتی (KYC, daily limit, fees)
 *   - profile  → هویت بصری و اطلاعاتی که مشتریان می‌بینند
 *
 * فقط OWNER و MANAGER می‌توانند ویرایش کنند.
 */
import { getExchangeForUser } from '@/actions/exchanges';
import { auth } from '@/auth';
import { PageHeader } from '@/components/Dashboard/primitives';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import ProfileWorkspace from './_components/ProfileWorkspace';

export const metadata: Metadata = { title: 'پروفایل صرافی' };

export default async function ExchangeProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/auth?callbackUrl=/exchange/profile');

  const membership = await getExchangeForUser();
  if (!membership) redirect('/dashboard');

  // فقط OWNER و MANAGER صرافی به این صفحه دسترسی دارند
  if (!['OWNER', 'MANAGER'].includes(membership.staffRole)) redirect('/exchange/dashboard');

  const { exchange, staffRole } = membership;
  const canEdit = staffRole === 'OWNER' || staffRole === 'MANAGER';

  return (
    <div
      className="at-page"
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-5)' }}
    >
      <PageHeader
        title="پروفایل عمومی"
        description="هویت بصری و اطلاعاتی که مشتریان در صفحهٔ عمومی شما می‌بینند"
        breadcrumb={[{ label: 'پنل صرافی', href: '/exchange/dashboard' }, { label: 'پروفایل' }]}
        icon="building"
        accent="emerald"
        eyebrow="هویت عمومی"
      />

      <ProfileWorkspace exchange={exchange} canEdit={canEdit} />
    </div>
  );
}
