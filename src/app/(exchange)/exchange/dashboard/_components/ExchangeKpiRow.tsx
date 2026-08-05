/**
 * ExchangeKpiRow — 4 compact KPI tiles (Server Component).
 *
 * طراحی: کارت‌های 92px با padding متراکم، نه StatCard بزرگ.
 * دلیل: hero number خودش بزرگ‌ترین است؛ KPIها باید «نشانه» باشند
 * نه «جلب توجه». سه tone دارد: emerald/amber/rose/sky.
 */

import type { DashboardKpi } from '@/actions/exchange-dashboard';
import {
  ArrowDownRight,
  ArrowUpRight,
  CircleDollarSign,
  Clock,
  Minus,
  UserPlus,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import s from './ExchangeDashboard.module.css';

type Tone = 'emerald' | 'amber' | 'rose' | 'sky';

interface Tile {
  label: string;
  value: string;
  icon: 'users' | 'clock' | 'money' | 'plus';
  tone: Tone;
  href?: string;
  trend?: { dir: 'up' | 'down' | 'flat'; label: string };
  sub?: string;
}

// Module-level Intl singleton — created once at module load
const _faNum = new Intl.NumberFormat('fa-IR');

function formatFaNumber(n: number): string {
  return _faNum.format(n);
}

function formatCompactNumber(n: number): string {
  return new Intl.NumberFormat('fa-IR', { notation: 'compact', maximumFractionDigits: 1 }).format(
    n,
  );
}

function pickIcon(name: Tile['icon']): LucideIcon {
  switch (name) {
    case 'users':
      return Users;
    case 'clock':
      return Clock;
    case 'money':
      return CircleDollarSign;
    case 'plus':
      return UserPlus;
  }
}

function KpiCard({ tile, Icon }: { tile: Tile; Icon: LucideIcon }) {
  const body = (
    <>
      <div className={s.kpiTileHead}>
        <span>{tile.label}</span>
        <span className={s.kpiTileIcon} data-tone={tile.tone} aria-hidden>
          <Icon size={14} strokeWidth={1.75} />
        </span>
      </div>
      <div className={s.kpiTileValue} dir="ltr">
        {tile.value}
      </div>
      <div className={s.kpiTileFoot}>
        {tile.trend ? (
          <span className={s.kpiTrend} data-trend={tile.trend.dir}>
            {tile.trend.dir === 'up' && <ArrowUpRight size={12} aria-hidden />}
            {tile.trend.dir === 'down' && <ArrowDownRight size={12} aria-hidden />}
            {tile.trend.dir === 'flat' && <Minus size={12} aria-hidden />}
            <span dir="ltr">{tile.trend.label}</span>
          </span>
        ) : (
          <span aria-hidden />
        )}
        {tile.sub && <span>{tile.sub}</span>}
      </div>
    </>
  );

  if (tile.href) {
    return (
      <Link
        href={tile.href}
        role="listitem"
        className={s.kpiTile}
        aria-label={`${tile.label} — ${tile.value}`}
      >
        {body}
      </Link>
    );
  }
  return (
    <div role="listitem" className={s.kpiTile}>
      {body}
    </div>
  );
}

export default function ExchangeKpiRow({ kpi }: { kpi: DashboardKpi }) {
  // حجم به عدد (÷ 100) برای compact display
  const totalVolumeNum = Number(BigInt(kpi.totalVolume)) / 100;

  const todayDeltaPct =
    kpi.yesterdayCount > 0
      ? Math.round(((kpi.todayCount - kpi.yesterdayCount) / kpi.yesterdayCount) * 100)
      : 0;
  const trendDir: 'up' | 'down' | 'flat' =
    todayDeltaPct > 0 ? 'up' : todayDeltaPct < 0 ? 'down' : 'flat';

  const tiles: Tile[] = [
    {
      label: 'کل مشتریان',
      value: formatFaNumber(kpi.totalCustomers),
      icon: 'users',
      tone: 'emerald',
      href: '/exchange/customers',
      sub: kpi.todayNewCustomers > 0 ? `${formatFaNumber(kpi.todayNewCustomers)} جدید امروز` : '—',
    },
    {
      label: 'تراکنش امروز',
      value: formatFaNumber(kpi.todayCount),
      icon: 'clock',
      tone: 'sky',
      sub: `میانگین ۳۰روز: ${formatFaNumber(kpi.avgDaily30d)}`,
      trend: {
        dir: trendDir,
        label: `${Math.abs(todayDeltaPct)}٪ ${trendDir === 'up' ? 'رشد' : trendDir === 'down' ? 'کاهش' : 'بدون تغییر'}`,
      },
    },
    {
      label: 'در انتظار تأیید',
      value: formatFaNumber(kpi.pendingCount),
      icon: 'plus',
      tone: kpi.pendingCount > 0 ? 'amber' : 'emerald',
      href: '/exchange/transactions?status=PENDING',
      sub: kpi.pendingCount === 0 ? 'همه تأیید شده‌اند' : 'نیاز به پردازش',
    },
    {
      label: `حجم کل (${kpi.statsCurrency})`,
      value: formatCompactNumber(totalVolumeNum),
      icon: 'money',
      tone: 'emerald',
      sub: 'تجمیعی تکمیل‌شده',
    },
  ];

  return (
    <div className={s.kpiRow} role="list">
      {tiles.map((tile) => (
        <KpiCard key={tile.label} tile={tile} Icon={pickIcon(tile.icon)} />
      ))}
    </div>
  );
}
