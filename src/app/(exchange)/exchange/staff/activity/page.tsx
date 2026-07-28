/**
 * /exchange/staff/activity — لاگ ممیزی کامل تیم
 * --------------------------------------------------------------------------
 * نمایش همه فعالیت‌های ExchangeStaff + Customers + Transactions مرتبط
 * با این صرافی از AuditLog.
 * --------------------------------------------------------------------------
 */

import { Activity } from 'lucide-react';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { getExchangeForUser, getStaffActivity } from '@/actions/exchanges';
import { auth } from '@/auth';
import { PageHeader } from '@/components/Dashboard/primitives/PageHeader';
import ExchangePageSkeleton from '@/components/Exchange/ExchangePageSkeleton';
import s from '../_components/StaffCockpit.module.css';
import { StaffActivityFeed } from './_components/StaffActivityFeed';
import { StaffSubNav } from '../_components/StaffSubNav';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface PageProps {
  searchParams: Promise<{ tone?: string; actor?: string }>;
}

export default async function StaffActivityPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect('/auth/login');
  const membership = await getExchangeForUser();
  if (!membership) redirect('/auth/onboarding');

  const exchangeId = membership.exchange.id;
  const sp = await searchParams;
  const activity = await getStaffActivity(exchangeId, 100);

  return (
    <>
      <PageHeader
        accent="emerald"
        eyebrow="صرافی · تیم"
        title="لاگ ممیزی"
        description="همه اقدامات مهم اعضا روی صرافی — برای پاسخ‌گویی و انطباق"
        breadcrumb={[
          { label: 'صرافی', href: '/exchange/dashboard' },
          { label: 'تیم', href: '/exchange/staff' },
          { label: 'لاگ فعالیت' },
        ]}
        icon="clipboard-list"
      />
      <Suspense fallback={<ExchangePageSkeleton statCount={0} tableRows={8} />}>
        <StaffSubNav
          active="activity"
        />
        <div className={s.panel} style={{ minHeight: 320 }}>
          <header
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 'var(--ds-space-2)',
              paddingBlockEnd: 'var(--ds-space-3)',
              borderBlockEnd: '1px solid var(--at-line)',
              marginBlockEnd: 'var(--ds-space-4)',
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: 'var(--ds-text-sm)',
                fontWeight: 700,
                color: 'var(--at-fg)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Activity size={14} strokeWidth={2} aria-hidden style={{ color: 'var(--at-accent)' }} />
              همه رویدادها
            </h2>
            <span style={{ fontSize: 11, color: 'var(--at-fg-subtle)', fontWeight: 500 }}>
              {activity.length.toLocaleString('fa-IR')} رکورد از ۱۰۰ رکورد اخیر
            </span>
          </header>
          <StaffActivityFeed items={activity} initialTone={sp.tone ?? 'all'} />
        </div>
      </Suspense>
    </>
  );
}
