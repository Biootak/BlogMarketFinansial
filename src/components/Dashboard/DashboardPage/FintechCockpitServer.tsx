/**
 * FintechCockpitServer — Server component
 * ──────────────────────────────────────────
 *  2026-07-31 redesign: one fetch boundary, all data passed to the
 *  client `FintechCockpit`. Failures fall back to safe defaults so
 *  a single bad table never breaks the home page.
 */

import { getFintechKpiData } from '@/actions/getFintechKpiData';
import { getLiveOpsData } from '@/actions/liveOpsActions';
import { getServiceRequestStats, getServiceRequests } from '@/actions/serviceRequestActions';
import { auth } from '@/auth';
import { checkRole } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { FintechCockpit, type FintechCockpitProps } from './FintechCockpit';

const safeNum = (n: unknown, fallback = 0): number =>
  typeof n === 'number' && Number.isFinite(n) ? n : fallback;

const safeString = (s: unknown, fallback = ''): string => (typeof s === 'string' ? s : fallback);

export async function FintechCockpitServer() {
  const session = await auth();
  if (!session?.user) {
    redirect('/auth?callbackUrl=/dashboard');
  }

  await checkRole(['OWNER', 'ADMIN', 'AUTHOR', 'SUPERADMIN']).catch(() => undefined);

  const userRole = (session.user.role ?? 'AUTHOR') as FintechCockpitProps['userRole'];
  const userName = (session.user.name ?? session.user.email ?? '').split(' ')[0] ?? '';

  const [kpiRes, statsRes, listRes, liveRes] = await Promise.all([
    getFintechKpiData().catch(() => null),
    getServiceRequestStats().catch(() => null),
    getServiceRequests({ status: 'PENDING', page: 1, limit: 6 }).catch(() => null),
    getLiveOpsData().catch(() => null),
  ]);

  // KPI
  const kpi = kpiRes && 'txn24h' in (kpiRes ?? {}) ? kpiRes : null;
  const kpiData: FintechCockpitProps['kpi'] = {
    txn24h: safeNum(kpi?.txn24h),
    activeCustomers: safeNum(kpi?.activeCustomers),
    openFraudCases: safeNum(kpi?.openFraudCases),
    pendingRequests: safeNum(kpi?.pendingRequests),
    dealsVolume: safeNum(kpi?.dealsVolume),
    dealsCurrency: safeString(kpi?.dealsCurrency, 'AFN'),
  };

  // Service stats
  const stats = statsRes?.success ? statsRes.data : null;
  const statsData: FintechCockpitProps['services']['stats'] = {
    pending: safeNum(stats?.pending, kpiData.pendingRequests),
    todayCount: safeNum(stats?.todayCount),
    pendingUrgent: safeNum(stats?.pendingUrgent, safeNum(stats?.urgent)),
    total: safeNum(stats?.total),
  };

  // Service list
  const list = listRes?.success ? listRes.data : null;
  const rawList = Array.isArray(list?.requests) ? list.requests : [];
  const recent: FintechCockpitProps['services']['recent'] = rawList.slice(0, 6).map((r) => {
    const x = r as Record<string, unknown>;
    return {
      id: safeString(x.id),
      trackingCode: safeString(x.trackingCode, '—'),
      fullName: safeString(x.fullName, '—'),
      serviceType: safeString(x.serviceType, 'OTHER'),
      amount: safeString(x.amount, '0'),
      currency: safeString(x.currency, 'AFN'),
      status: safeString(x.status, 'PENDING'),
      urgency: safeString(x.urgency, 'NORMAL'),
      createdAt:
        x.createdAt instanceof Date
          ? x.createdAt
          : typeof x.createdAt === 'string'
            ? x.createdAt
            : new Date().toISOString(),
    };
  });

  // Live ops
  const liveData = liveRes?.success ? liveRes.data : null;
  const live = {
    services:
      liveData?.services?.map((s) => ({
        id: safeString(s.id),
        name: safeString(s.name),
        desc: safeString(s.desc),
        status: (s.status as 'healthy' | 'degraded' | 'down' | 'idle') ?? 'healthy',
        latencyMs: s.latencyMs,
        href: s.href,
        iconName: s.iconName,
      })) ?? [],
    events:
      liveData?.events?.map((e) => ({
        id: safeString(e.id),
        type: e.type as 'deposit' | 'withdraw' | 'kyc' | 'order' | 'auth' | 'fraud',
        actor: safeString(e.actor),
        detail: safeString(e.detail),
        amount: e.amount
          ? {
              value: safeNum(e.amount.value),
              currency: e.amount.currency,
            }
          : undefined,
        timestamp: e.timestamp,
        href: e.href,
      })) ?? [],
    activityBars: Array.isArray(liveData?.activityBars)
      ? liveData.activityBars.filter((n) => typeof n === 'number')
      : Array(24).fill(0),
  };

  const props: FintechCockpitProps = {
    userName,
    userRole,
    kpi: kpiData,
    services: {
      stats: statsData,
      recent,
    },
    live,
    deadlines: [
      {
        label: 'بررسی KYC',
        detail: `${safeNum(statsData?.pending, kpiData.pendingRequests)} مورد در انتظار`,
        href: '/dashboard/kyc-review',
        daysLeft: kpiData.pendingRequests > 5 ? -1 : 2,
        iconName: 'shield-alert',
      },
      {
        label: 'تأیید درخواست‌ها',
        detail: `${safeNum(statsData?.pendingUrgent)} مورد فوری`,
        href: '/dashboard/approvals',
        daysLeft: safeNum(statsData?.pendingUrgent) > 3 ? 0 : 5,
        iconName: 'alert-triangle',
      },
      {
        label: 'اشتراک',
        detail: 'بررسی وضعیت اشتراک',
        href: '/dashboard/subscription',
        daysLeft: 14,
        iconName: 'clock',
      },
    ],
  };

  return <FintechCockpit {...props} />;
}

export default FintechCockpitServer;
