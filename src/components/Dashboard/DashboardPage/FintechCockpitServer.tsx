/**
 *  FintechCockpitServer — تنها مرز fetch داشبورد خانه.
 *
 *  2026-08 redesign: علاوه بر KPI / service requests / live ops، حالا
 *  aggregate های واقعی (`getCockpitInsights`) و نرخ‌های بازار
 *  (`getMarketRates`) هم اینجا خوانده و به کلاینت پاس داده می‌شوند.
 *  هر fetch جدا catch می‌شود؛ خرابی یک جدول کل صفحه را نمی‌خواباند.
 *
 *  `serverNow` هم پاس داده می‌شود تا ساعت/«چند دقیقه پیش» در رندر سرور و
 *  کلاینت یکی باشد و hydration mismatch رخ ندهد.
 */

import { getCockpitInsights } from '@/actions/getCockpitInsights';
import { getFintechKpiData } from '@/actions/getFintechKpiData';
import { getLiveOpsData } from '@/actions/liveOpsActions';
import { getMarketRates } from '@/actions/market-rates';
import { getServiceRequestStats, getServiceRequests } from '@/actions/serviceRequestActions';
import { auth } from '@/auth';
import { checkRole } from '@/lib/auth';
import { redirect } from 'next/navigation';
import type React from 'react';
import {
  FintechCockpit,
  type CockpitRate,
  type FintechCockpitProps,
} from './FintechCockpit';

const num = (value: unknown, fallback = 0) =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;
const str = (value: unknown, fallback = '') => (typeof value === 'string' ? value : fallback);

/** حداکثر تعداد نرخی که در نوار بازار نمایش داده می‌شود. */
const TAPE_LIMIT = 10;

export async function FintechCockpitServer({ editorial }: { editorial?: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect('/auth?callbackUrl=/dashboard');
  await checkRole(['OWNER', 'ADMIN', 'AUTHOR', 'SUPERADMIN']).catch(() => undefined);

  const role = (session.user.role ?? 'AUTHOR') as FintechCockpitProps['userRole'];
  const userName = (session.user.name ?? session.user.email ?? '').split(' ')[0] ?? '';

  const [kpiRes, statsRes, listRes, liveRes, insightsRes, ratesRes] = await Promise.all([
    getFintechKpiData().catch(() => null),
    getServiceRequestStats().catch(() => null),
    getServiceRequests({ status: 'PENDING', page: 1, limit: 6 }).catch(() => null),
    getLiveOpsData().catch(() => null),
    getCockpitInsights().catch(() => null),
    getMarketRates().catch(() => null),
  ]);

  const kpi = kpiRes && 'txn24h' in kpiRes ? kpiRes : null;
  const kpiData = {
    txn24h: num(kpi?.txn24h),
    activeCustomers: num(kpi?.activeCustomers),
    openFraudCases: num(kpi?.openFraudCases),
    pendingRequests: num(kpi?.pendingRequests),
    dealsVolume: num(kpi?.dealsVolume),
    dealsCurrency: str(kpi?.dealsCurrency, 'AFN'),
  };

  const stats = statsRes?.success ? statsRes.data : null;
  const statsData = {
    pending: num(stats?.pending, kpiData.pendingRequests),
    todayCount: num(stats?.todayCount),
    pendingUrgent: num(stats?.pendingUrgent, num(stats?.urgent)),
    total: num(stats?.total),
  };

  const list = listRes?.success ? listRes.data : null;
  const recent = (Array.isArray(list?.requests) ? list.requests : []).slice(0, 6).map((row) => {
    const item = row as Record<string, unknown>;
    return {
      id: str(item.id),
      trackingCode: str(item.trackingCode, '---'),
      fullName: str(item.fullName, '---'),
      serviceType: str(item.serviceType, 'OTHER'),
      amount: str(item.amount, '0'),
      currency: str(item.currency, 'AFN'),
      status: str(item.status, 'PENDING'),
      urgency: str(item.urgency, 'NORMAL'),
      createdAt:
        item.createdAt instanceof Date || typeof item.createdAt === 'string'
          ? item.createdAt
          : new Date().toISOString(),
    };
  });

  const liveData = liveRes?.success ? liveRes.data : null;
  const live = {
    services:
      liveData?.services?.map((item) => ({
        id: str(item.id),
        name: str(item.name),
        desc: str(item.desc),
        status:
          (item.status as FintechCockpitProps['live']['services'][number]['status']) ?? 'idle',
        latencyMs: item.latencyMs,
        href: item.href,
        iconName: item.iconName,
      })) ?? [],
    events:
      liveData?.events?.map((item) => ({
        id: str(item.id),
        type: item.type as FintechCockpitProps['live']['events'][number]['type'],
        actor: str(item.actor),
        detail: str(item.detail),
        amount: item.amount
          ? { value: num(item.amount.value), currency: str(item.amount.currency) }
          : undefined,
        timestamp: item.timestamp,
        href: item.href,
      })) ?? [],
    activityBars: Array.isArray(liveData?.activityBars)
      ? liveData.activityBars.filter((value): value is number => typeof value === 'number')
      : [],
  };

  const insights = insightsRes?.success ? insightsRes.data : undefined;

  // MarketRateItem → CockpitRate: divisor اعمال، مرتب بر اساس priority.
  const rates: CockpitRate[] = (Array.isArray(ratesRes) ? ratesRes : [])
    .filter((item) => Number.isFinite(item.value) && item.value > 0)
    .sort((a, b) => a.priority - b.priority)
    .slice(0, TAPE_LIMIT)
    .map((item) => ({
      symbol: item.symbol,
      label: item.displayNameFa || item.symbol,
      value: item.divisor > 0 ? item.value / item.divisor : item.value,
      decimals: Number.isFinite(item.decimals) ? item.decimals : 0,
      unit: item.unit,
      changePercent: Number.isFinite(item.changePercent) ? item.changePercent : 0,
    }));

  return (
    <FintechCockpit
      userName={userName}
      userRole={role}
      serverNow={Date.now()}
      kpi={kpiData}
      services={{ stats: statsData, recent }}
      live={live}
      insights={insights}
      rates={rates}
      editorial={editorial}
    />
  );
}

export default FintechCockpitServer;
