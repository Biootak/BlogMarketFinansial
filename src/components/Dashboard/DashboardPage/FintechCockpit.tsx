'use client';

/**
 * FintechCockpit — Operations Cockpit (2026) — single unified dashboard
 *
 * 2026-07-31 redesign: one design for the services + fintech dashboard
 * part. Replaces the previously stacked AtelierDeck + FintechKpiWidget +
 * LiveOpsPulse + ServiceRequestsWidget with a single visually-coherent
 * component. Editorial deck still available as a child row when role
 * allows.
 *
 * 2026-08-11 premium update: ambient SVG glow, count-up KPIs, stagger
 * choreography, elevation tiers, mobile readability boost.
 *
 * Layout (≥1280):
 *   ┌────────────────────────────────────────────────────────┐
 *   │  COCKPIT HERO  (welcome + vital + radial health)        │
 *   ├────────────────────────────────────────────────────────┤
 *   │  KPI STRIP — single row, 5 numbers, no card repetition  │
 *   ├──────────────────────────┬─────────────────────────────┤
 *   │  SERVICES PANEL          │  LIVE OPS PANEL              │
 *   │  (recent + quick)        │  (wave + events)             │
 *   ├──────────────────────────┴─────────────────────────────┤
 *   │  (optional) EDITORIAL ROW                                │
 *   └────────────────────────────────────────────────────────┘
 *
 * Design rules:
 *   - Tokens only (--ds-*, --nova-*) — never hex/rgb.
 *   - Logical properties (RTL-safe).
 *   - One card system across all sections.
 *   - Mobile-first responsive (320 → 1440).
 */

import { QuickActionRow } from '@/components/Dashboard/primitives';
import { Badge } from '@/components/ui/badge';
import { useVisibilityAwareInterval } from '@/hooks/useVisibilityAwareInterval';
import type { MarketRateItem } from '@/lib/market-rates/types';
import {
  ArrowDown,
  ArrowDownRight,
  ArrowLeft,
  ArrowUp,
  ArrowUpRight,
  Check,
  Inbox,
  type LucideIcon,
  Minus,
  Plus,
  Radio,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  Users,
  Wallet,
  X,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import CountUp from './CountUp';
import { DailyBriefing } from './DailyBriefing';
import s from './FintechCockpit.module.css';
import { UpcomingDeadlines } from './UpcomingDeadlines';

// ─── Types ──────────────────────────────────────────────────────────────

export interface FintechCockpitService {
  id: string;
  trackingCode: string;
  fullName: string;
  serviceType: string;
  amount: string;
  currency: string;
  status: string;
  urgency: string;
  createdAt: string | Date;
}

export interface FintechCockpitServiceStats {
  pending: number;
  todayCount: number;
  pendingUrgent: number;
  total: number;
}

export interface FintechCockpitLiveService {
  id: string;
  name: string;
  desc: string;
  status: 'healthy' | 'degraded' | 'down' | 'idle';
  latencyMs?: number;
  href?: string;
  iconName?: string;
}

export interface FintechCockpitLiveEvent {
  id: string;
  type: 'deposit' | 'withdraw' | 'kyc' | 'order' | 'auth' | 'fraud';
  actor: string;
  detail: string;
  amount?: { value: number; currency: string };
  timestamp: string | number;
  href?: string;
}

export interface FintechCockpitProps {
  userName: string;
  userRole: 'OWNER' | 'ADMIN' | 'AUTHOR' | 'SUPERADMIN';
  kpi: {
    txn24h: number;
    activeCustomers: number;
    openFraudCases: number;
    pendingRequests: number;
    dealsVolume: number;
    dealsCurrency: string;
  };
  services: {
    stats: FintechCockpitServiceStats;
    recent: FintechCockpitService[];
  };
  live: {
    services: FintechCockpitLiveService[];
    events: FintechCockpitLiveEvent[];
    activityBars: number[];
  };
  /** نرخ‌های بازار برای Market Intelligence Panel */
  marketRates?: MarketRateItem[];
  /** Optional deadline items (KYC expiry, subscriptions, etc.) */
  deadlines: Array<{
    label: string;
    detail: string;
    href: string;
    daysLeft: number;
    /** string key mapped to a Lucide icon client-side (server→client safe) */
    iconName: string;
  }>;
  /** Optional editorial deck — only for editor roles */
  editorial?: ReactNode;
}

// ─── Constants ──────────────────────────────────────────────────────────

const SERVICE_TYPE_LABELS: Record<string, string> = {
  INTERNATIONAL_TRANSFER: 'حواله بین‌المللی',
  ONLINE_PAYMENT: 'پرداخت آنلاین',
  TUITION_PAYMENT: 'پرداخت شهریه',
  FREELANCE_INCOME: 'نقد کردن درآمد',
  SOFTWARE_PURCHASE: 'خرید نرم‌افزار',
  GIFT_CARD: 'گیفت کارت',
  CURRENCY_BUY: 'خرید ارز',
  CURRENCY_SELL: 'فروش ارز',
  CRYPTO_BUY: 'خرید ارز دیجیتال',
  CRYPTO_SELL: 'فروش ارز دیجیتال',
  PAYPAL_TRANSFER: 'انتقال پی‌پال',
  MOBILE_TOPUP: 'شارژ موبایل',
  BILL_PAYMENT: 'پرداخت قبض',
  OTHER: 'سایر خدمات',
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'در انتظار',
  IN_PROGRESS: 'در حال انجام',
  COMPLETED: 'تکمیل شده',
  CANCELLED: 'لغو شده',
};

const STATUS_CLASS: Record<string, string> = {
  PENDING: 'isPending',
  IN_PROGRESS: 'isProgress',
  COMPLETED: 'isCompleted',
  CANCELLED: 'isCancelled',
};

const STATUS_LIVE_LABELS: Record<FintechCockpitLiveService['status'], string> = {
  healthy: 'سالم',
  degraded: 'کند',
  down: 'قطع',
  idle: 'بیکار',
};

const ROLE_LABELS: Record<string, string> = {
  OWNER: 'مالک',
  ADMIN: 'مدیر',
  AUTHOR: 'نویسنده',
  SUPERADMIN: 'مدیر کل',
};

// ─── Helpers ────────────────────────────────────────────────────────────

// Module-level Intl singletons — created once, never per call
const _faNum = new Intl.NumberFormat('fa-IR');
const _faCompact = new Intl.NumberFormat('fa-IR', {
  notation: 'compact',
  maximumFractionDigits: 1,
});
// Module-level cache for currency formatters — avoids new Intl.NumberFormat on every call
const _currencyFmtCache = new Map<string, Intl.NumberFormat>();
// Shared fa-IR date formatter (weekday+day+month) — used in CockpitHero
const _faDateLong = new Intl.DateTimeFormat('fa-IR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});
// Shared en-GB time formatter HH:MM:SS
const _enTimeFmt = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

const formatRelDate = (iso: string | Date): string => {
  const date = typeof iso === 'string' ? new Date(iso) : iso;
  const diffMin = Math.floor((Date.now() - date.getTime()) / 60_000);
  if (diffMin < 1) return 'هم اکنون';
  if (diffMin < 60) return `${_faNum.format(diffMin)} دقیقه پیش`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${_faNum.format(diffH)} ساعت پیش`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 30) return `${_faNum.format(diffD)} روز پیش`;
  return date.toLocaleDateString('fa-IR');
};

const formatIntFa = (n: number): string => _faNum.format(n);

const formatCurrency = (n: number, currency: string): string => {
  if (currency === 'AFN') {
    return `${_faNum.format(Math.round(n))} AFN`;
  }
  try {
    let fmt = _currencyFmtCache.get(currency);
    if (!fmt) {
      fmt = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        maximumFractionDigits: 2,
      });
      _currencyFmtCache.set(currency, fmt);
    }
    return fmt.format(n);
  } catch {
    return `${_faNum.format(Math.round(n))} ${currency}`;
  }
};

const formatVolume = (n: number, currency: string): string => {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)} میلیارد ${currency}`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)} میلیون ${currency}`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)} هزار ${currency}`;
  return formatCurrency(n, currency);
};

