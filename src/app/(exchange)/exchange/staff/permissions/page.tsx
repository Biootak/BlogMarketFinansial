/**
 * /exchange/staff/permissions — ماتریس دسترسی نقش‌ها
 * --------------------------------------------------------------------------
 * نمایش ایستا از ماتریس capabilities. به‌عنوان راهنما برای OWNER/MANAGER
 * که می‌خواهند قبل از تغییر نقش، اثر آن را ببینند.
 * --------------------------------------------------------------------------
 */

import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { getExchangeForUser, getStaffMetrics } from '@/actions/exchanges';
import { auth } from '@/auth';
import { PageHeader } from '@/components/Dashboard/primitives/PageHeader';
import ExchangePageSkeleton from '@/components/Exchange/ExchangePageSkeleton';
import s from '../_components/StaffCockpit.module.css';
import { StaffRoleMatrix } from '../_components/StaffRoleMatrix';
import { StaffSubNav } from '../_components/StaffSubNav';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function StaffPermissionsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/auth?callbackUrl=/exchange/staff/permissions');
  const membership = await getExchangeForUser();
  if (!membership) redirect('/auth?callbackUrl=/exchange/dashboard&reason=exchange-not-found');

  const exchangeId = membership.exchange.id;
  const metrics = await getStaffMetrics(exchangeId);

  return (
    <>
      <PageHeader
        accent="emerald"
        eyebrow="صرافی · تیم"
        title="ماتریس دسترسی نقش‌ها"
        description="پیش‌نمایش capabilities هر نقش — قبل از تغییر نقش اعضا"
        breadcrumb={[
          { label: 'صرافی', href: '/exchange/dashboard' },
          { label: 'تیم', href: '/exchange/staff' },
          { label: 'دسترسی‌ها' },
        ]}
        icon="shield-check"
      />
      <Suspense fallback={<ExchangePageSkeleton statCount={0} tableRows={4} />}>
        <StaffSubNav
          active="permissions"
          activityCount={metrics.activeLast30d}
        />
        <div className={s.panel}>
          <header
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--ds-space-2)',
              paddingBlockEnd: 'var(--ds-space-3)',
              borderBlockEnd: '1px solid var(--at-line)',
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--at-accent)',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              سطح دسترسی
            </span>
            <h2 style={{ margin: 0, fontSize: 'var(--ds-text-lg)', fontWeight: 700, color: 'var(--at-fg)' }}>
              ماتریس Capability ↔ Role
            </h2>
            <p style={{ margin: 0, fontSize: 'var(--ds-text-xs)', color: 'var(--at-fg-muted)', maxWidth: '60ch' }}>
              هر capability یک عملیات مجزا در سامانه است. OWNER همه را دارد و
              سایر نقش‌ها به ترتیب سطح دسترسی پایین می‌آیند.
            </p>
          </header>
          <StaffRoleMatrix />
        </div>
      </Suspense>
    </>
  );
}
