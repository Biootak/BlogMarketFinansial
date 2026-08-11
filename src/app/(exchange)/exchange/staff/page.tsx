/**
 * /exchange/staff — Team Cockpit (2026 redesign)
 * --------------------------------------------------------------------------
 * بازطراحی کامل از /exchange/staff:
 *  - ساختار از «یک لیست + یک فرم» به یک Cockpit با KPI/Orbit/Directory/Activity
 *  - زیرمسیرها: /permissions و /activity
 *  - همه داده‌ها از Prisma aggregate (ExchangeStaff + AuditLog)
 *  - امنیت: requireExchangeAccess (write فقط برای OWNER/MANAGER)
 * --------------------------------------------------------------------------
 */

import { getExchangeForUser } from '@/actions/exchanges';
import { getExchangeStaff, getStaffActivity, getStaffMetrics } from '@/actions/exchanges';
import { auth } from '@/auth';
import { PageHeader, Section } from '@/components/Dashboard/primitives';
import { BookmarkButton } from '@/components/Dashboard/primitives/BookmarkButton';
import ExchangePageSkeleton from '@/components/Exchange/ExchangePageSkeleton';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { StaffCockpit } from './_components/StaffCockpit';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function StaffPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/auth?callbackUrl=/exchange/staff');
  const membership = await getExchangeForUser();
  // 2026-08-10: لاگین‌شده بدون عضویت → /forbidden (نه /auth — حلقهٔ بی‌پایان)
  if (!membership) redirect('/forbidden');

  const exchangeId = membership.exchange.id;
  const exchangeName = membership.exchange.name ?? 'صرافی';
  const role = membership.staffRole;

  const [members, metrics, activity] = await Promise.all([
    getExchangeStaff(exchangeId),
    getStaffMetrics(exchangeId),
    getStaffActivity(exchangeId, 30),
  ]);

  // canWrite: OWNER یا MANAGER می‌توانند تیم را ویرایش کنند
  const canWrite = role === 'OWNER' || role === 'MANAGER';
  const canRevoke = canWrite;

  return (
    <>
      <PageHeader
        accent="emerald"
        eyebrow="صرافی"
        title="تیم و دسترسی‌ها"
        description="اعضای فعال، سلسله‌مراتب اختیارات و لاگ ممیزی در یک نگاه"
        breadcrumb={[{ label: 'صرافی', href: '/exchange/dashboard' }, { label: 'تیم' }]}
        icon="users"
        actions={<BookmarkButton pageKey="exchange-staff" />}
      />
      <Section padding="none">
        <Suspense fallback={<ExchangePageSkeleton statCount={4} tableRows={6} />}>
          <StaffCockpit
            exchangeId={exchangeId}
            exchangeName={exchangeName}
            currentUserId={session.user.id}
            canWrite={canWrite}
            canRevoke={canRevoke}
            members={members}
            metrics={metrics}
            activity={activity}
          />
        </Suspense>
      </Section>
    </>
  );
}