const getInitial = (name: string): string => {
  const trimmed = name.trim();
  if (!trimmed) return '؟';
  for (const ch of trimmed) {
    if (/\s/.test(ch)) continue;
    return ch;
  }
  return trimmed[0] ?? '؟';
};

function unitLabel(unit: string): string {
  if (unit === 'afn') return 'افغانی';
  if (unit === 'toman') return 'تومان';
  return unit.toUpperCase();
}

/**
 * نرخ‌های کلیدی افغانستان را از لیست فیلتر و مرتب می‌کند.
 * اولویت: USD، EUR، AED، تومان — حداکثر ۴ آیتم.
 */
function pickKeyRates(rates: MarketRateItem[]): MarketRateItem[] {
  // اول نرخ‌های گروه افغان (USD/AFN)، سپس forex اصلی
  const afg = rates.filter((r) => r.group === 'afghan').slice(0, 3);
  const forex = rates
    .filter(
      (r) =>
        r.group === 'iran-forex' &&
        (r.symbol.toLowerCase().includes('usd') ||
          r.symbol.toLowerCase().includes('eur') ||
          r.symbol.toLowerCase().includes('aed')),
    )
    .slice(0, 2);
  const combined = [...afg, ...forex];
  // اگر هیچ‌کدام پیدا نشد، ۴ تا اول را بده
  return combined.length > 0 ? combined.slice(0, 4) : rates.slice(0, 4);
}

// Module-level cache for fa-IR decimal formatters (keyed by decimals count)
const _faDecFmtCache = new Map<number, Intl.NumberFormat>();

