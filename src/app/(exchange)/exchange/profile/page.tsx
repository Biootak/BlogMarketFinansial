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
  if (!session?.user?.id) redirect('/signin');

  const membership = await getExchangeForUser();
  if (!membership) redirect('/dashboard');

  const { exchange, staffRole } = membership;
  const canEdit = staffRole === 'OWNER' || staffRole === 'MANAGER';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-6)' }}>
      <PageHeader
        title="پروفایل صرافی"
        description="اطلاعاتی که مشتریان در صفحه عمومی صرافی شما می‌بینند"
        breadcrumb={[
          { label: 'پنل صرافی', href: '/exchange/dashboard' },
          { label: 'پروفایل' },
        ]}
        icon="building"
        accent="indigo"
        actions={
          <a
            href={`/exchanges/${exchange.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0 14px',
              height: '36px',
              borderRadius: '8px',
              border: '1px solid var(--at-line)',
              background: 'var(--at-surface)',
              color: 'var(--at-fg)',
              fontSize: 'var(--ds-text-sm)',
              textDecoration: 'none',
            }}
          >
            مشاهده صفحه عمومی
          </a>
        }
      />
      <ProfileWorkspace exchange={exchange} canEdit={canEdit} />
    </div>
  );
}
