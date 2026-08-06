import { getFintechKpiData } from '@/actions/getFintechKpiData';
import { getLiveOpsData } from '@/actions/liveOpsActions';
import { getServiceRequestStats, getServiceRequests } from '@/actions/serviceRequestActions';
import { auth } from '@/auth';
import { checkRole } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { FintechCockpit, type FintechCockpitProps } from './FintechCockpit';

const num = (value: unknown, fallback = 0) => typeof value === 'number' && Number.isFinite(value) ? value : fallback;
const str = (value: unknown, fallback = '') => typeof value === 'string' ? value : fallback;

export async function FintechCockpitServer() {
  const session = await auth();
  if (!session?.user) redirect('/auth?callbackUrl=/dashboard');
  await checkRole(['OWNER', 'ADMIN', 'AUTHOR', 'SUPERADMIN']).catch(() => undefined);
  const role = (session.user.role ?? 'AUTHOR') as FintechCockpitProps['userRole'];
  const userName = (session.user.name ?? session.user.email ?? '').split(' ')[0] ?? '';
  const [kpiRes, statsRes, listRes, liveRes] = await Promise.all([getFintechKpiData().catch(() => null), getServiceRequestStats().catch(() => null), getServiceRequests({ status: 'PENDING', page: 1, limit: 6 }).catch(() => null), getLiveOpsData().catch(() => null)]);
  const kpi = kpiRes && 'txn24h' in kpiRes ? kpiRes : null;
  const kpiData = { txn24h: num(kpi?.txn24h), activeCustomers: num(kpi?.activeCustomers), openFraudCases: num(kpi?.openFraudCases), pendingRequests: num(kpi?.pendingRequests), dealsVolume: num(kpi?.dealsVolume), dealsCurrency: str(kpi?.dealsCurrency, 'AFN') };
  const stats = statsRes?.success ? statsRes.data : null;
  const statsData = { pending: num(stats?.pending, kpiData.pendingRequests), todayCount: num(stats?.todayCount), pendingUrgent: num(stats?.pendingUrgent, num(stats?.urgent)), total: num(stats?.total) };
  const list = listRes?.success ? listRes.data : null;
  const recent = (Array.isArray(list?.requests) ? list.requests : []).slice(0, 6).map((row) => { const item = row as Record<string, unknown>; return { id: str(item.id), trackingCode: str(item.trackingCode, '---'), fullName: str(item.fullName, '---'), serviceType: str(item.serviceType, 'OTHER'), amount: str(item.amount, '0'), currency: str(item.currency, 'AFN'), status: str(item.status, 'PENDING'), urgency: str(item.urgency, 'NORMAL'), createdAt: item.createdAt instanceof Date || typeof item.createdAt === 'string' ? item.createdAt : new Date().toISOString() }; });
  const liveData = liveRes?.success ? liveRes.data : null;
  const live = { services: liveData?.services?.map((item) => ({ id: str(item.id), name: str(item.name), desc: str(item.desc), status: (item.status as FintechCockpitProps['live']['services'][number]['status']) ?? 'idle', latencyMs: item.latencyMs, href: item.href, iconName: item.iconName })) ?? [], events: liveData?.events?.map((item) => ({ id: str(item.id), type: item.type as FintechCockpitProps['live']['events'][number]['type'], actor: str(item.actor), detail: str(item.detail), amount: item.amount ? { value: num(item.amount.value), currency: str(item.amount.currency) } : undefined, timestamp: item.timestamp, href: item.href })) ?? [], activityBars: Array.isArray(liveData?.activityBars) ? liveData.activityBars.filter((value): value is number => typeof value === 'number') : [] };
  return <FintechCockpit userName={userName} userRole={role} kpi={kpiData} services={{ stats: statsData, recent }} live={live} />;
}

export default FintechCockpitServer;
