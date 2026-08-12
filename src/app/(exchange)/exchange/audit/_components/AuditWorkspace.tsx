'use client';

/**
 * AuditWorkspace — سوابق عملیات صرافی (premium glass, لایه‌دار).
 *
 * ساختار:
 *   ۱. Hero: رویدادهای امروز + «ترکیب اقدامات» (معامله/درخواست/تقلب/ورود/تیم)
 *   ۲. نوار KPI
 *   ۳. InsightLayout: فید (StaffActivityFeed مشترک) + rail (اعضای فعال / اقدامات پرریسک)
 */

import type { StaffActivityItem } from '@/actions/exchanges';
import {
  type BarItem,
  BarList,
  InsightCard,
  InsightLayout,
  InsightPanel,
  SplitBar,
  type SplitBarSegment,
} from '@/components/Dashboard/primitives/InsightPanel';
import { ExchangeKpiRibbon, type ExchangeKpiTile } from '@/components/Exchange/ExchangeKpiRibbon';
import { ExchangePageHero } from '@/components/Exchange/ExchangePageHero';
import { Activity, ClipboardList, History, LogIn, ShieldAlert, UserCheck } from 'lucide-react';
import { useMemo } from 'react';
import { StaffActivityFeed } from '../../staff/activity/_components/StaffActivityFeed';
import s from './AuditWorkspace.module.css';

const faNum = new Intl.NumberFormat('fa-IR');

interface Props {
  items: StaffActivityItem[];
}

const RISK_ACTIONS = new Set([
  'DEAL_CONFIRMED',
  'DEAL_COMPLETED',
  'REQUEST_APPROVED',
  'REQUEST_REJECTED',
  'FRAUD_RESOLVED',
  'FRAUD_CLOSED',
  'rate.updated',
  'staff.role.updated',
  'staff.invited',
  'staff.revoked',
]);

function categorize(action: string): { label: string; key: string } {
  if (action.startsWith('DEAL_')) return { key: 'deals', label: 'معاملات' };
  if (action.startsWith('REQUEST_')) return { key: 'requests', label: 'درخواست‌ها' };
  if (action.startsWith('FRAUD_')) return { key: 'fraud', label: 'تقلب' };
  if (action === 'login' || action === 'logout') return { key: 'auth', label: 'ورود/خروج' };
  if (action.startsWith('staff.') || action.startsWith('settings.') || action.startsWith('rate.')) {
    return { key: 'config', label: 'تنظیمات/تیم' };
  }
  return { key: 'other', label: 'سایر' };
}

const CAT_COLOR: Record<string, SplitBarSegment['color']> = {
  deals: 'emerald',
  requests: 'indigo',
  fraud: 'rose',
  auth: 'amber',
  config: 'violet',
  other: 'slate',
};