function formatRateValue(item: MarketRateItem): string {
  const val = item.value / item.divisor;
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(2)}M`;
  if (val >= 1_000) return _faNum.format(Math.round(val));
  let decFmt = _faDecFmtCache.get(item.decimals);
  if (!decFmt) {
    decFmt = new Intl.NumberFormat('fa-IR', { maximumFractionDigits: item.decimals });
    _faDecFmtCache.set(item.decimals, decFmt);
  }
  return decFmt.format(val);
}

// ─── Ambient SVG glow (signature moment) ────────────────────────────────

function AmbientGlow() {
  return (
    <svg className={s.ambientGlow} viewBox="0 0 1440 400" preserveAspectRatio="none" aria-hidden>
      <defs>
        <radialGradient id="ambientA" cx="80%" cy="0%" r="60%">
          <stop offset="0%" stopColor="var(--ds-brand-500)" stopOpacity="0.15" />
          <stop offset="100%" stopColor="var(--ds-brand-500)" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="ambientB" cx="20%" cy="100%" r="50%">
          <stop offset="0%" stopColor="var(--ds-brand-500)" stopOpacity="0.08" />
          <stop offset="100%" stopColor="var(--ds-brand-500)" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="1440" height="400" fill="url(#ambientA)" />
      <rect width="1440" height="400" fill="url(#ambientB)" />
    </svg>
  );
}

// ─── Stagger wrapper ────────────────────────────────────────────────────

function StaggerChildren({
  children,
  className,
  count,
}: {
  children: React.ReactNode;
  className?: string;
  count?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`${s.staggerContainer} ${className ?? ''}`}
      data-count={count ?? 1}
      data-visible={visible}
    >
      {children}
    </div>
  );
}

// ─── Subcomponents ──────────────────────────────────────────────────────

/**
 * HeroClock — isolated ticker component so only this tiny span re-renders
 * every second, NOT the entire CockpitHero tree.
 */
function HeroClock({ className }: { className?: string }) {
  const [timeStr, setTimeStr] = useState(() => _enTimeFmt.format(new Date()));
  useVisibilityAwareInterval(() => setTimeStr(_enTimeFmt.format(new Date())), 1000);
  return (
    <span className={className} dir="ltr">
      {timeStr}
    </span>
  );
}

function getGreeting(h: number): string {
  if (h < 5) return 'بامداد بخیر';
  if (h < 12) return 'صبح بخیر';
  if (h < 17) return 'ظهر بخیر';
  if (h < 21) return 'عصر بخیر';
  return 'شب بخیر';
}

function CockpitHero({
  userName,
  userRole,
  pending,
  total,
  urgent,
  liveCount,
  fraudCount,
  txn24h,
  activeCustomers,
  dealsVolume,
  dealsCurrency,
  kpi,
  deadlines,
}: {
  userName: string;
  userRole: string;
  pending: number;
  total: number;
  urgent: number;
  liveCount: number;
  fraudCount: number;
  txn24h: number;
  activeCustomers: number;
  dealsVolume: number;
  dealsCurrency: string;
  kpi?: FintechCockpitProps['kpi'];
  deadlines?: FintechCockpitProps['deadlines'];
}) {
  // Date and greeting are computed once on mount (stable for the session).
  // No interval needed here — only HeroClock ticks every second.
  const now = Date.now();
  const date = _faDateLong.format(new Date(now));
  const greeting = getGreeting(new Date(now).getHours());

  return (
    <section className={s.hero} aria-label="مرکز عملیات">
      <AmbientGlow />
      <div className={s.heroMain}>
        <div className={s.heroEyebrow}>
          <span className={s.heroEyebrowDot} aria-hidden />
          <span>اتاق عملیات زنده</span>
          <span className={s.heroEyebrowSep} aria-hidden>
            ·
          </span>
          <HeroClock className={s.heroEyebrowTime} />
          <span className={s.heroEyebrowSep} aria-hidden>
            ·
          </span>
          <span className={s.heroEyebrowDate}>{date}</span>
          {/* Mobile-inline role badge — hidden on desktop via CSS */}
          <span className={s.heroEyebrowRolePill} aria-label="نقش کاربر">
            {ROLE_LABELS[userRole as keyof typeof ROLE_LABELS] ?? userRole}
          </span>
        </div>

        <h1 className={s.heroTitle}>
          {greeting}، <span className={s.heroTitleName}>{userName || 'مدیر'}</span>
        </h1>

        <p className={s.heroLead}>
          {pending > 0
            ? `${formatIntFa(pending)} درخواست در صف بررسی است${urgent > 0 ? `، ${formatIntFa(urgent)} مورد فوری` : ''}.`
            : 'صف درخواست‌ها خالی است. می‌توانید به کارهای دیگر بپردازید.'}
        </p>

        <div className={s.heroVital}>
          <Link href="/dashboard/service-requests" className={s.heroVitalMain}>
            <span className={s.heroVitalLabel}>درخواست در جریان</span>
            <span className={s.heroVitalValue} dir="ltr">
              <CountUp value={pending} duration={900} />
            </span>
            {urgent > 0 ? (
              <span className={s.heroVitalFlag}>
                <Zap aria-hidden size={12} />
                <span>{formatIntFa(urgent)} فوری</span>
              </span>
            ) : null}
          </Link>

          <div className={s.heroVitalMinor}>
            <div className={s.heroVitalMinorItem}>
              <span className={s.heroVitalMinorLabel}>کل</span>
              <span className={s.heroVitalMinorValue}>
                <CountUp value={total} duration={900} />
              </span>
            </div>
            <span className={s.heroVitalDivider} aria-hidden />
            <div className={s.heroVitalMinorItem}>
              <span className={s.heroVitalMinorLabel}>رویداد زنده</span>
              <span className={s.heroVitalMinorValue}>
                <CountUp value={liveCount} duration={900} />
              </span>
            </div>
            {fraudCount > 0 ? (
              <>
                <span className={s.heroVitalDivider} aria-hidden />
                <div className={`${s.heroVitalMinorItem} ${s.heroVitalMinorItemWarn}`}>
                  <span className={s.heroVitalMinorLabel}>هشدار باز</span>
                  <span className={s.heroVitalMinorValue}>
                    <CountUp value={fraudCount} duration={900} />
                  </span>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>

      <div className={s.heroSide}>
        <div className={s.heroSideLabel}>
          <span>نقش</span>
          <Badge variant="secondary" className={s.heroSideRole}>
            {ROLE_LABELS[userRole as keyof typeof ROLE_LABELS] ?? userRole}
          </Badge>
        </div>

        <DailyBriefing
          pending={pending}
          urgent={urgent}
          fraudCount={fraudCount}
          txn24h={txn24h}
          activeCustomers={activeCustomers}
          dealsVolume={dealsVolume}
          dealsCurrency={dealsCurrency}
          liveEventCount={liveCount}
        />
      </div>

      {/* Mobile-only: KPI mini strip + Deadlines embedded inside hero */}
      {kpi ? (
        <div className={s.heroMobileKpi}>
          <Link
            href="/dashboard/service-requests"
            className={`${s.heroMiniKpiCell} ${s.heroMiniKpiCell_pending}`}
          >
            <span className={s.heroMiniKpiIcon} aria-hidden>
              <Zap size={13} />
            </span>
            <span className={s.heroMiniKpiValue}>{formatIntFa(kpi.pendingRequests)}</span>
            <span className={s.heroMiniKpiLabel}>در انتظار</span>
          </Link>
          <Link href="/dashboard/settlements" className={s.heroMiniKpiCell}>
            <span className={s.heroMiniKpiIcon} aria-hidden>
              <Wallet size={13} />
            </span>
            <span className={s.heroMiniKpiValue}>
              {formatVolume(kpi.dealsVolume, kpi.dealsCurrency)}
            </span>
            <span className={s.heroMiniKpiLabel}>حجم ۳۰ روز</span>
          </Link>
          <Link href="/dashboard/customers" className={s.heroMiniKpiCell}>
            <span className={s.heroMiniKpiIcon} aria-hidden>
              <Users size={13} />
            </span>
            <span className={s.heroMiniKpiValue}>{formatIntFa(kpi.activeCustomers)}</span>
            <span className={s.heroMiniKpiLabel}>مشتری فعال</span>
          </Link>
          <Link href="/dashboard/audit-log" className={s.heroMiniKpiCell}>
            <span className={s.heroMiniKpiIcon} aria-hidden>
              <TrendingUp size={13} />
            </span>
            <span className={s.heroMiniKpiValue}>{formatIntFa(kpi.txn24h)}</span>
            <span className={s.heroMiniKpiLabel}>تراکنش ۲۴ ساعت</span>
          </Link>
          <Link
            href="/dashboard/fraud-review"
            className={`${s.heroMiniKpiCell} ${kpi.openFraudCases > 0 ? s.heroMiniKpiCell_alert : ''}`}
          >
            <span className={s.heroMiniKpiIcon} aria-hidden>
              <ShieldAlert size={13} />
            </span>
            <span className={s.heroMiniKpiValue}>{formatIntFa(kpi.openFraudCases)}</span>
            <span className={s.heroMiniKpiLabel}>هشدار باز</span>
          </Link>
        </div>
      ) : null}

      {deadlines && deadlines.length > 0 ? (
        <div className={s.heroMobileDeadlines}>
          {deadlines.slice(0, 3).map((item) => {
            const dl = item.daysLeft;
            const tone = dl < 0 ? 'critical' : dl <= 3 ? 'warn' : 'ok';
            const text =
              dl < 0 ? `${formatIntFa(Math.abs(dl))} روز معوق` : `${formatIntFa(dl)} روز دیگر`;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${s.heroDeadlineChip} ${s[`heroDeadlineChip_${tone}`]}`}
              >
                <span className={s.heroDeadlineLabel}>{item.label}</span>
                <span className={`${s.heroDeadlineDays} ${s[`heroDeadlineDays_${tone}`]}`}>
                  {text}
                </span>
              </Link>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}

