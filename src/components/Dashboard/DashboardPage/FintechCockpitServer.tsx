import { getFintechKpiData } from '@/actions/getFintechKpiData';
import { getLiveOpsData } from '@/actions/liveOpsActions';
import { getServiceRequestStats, getServiceRequests } from '@/actions/serviceRequestActions';
import { auth } from '@/auth';
import { checkRole } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { FintechCockpit, type FintechCockpitProps } from './FintechCockpit';

const safeNum = (n: unknown, fallback = 0): number =>
  typeof n === 'number' && Number.isFinite(n) ? n : fallback;
const safeString = (s: unknown, fallback = '') => (typeof s === 'string' ? s : fallback);

/** One server boundary for the operator cockpit. All values remain DB/action-backed. */
export async function FintechCockpitServer() {
  const session = await auth();
  if (!session?.user) redirect('/auth?callbackUrl=/dashboard');

  await checkRole(['OWNER', 'ADMIN', 'AUTHOR', 'SUPERADMIN']).catch(() => undefined);
  const userRole = (session.user.role ?? 'AUTHOR') as FintechCockpitProps['userRole'];
  const userName = (session.user.name ?? session.user.email ?? '').split(' ')[0] ?? '';

  const [kpiRes, statsRes, listRes, liveRes] = await Promise.all([
    getFintechKpiData().catch(() => null),
    getServiceRequestStats().catch(() => null),
    getServiceRequests({ status: 'PENDING', page: 1, limit: 6 }).catch(() => null),
    getLiveOpsData().catch(() => null),
  ]);

  const kpi = kpiRes && 'txn24h' in kpiRes ? kpiRes : null;
  const kpiData: FintechCockpitProps['kpi'] = {
    txn24h: safeNum(kpi?.txn24h),
    activeCustomers: safeNum(kpi?.activeCustomers),
    openFraudCases: safeNum(kpi?.openFraudCases),
    pendingRequests: safeNum(kpi?.pendingRequests),
    dealsVolume: safeNum(kpi?.dealsVolume),
    dealsCurrency: safeString(kpi?.dealsCurrency, 'AFN'),
  };

  const stats = statsRes?.success ? statsRes.data : null;
  const statsData: FintechCockpitProps['services']['stats'] = {
    pending: safeNum(stats?.pending, kpiData.pendingRequests),
    todayCount: safeNum(stats?.todayCount),
    pendingUrgent: safeNum(stats?.pendingUrgent, safeNum(stats?.urgent)),
    total: safeNum(stats?.total),
  };

  const list = listRes?.success ? listRes.data : null;
  const recent: FintechCockpitProps['services']['recent'] = (Array.isArray(list?.requests) ? list.requests : [])
    .slice(0, 6)
    .map((r) => {
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

  const liveData = liveRes?.success ? liveRes.data : null;
  const live = {
    services:
      liveData?.services?.map((item) => ({
        id: safeString(item.id),
        name: safeString(item.name),
        desc: safeString(item.desc),
        status: (item.status as 'healthy' | 'degraded' | 'down' | 'idle') ?? 'healthy',
        latencyMs: item.latencyMs,
        href: item.href,
        iconName: item.iconName,
      })) ?? [],
    events:
      liveData?.events?.map((item) => ({
        id: safeString(item.id),
        type: item.type as 'deposit' | 'withdraw' | 'kyc' | 'order' | 'auth' | 'fraud',
        actor: safeString(item.actor),
        detail: safeString(item.detail),
        amount: item.amount ? { value: safeNum(item.amount.value), currency: item.amount.currency } : undefined,
        timestamp: item.timestamp,
        href: item.href,
      })) ?? [],
    activityBars: Array.isArray(liveData?.activityBars)
      ? liveData.activityBars.filter((n) => typeof n === 'number')
      : Array(24).fill(0),
  };

  return (
    <div className="dashboard-cockpit-root">
      <FintechCockpit
        userName={userName}
        userRole={userRole}
        kpi={kpiData}
        services={{ stats: statsData, recent }}
        live={live}
      />
    </div>
  );
}

export default FintechCockpitServer;