export default function AuditWorkspace({ items }: Props) {
  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayCount = items.filter((i) => new Date(i.createdAt) >= today).length;
    const loginCount = items.filter((i) => i.action === 'login').length;
    const riskCount = items.filter((i) => RISK_ACTIONS.has(i.action)).length;
    const actors = new Set(items.map((i) => i.actorName ?? i.actorEmail ?? '').filter(Boolean))
      .size;
    return { todayCount, loginCount, riskCount, actors };
  }, [items]);

  // ── دادهٔ rail ────────────────────────────────────────────────────────
  const catSegments: SplitBarSegment[] = useMemo(() => {
    const map = new Map<string, number>();
    for (const it of items) {
      const { key } = categorize(it.action);
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    const labels = new Map<string, string>();
    for (const it of items) labels.set(categorize(it.action).key, categorize(it.action).label);
    return Array.from(map.entries())
      .map(([key, value]) => ({
        label: labels.get(key) ?? key,
        value,
        color: CAT_COLOR[key] ?? 'slate',
      }))
      .sort((a, b) => b.value - a.value);
  }, [items]);

  const actorItems: BarItem[] = useMemo(() => {
    const map = new Map<string, number>();
    for (const it of items) {
      const name = it.actorName ?? it.actorEmail ?? 'سیستم';
      map.set(name, (map.get(name) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([label, value]) => ({ label, value, color: 'emerald' as const }));
  }, [items]);

  const riskItems: BarItem[] = useMemo(() => {
    const map = new Map<string, number>();
    for (const it of items) {
      if (!RISK_ACTIONS.has(it.action)) continue;
      map.set(it.action, (map.get(it.action) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([label, value]) => ({ label, value, color: 'rose' as const }));
  }, [items]);

  return (
    <div className={s.root}>
      {/* ── ۱. Hero + ترکیب اقدامات ──────────────── */}
      <ExchangePageHero
        eyebrow="صرافی · انطباق"
        title="سوابق عملیات"
        description="«چه کسی، چه کاری، کی انجام داد» — لاگ ممیزی خودکار همهٔ اقدامات تیم با نقش و IP"
        statValue={faNum.format(stats.todayCount)}
        statLabel="رویدادهای امروز"
        trend={
          stats.riskCount > 0
            ? { label: `${faNum.format(stats.riskCount)} اقدام پرریسک در بازه`, tone: 'down' }
            : { label: 'بدون اقدام پرریسک', tone: 'neutral' }
        }
        liveLabel="ثبت خودکار همهٔ اقدامات"
        visual={<ActionMix segments={catSegments} total={items.length} />}
      />

      {/* ── ۲. روبان KPI فشرده ───────────────────── */}
      <ExchangeKpiRibbon
        tiles={
          [
            {
              label: 'رویدادهای امروز',
              value: faNum.format(stats.todayCount),
              icon: ClipboardList,
              tone: 'emerald',
              trend:
                stats.todayCount > 0
                  ? { dir: 'up', label: 'در بازه' }
                  : { dir: 'flat', label: 'در بازه' },
            },
            {
              label: 'ورود به پنل',
              value: faNum.format(stats.loginCount),
              icon: LogIn,
              tone: 'sky',
              sub: 'در بازهٔ نمایش',
            },
            {
              label: 'اقدامات پرریسک',
              value: faNum.format(stats.riskCount),
              icon: ShieldAlert,
              tone: 'rose',
              trend:
                stats.riskCount > 0
                  ? { dir: 'down', label: 'تأیید/تغییر نرخ' }
                  : { dir: 'flat', label: 'بدون مورد' },
            },
            {
              label: 'اعضای فعال',
              value: faNum.format(stats.actors),
              icon: History,
              tone: 'violet',
              sub: 'افراد دارای اقدام',
            },
          ] as ExchangeKpiTile[]
        }
      />

      {/* ── ۳. فید + rail ────────────────────────── */}
      <InsightLayout
        main={
          <div className={s.feedPanel}>
            <StaffActivityFeed items={items} />
          </div>
        }
        aside={
          <InsightPanel>
            <InsightCard title="ترکیب اقدامات" icon={Activity}>
              <SplitBar data={catSegments} />
            </InsightCard>
            <InsightCard title="اعضای فعال" icon={UserCheck}>
              <BarList data={actorItems} />
            </InsightCard>
            <InsightCard title="اقدامات پرریسک" icon={ShieldAlert}>
              <BarList data={riskItems} />
            </InsightCard>
          </InsightPanel>
        }
      />
    </div>
  );
}

// ─── Action mix visual (hero) ────────────────────────────────────────────────

function ActionMix({ segments, total }: { segments: SplitBarSegment[]; total: number }) {
  const sum = segments.reduce((s, x) => s + x.value, 0);

  return (
    <div className={s.mixCard}>
      <div className={s.mixHead}>
        <span>ترکیب اقدامات در بازه</span>
        <b>{faNum.format(total)} رویداد</b>
      </div>
      <div className={s.mixTrack}>
        {sum > 0 ? (
          segments.map((seg) => (
            <div
              key={seg.label}
              className={s.mixSeg}
              style={{
                width: `${(seg.value / sum) * 100}%`,
                background: `var(--ds-accent-${seg.color === 'slate' ? 'slate' : seg.color})`,
              }}
              title={`${seg.label}: ${seg.value}`}
            />
          ))
        ) : (
          <div className={s.mixEmpty} />
        )}
      </div>
      <div className={s.mixLegend}>
        {segments.map((seg) => (
          <span key={seg.label} className={s.mixLegendItem}>
            <i
              style={{
                background: `var(--ds-accent-${seg.color === 'slate' ? 'slate' : seg.color})`,
              }}
            />
            {seg.label} <b>{faNum.format(seg.value)}</b>
          </span>
        ))}
        {segments.length === 0 && <span className={s.mixEmptyText}>هنوز رویدادی ثبت نشده</span>}
      </div>
    </div>
  );
}