// ─── KPI strip (single row, no card repetition) ────────────────────────

function KpiStrip({
  kpi,
}: {
  kpi: FintechCockpitProps['kpi'];
}) {
  type KpiItem = {
    key: string;
    label: string;
    value: number;
    display: ReactNode;
    icon: LucideIcon;
    accent: string;
    href: string;
    alert?: boolean;
    trend?: { direction: 'up' | 'down'; percent: number };
  };

  const items: KpiItem[] = useMemo(
    () => [
      {
        key: 'pending',
        label: 'در انتظار',
        value: kpi.pendingRequests,
        display: <CountUp value={kpi.pendingRequests} duration={900} />,
        icon: Zap,
        accent: 'pending',
        href: '/dashboard/service-requests',
      },
      {
        key: 'volume',
        label: 'حجم ۳۰ روز',
        value: kpi.dealsVolume,
        display: formatVolume(kpi.dealsVolume, kpi.dealsCurrency),
        icon: Wallet,
        accent: 'volume',
        href: '/dashboard/settlements',
      },
      {
        key: 'customers',
        label: 'مشتری فعال',
        value: kpi.activeCustomers,
        display: <CountUp value={kpi.activeCustomers} duration={900} />,
        icon: Users,
        accent: 'customers',
        href: '/dashboard/customers',
      },
      {
        key: 'txn',
        label: 'تراکنش ۲۴ ساعت',
        value: kpi.txn24h,
        display: <CountUp value={kpi.txn24h} duration={900} />,
        icon: TrendingUp,
        accent: 'txn',
        href: '/dashboard/audit-log',
      },
      {
        key: 'fraud',
        label: 'هشدار باز',
        value: kpi.openFraudCases,
        display: <CountUp value={kpi.openFraudCases} duration={900} />,
        icon: ShieldAlert,
        accent: kpi.openFraudCases > 0 ? 'fraud' : 'idle',
        href: '/dashboard/fraud-review',
        alert: kpi.openFraudCases > 0,
      },
    ],
    [kpi],
  );

  return (
    <StaggerChildren className={s.kpiStrip} count={items.length} data-visible>
      {items.map((it) => {
        const Icon = it.icon;
        return (
          <Link
            key={it.key}
            href={it.href}
            className={`${s.kpiCell} ${s[`kpi_${it.accent}`] ?? ''} ${it.alert ? s.kpiAlert : ''}`}
          >
            <span className={s.kpiCellIcon} aria-hidden>
              <Icon size={16} />
            </span>
            <span className={s.kpiCellValue}>{it.display}</span>
            <span className={s.kpiCellLabel}>
              {it.label}
              {it.trend && (
                <span className={`${s.kpiTrend} ${s[`kpiTrend_${it.trend.direction}`] ?? ''}`}>
                  {it.trend.direction === 'up' ? (
                    <ArrowUpRight size={10} aria-hidden />
                  ) : (
                    <ArrowDownRight size={10} aria-hidden />
                  )}
                  <span>{formatIntFa(Math.round(it.trend.percent))}٪</span>
                </span>
              )}
            </span>
          </Link>
        );
      })}
    </StaggerChildren>
  );
}

// ─── Services panel ────────────────────────────────────────────────────

function ServicesPanel({
  stats,
  recent,
}: {
  stats: FintechCockpitServiceStats;
  recent: FintechCockpitService[];
}) {
  const closedCount = Math.max(0, stats.total - stats.pending);
  const hasQueue = stats.total > 0;

  const queueSegs = [
    { key: 'pending', label: 'در انتظار', value: stats.pending },
    { key: 'urgent', label: 'فوری', value: stats.pendingUrgent },
    { key: 'closed', label: 'تکمیل/بسته', value: closedCount },
  ] as const;

  return (
    <section className={s.svcPanel} aria-label="درخواست‌های در جریان">
      <header className={s.panelHeader}>
        <div className={s.panelHeaderMain}>
          <span className={s.panelEyebrow}>
            <Inbox aria-hidden size={12} />
            <span>خدمات</span>
          </span>
          <h2 className={s.panelTitle}>درخواست‌های در جریان</h2>
        </div>
        <div className={s.svcHeaderTools}>
          <span className={s.svcLiveBadge}>
            <span className={s.svcLiveBadgeDot} aria-hidden />
            <span>زنده</span>
          </span>
          <span className={s.svcToday}>
            <span>ثبت امروز</span>
            <b className={s.svcTodayNum}>{formatIntFa(stats.todayCount)}</b>
          </span>
          <Link href="/dashboard/service-requests" className={s.panelMore}>
            <span>مشاهده همه</span>
            <ArrowLeft aria-hidden size={14} />
          </Link>
        </div>
      </header>

      {/* Queue pulse — ترکیب زندهٔ صف به‌صورت نوار پالس */}
      <div
        className={s.queueBlock}
        role="img"
        aria-label={`ترکیب صف درخواست‌ها: ${formatIntFa(stats.pending)} در انتظار، ${formatIntFa(stats.pendingUrgent)} فوری، ${formatIntFa(closedCount)} تکمیل یا بسته`}
      >
        <div className={s.queueTrack}>
          {hasQueue ? (
            queueSegs.map((seg) =>
              seg.value > 0 ? (
                <span
                  key={seg.key}
                  className={s.queueSeg}
                  data-tone={seg.key}
                  style={{ flexGrow: seg.value }}
                  title={`${seg.label}: ${formatIntFa(seg.value)}`}
                />
              ) : null,
            )
          ) : (
            <span className={s.queueTrackEmpty} />
          )}
        </div>
        <ul className={s.queueLegend}>
          {queueSegs.map((seg) => (
            <li key={seg.key} className={s.queueLegendItem}>
              <i className={s.queueLegendDot} data-tone={seg.key} aria-hidden />
              <span>{seg.label}</span>
              <b>{formatIntFa(seg.value)}</b>
            </li>
          ))}
          <li className={s.queueLegendTotal}>
            <span>کل</span>
            <b>{formatIntFa(stats.total)}</b>
          </li>
        </ul>
      </div>

      <ul className={s.svcList}>
        {recent.length === 0 ? (
          <li className={s.svcEmpty}>
            <span className={s.svcEmptyIcon} aria-hidden>
              <Sparkles size={16} />
            </span>
            <span>صف درخواست‌ها خالی است — همه‌چیز زیر کنترل است</span>
          </li>
        ) : (
          recent.map((r) => {
            const statusKey = r.status as keyof typeof STATUS_LABELS;
            const statusLabel = STATUS_LABELS[statusKey] ?? r.status;
            const statusMod = STATUS_CLASS[statusKey] ?? '';
            const typeLabel = SERVICE_TYPE_LABELS[r.serviceType] ?? r.serviceType;
            const isPending = r.status === 'PENDING';
            const detailHref = `/track/${encodeURIComponent(r.trackingCode)}`;
            return (
              <li key={r.id} className={s.svcItem} data-status={r.status}>
                {/* H1-fix (2026-08-14): لینک آیتم فقط avatar + title را می‌گیرد؛
                    اکشن‌ها (تأیید/رد) sibling خارج از <a> هستند تا HTML معتبر بماند.
                    «جزئیات» حذف شد چون کل ردیف لینک است (noise کمتر). */}
                <Link
                  href={detailHref}
                  className={s.svcItemLink}
                  aria-label={`${r.fullName} — ${typeLabel} — ${statusLabel}`}
                >
                  <span className={s.svcAvatar} aria-hidden>
                    {getInitial(r.fullName)}
                  </span>
                  <span className={s.svcItemMain}>
                    <span className={s.svcItemTitle}>
                      <span className={s.svcItemName}>{r.fullName}</span>
                      {r.urgency === 'URGENT' ? (
                        <span className={s.svcFlag}>
                          <Zap aria-hidden size={10} />
                          <span>فوری</span>
                        </span>
                      ) : null}
                      <span className={s.svcItemTime}>{formatRelDate(r.createdAt)}</span>
                    </span>
                    <span className={s.svcItemMeta}>
                      <span>{typeLabel}</span>
                      <span aria-hidden>·</span>
                      <code className={s.svcItemCode} dir="ltr">
                        {r.trackingCode}
                      </code>
                    </span>
                  </span>
                </Link>
                <span className={s.svcItemSide}>
                  {/* ردیف ۱: مبلغ + وضعیت */}
                  <span className={s.svcItemSideTop}>
                    <span className={s.svcItemAmount}>
                      <span dir="ltr">{formatIntFa(Number(r.amount))}</span>
                      <span className={s.svcItemCurrency}>{r.currency}</span>
                    </span>
                    <span className={`${s.svcStatus} ${s[statusMod] ?? ''}`}>
                      <span
                        className={s.svcStatusDot}
                        data-pulse={isPending ? 'true' : undefined}
                        aria-hidden
                      />
                      <span>{statusLabel}</span>
                    </span>
                  </span>
                  {/* ردیف ۲: اکشن‌ها (فقط PENDING) */}
                  {isPending && (
                    <span className={s.svcItemActions}>
                      <Link
                        href={`/dashboard/approvals?action=approve&id=${r.id}`}
                        className={`${s.svcActionBtn} ${s.svcActionBtn_approve}`}
                        title="تأیید درخواست"
                      >
                        <Check size={12} aria-hidden />
                        <span>تأیید</span>
                      </Link>
                      <Link
                        href={`/dashboard/approvals?action=reject&id=${r.id}`}
                        className={`${s.svcActionBtn} ${s.svcActionBtn_reject}`}
                        title="رد درخواست"
                      >
                        <X size={12} aria-hidden />
                        <span>رد</span>
                      </Link>
                    </span>
                  )}
                </span>
              </li>
            );
          })
        )}
      </ul>

      <footer className={s.svcFoot}>
        <Link href="/services" className={s.svcFootCta}>
          <Plus aria-hidden size={14} />
          <span>ثبت درخواست جدید</span>
        </Link>
        <Link href="/dashboard/service-requests" className={s.svcFootLink}>
          <span>مرکز درخواست‌ها</span>
          <ArrowLeft aria-hidden size={14} />
        </Link>
      </footer>
    </section>
  );
}

// ─── Market Intelligence Panel (جایگزین eventList) ─────────────────────

function MarketIntelPanel({ rates }: { rates: MarketRateItem[] }) {
  const items = useMemo(() => pickKeyRates(rates), [rates]);
  const updatedAt = useMemo(() => {
    if (items.length === 0) return null;
    const dates = items.map((r) => r.updatedAt.getTime());
    return new Date(Math.max(...dates));
  }, [items]);

  if (items.length === 0) {
    return (
      <div className={s.marketEmpty}>
        <TrendingUp aria-hidden size={20} />
        <span>نرخ‌های بازار در دسترس نیست</span>
      </div>
    );
  }

  return (
    <div className={s.marketPanel}>
      <div className={s.marketHeader}>
        <span className={s.marketEyebrow}>
          <TrendingUp aria-hidden size={11} />
          <span>بازار زنده</span>
        </span>
        {updatedAt ? (
          <span className={s.marketUpdated} dir="ltr">
            {updatedAt.toLocaleTimeString('en-GB', {
              hour12: false,
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        ) : null}
      </div>
      <ul className={s.marketList}>
        {items.map((item) => {
          const change = item.changePercent ?? 0;
          const isUp = change > 0.01;
          const isDown = change < -0.01;
          const ChangeIcon = isUp ? ArrowUp : isDown ? ArrowDown : Minus;
          const changeTone = isUp
            ? s.marketChange_up
            : isDown
              ? s.marketChange_down
              : s.marketChange_flat;
          return (
            <li key={item.symbol} className={s.marketItem}>
              <div className={s.marketItemMain}>
                <span className={s.marketItemName}>{item.displayNameFa}</span>
                <span className={s.marketItemUnit}>{unitLabel(item.unit)}</span>
              </div>
              <div className={s.marketItemRight}>
                <span className={s.marketItemValue} dir="ltr">
                  {formatRateValue(item)}
                </span>
                <span className={`${s.marketChange} ${changeTone}`}>
                  <ChangeIcon aria-hidden size={9} />
                  <span dir="ltr">{Math.abs(change).toFixed(2)}٪</span>
                </span>
              </div>
            </li>
          );
        })}
      </ul>
      <Link href="/market-rates" className={s.marketFootLink}>
        <span>مشاهده همه نرخ‌ها</span>
        <ArrowLeft aria-hidden size={12} />
      </Link>
    </div>
  );
}

// ─── Live Ops panel ────────────────────────────────────────────────────

/**
 * LivePanelClock — isolated clock span; only this re-renders every second,
 * not the entire LivePanel with its service list and activity bars.
 */
function LivePanelClock({ className }: { className?: string }) {
  const [timeStr, setTimeStr] = useState(() => _enTimeFmt.format(new Date()));
  useVisibilityAwareInterval(() => setTimeStr(_enTimeFmt.format(new Date())), 1000);
  return (
    <span className={className} dir="ltr">
      {timeStr}
    </span>
  );
}

function LivePanel({
  services,
  activityBars,
  marketRates,
}: {
  services: FintechCockpitLiveService[];
  activityBars: number[];
  marketRates: MarketRateItem[];
}) {
  const healthy = useMemo(() => services.filter((x) => x.status === 'healthy').length, [services]);
  const total = services.length || 1;
  const healthScore = Math.round((healthy / total) * 100);
  const healthState: 'ok' | 'warn' | 'bad' =
    healthScore >= 90 ? 'ok' : healthScore >= 70 ? 'warn' : 'bad';

  const bars = useMemo(() => {
    if (activityBars.length === 24) return activityBars;
    return Array.from({ length: 24 }, (_, i) => 15 + ((i * 17) % 60));
  }, [activityBars]);

  return (
    <section className={s.livePanel} aria-label="مرکز عملیات زنده">
      <header className={s.panelHeader}>
        <div className={s.panelHeaderMain}>
          <span className={s.panelEyebrow}>
            <Radio aria-hidden size={12} />
            <span>زنده</span>
          </span>
          <h2 className={s.panelTitle}>نبض پلتفرم</h2>
        </div>
        <span className={`${s.healthPill} ${s[`healthPill_${healthState}`] ?? ''}`}>
          <span className={s.healthPillDot} aria-hidden />
          <span dir="ltr">{formatIntFa(healthScore)}</span>
          <span>٪</span>
          <span className={s.healthPillLabel}>سلامت</span>
        </span>
      </header>

      <div className={s.liveStats}>
        <div className={s.liveStat}>
          <span className={s.liveStatLabel}>سرویس فعال</span>
          <span className={s.liveStatValue}>
            <span dir="ltr">{formatIntFa(healthy)}</span>
            <span className={s.liveStatSlash}>/</span>
            <span dir="ltr" className={s.liveStatValueMuted}>
              {formatIntFa(total)}
            </span>
          </span>
        </div>
        <div className={s.liveStat}>
          <span className={s.liveStatLabel}>سلامت</span>
          <span className={s.liveStatValue}>
            <span dir="ltr">{formatIntFa(healthScore)}</span>
            <span className={s.liveStatValueMuted}>٪</span>
          </span>
        </div>
        <div className={s.liveStat}>
          <span className={s.liveStatLabel}>ساعت</span>
          <LivePanelClock className={s.liveStatValue} />
        </div>
      </div>

      <div className={s.strip24} role="img" aria-label="نوار فعالیت ۲۴ ساعت اخیر">
        {bars.map((v, i) => {
          const isPeak = i === bars.length - 1;
          const h = Math.max(6, Math.min(100, v));
          const hour = `${String(i).padStart(2, '0')}:00`;
          return (
            <span
              key={i}
              className={`${s.strip24Bar} ${isPeak ? s.strip24BarPeak : ''}`}
              style={{ height: `${h}%` }}
              data-tooltip={`${hour} — ${formatIntFa(v)} رویداد`}
            />
          );
        })}
      </div>

      <ul className={s.svcLiveList}>
        {services.slice(0, 4).map((svc) => {
          const state = svc.status;
          return (
            <li key={svc.id} className={`${s.svcLiveItem} ${s[`svcLive_${state}`] ?? ''}`}>
              <span className={s.svcLiveDot} aria-hidden />
              <span className={s.svcLiveName}>{svc.name}</span>
              <span className={s.svcLiveStatus}>{STATUS_LIVE_LABELS[state]}</span>
              {svc.latencyMs != null ? (
                <span className={s.svcLiveLatency} dir="ltr">
                  {svc.latencyMs < 1000
                    ? `${Math.round(svc.latencyMs)}ms`
                    : `${(svc.latencyMs / 1000).toFixed(2)}s`}
                </span>
              ) : null}
            </li>
          );
        })}
      </ul>

      {/* Market Intelligence — جایگزین eventList */}
      <MarketIntelPanel rates={marketRates} />
    </section>
  );
}

// ─── Quick actions row ─────────────────────────────────────────────────

function QuickActionsRow() {
  const items = [
    { href: '/exchanges', icon: <Users size={14} />, label: 'صرافی‌ها' },
    { href: '/exchange-rates', icon: <TrendingUp size={14} />, label: 'نرخ‌های ارز' },
    // RTL: forward/action arrows point LEFT. ArrowRight would read as
    // "back" in a RTL layout.
    { href: '/dashboard/transfer', icon: <ArrowLeft size={14} />, label: 'حواله‌ها' },
    { href: '/dashboard/reports', icon: <Wallet size={14} />, label: 'گزارش‌ها' },
    { href: '/dashboard/permissions', icon: <ShieldAlert size={14} />, label: 'امنیت' },
    { href: '/dashboard/helpdesk', icon: <Plus size={14} />, label: 'پشتیبانی' },
  ];

  return <QuickActionRow items={items} />;
}

// ─── Main ──────────────────────────────────────────────────────────────

export function FintechCockpit({
  userName,
  userRole,
  kpi,
  services,
  live,
  marketRates,
  deadlines,
  editorial,
}: FintechCockpitProps) {
  return (
    <div className={s.root} dir="rtl">
      {/* Cockpit hero — passes kpi+deadlines for mobile-embedded layout */}
      <CockpitHero
        userName={userName}
        userRole={userRole}
        pending={services.stats.pending}
        total={services.stats.total}
        urgent={services.stats.pendingUrgent}
        liveCount={live.events.length}
        fraudCount={kpi.openFraudCases}
        txn24h={kpi.txn24h}
        activeCustomers={kpi.activeCustomers}
        dealsVolume={kpi.dealsVolume}
        dealsCurrency={kpi.dealsCurrency}
        kpi={kpi}
        deadlines={deadlines}
      />

      {/* KPI strip — desktop/tablet only; mobile version is inside hero */}
      <div className={s.desktopOnly}>
        <KpiStrip kpi={kpi} />
      </div>

      {/* Upcoming deadlines — desktop/tablet only; mobile version is inside hero */}
      <div className={s.desktopOnly}>
        <UpcomingDeadlines items={deadlines} />
      </div>

      {/* Quick actions row */}
      <QuickActionsRow />

      {/* Two main panels: services + live ops */}
      <div className={s.mainGrid}>
        <ServicesPanel stats={services.stats} recent={services.recent} />
        <LivePanel
          services={live.services}
          activityBars={live.activityBars}
          marketRates={marketRates ?? []}
        />
      </div>

      {/* Optional editorial deck (for editor roles) */}
      {editorial ? <div className={s.editorial}>{editorial}</div> : null}
    </div>
  );
}

export default FintechCockpit;
