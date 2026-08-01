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

import { Badge } from '@/components/ui/badge';
import {
  AlertCircle,
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  type LucideIcon,
  Plus,
  Radio,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  Users,
  Wallet,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import s from './FintechCockpit.module.css';

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

const EVENT_LABELS: Record<FintechCockpitLiveEvent['type'], string> = {
  deposit: 'واریز',
  withdraw: 'برداشت',
  kyc: 'احراز هویت',
  order: 'سفارش',
  auth: 'ورود',
  fraud: 'هشدار',
};

const STATUS_LIVE_LABELS: Record<FintechCockpitLiveService['status'], string> = {
  healthy: 'سالم',
  degraded: 'کند',
  down: 'قطع',
  idle: 'بیکار',
};

// ─── Helpers ────────────────────────────────────────────────────────────

const toMs = (ts: string | number): number => {
  if (typeof ts === 'number') return ts;
  const ms = new Date(ts).getTime();
  return Number.isFinite(ms) ? ms : Date.now();
};

const formatRel = (ts: number, now: number): string => {
  const diff = Math.max(0, Math.floor((now - ts) / 1000));
  if (diff < 5) return 'هم اکنون';
  if (diff < 60) return `${new Intl.NumberFormat('fa-IR').format(diff)} ثانیه پیش`;
  if (diff < 3600) return `${new Intl.NumberFormat('fa-IR').format(Math.floor(diff / 60))} دقیقه پیش`;
  if (diff < 86_400) return `${new Intl.NumberFormat('fa-IR').format(Math.floor(diff / 3600))} ساعت پیش`;
  return `${new Intl.NumberFormat('fa-IR').format(Math.floor(diff / 86_400))} روز پیش`;
};

const formatRelDate = (iso: string | Date): string => {
  const date = typeof iso === 'string' ? new Date(iso) : iso;
  const diffMin = Math.floor((Date.now() - date.getTime()) / 60_000);
  if (diffMin < 1) return 'هم اکنون';
  if (diffMin < 60) return `${new Intl.NumberFormat('fa-IR').format(diffMin)} دقیقه پیش`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${new Intl.NumberFormat('fa-IR').format(diffH)} ساعت پیش`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 30) return `${new Intl.NumberFormat('fa-IR').format(diffD)} روز پیش`;
  return date.toLocaleDateString('fa-IR');
};

const formatCompactFa = (n: number): string =>
  new Intl.NumberFormat('fa-IR', { notation: 'compact', maximumFractionDigits: 1 }).format(n);

const formatIntFa = (n: number): string => new Intl.NumberFormat('fa-IR').format(n);

const formatCurrency = (n: number, currency: string): string => {
  if (currency === 'AFN') {
    // AFN: عدد فارسی + " AFN" بعد از عدد (نه «ف» جلوی عدد)
    return `${new Intl.NumberFormat('fa-IR').format(Math.round(n))} AFN`;
  }
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 2 }).format(n);
  } catch {
    return `${new Intl.NumberFormat('fa-IR').format(Math.round(n))} ${currency}`;
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

// ─── Subcomponents ──────────────────────────────────────────────────────

function CockpitHero({
  userName,
  userRole,
  pending,
  total,
  urgent,
  liveCount,
  fraudCount,
}: {
  userName: string;
  userRole: string;
  pending: number;
  total: number;
  urgent: number;
  liveCount: number;
  fraudCount: number;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const time = new Date(now).toLocaleTimeString('en-GB', { hour12: false });
  const date = new Date(now).toLocaleDateString('fa-IR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const greeting = (() => {
    const h = new Date(now).getHours();
    if (h < 5) return 'بامداد بخیر';
    if (h < 12) return 'صبح بخیر';
    if (h < 17) return 'ظهر بخیر';
    if (h < 21) return 'عصر بخیر';
    return 'شب بخیر';
  })();

  return (
    <section className={s.hero} aria-label="مرکز عملیات">
      <div className={s.heroMain}>
        <div className={s.heroEyebrow}>
          <span className={s.heroEyebrowDot} aria-hidden />
          <span>اتاق عملیات زنده</span>
          <span className={s.heroEyebrowSep} aria-hidden>
            ·
          </span>
          <span className={s.heroEyebrowTime} dir="ltr">
            {time}
          </span>
          <span className={s.heroEyebrowSep} aria-hidden>
            ·
          </span>
          <span className={s.heroEyebrowDate}>{date}</span>
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
              {formatIntFa(pending)}
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
              <span className={s.heroVitalMinorValue}>{formatIntFa(total)}</span>
            </div>
            <span className={s.heroVitalDivider} aria-hidden />
            <div className={s.heroVitalMinorItem}>
              <span className={s.heroVitalMinorLabel}>رویداد زنده</span>
              <span className={s.heroVitalMinorValue}>{formatCompactFa(liveCount)}</span>
            </div>
            {fraudCount > 0 ? (
              <>
                <span className={s.heroVitalDivider} aria-hidden />
                <div className={`${s.heroVitalMinorItem} ${s.heroVitalMinorItemWarn}`}>
                  <span className={s.heroVitalMinorLabel}>هشدار باز</span>
                  <span className={s.heroVitalMinorValue}>{formatIntFa(fraudCount)}</span>
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
            {userRole}
          </Badge>
        </div>

        <div className={s.heroGlyph} aria-hidden>
          <svg viewBox="0 0 200 200" width="100%" height="100%">
            <defs>
              <radialGradient id="fc-glow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="var(--fc-accent)" stopOpacity="0.18" />
                <stop offset="60%" stopColor="var(--fc-accent)" stopOpacity="0.04" />
                <stop offset="100%" stopColor="var(--fc-accent)" stopOpacity="0" />
              </radialGradient>
              <linearGradient id="fc-ring" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="var(--fc-accent)" stopOpacity="0.9" />
                <stop offset="100%" stopColor="var(--fc-accent-2)" stopOpacity="0.4" />
              </linearGradient>
            </defs>
            <circle cx="100" cy="100" r="90" fill="url(#fc-glow)" />
            <circle
              cx="100"
              cy="100"
              r="76"
              fill="none"
              stroke="var(--fc-line)"
              strokeWidth="1"
              strokeDasharray="2 4"
            />
            <circle
              cx="100"
              cy="100"
              r="58"
              fill="none"
              stroke="url(#fc-ring)"
              strokeWidth="1.4"
              opacity="0.85"
            />
            <circle cx="100" cy="42" r="3" fill="var(--fc-accent)" />
            <circle cx="158" cy="100" r="2.4" fill="var(--fc-accent-2)" opacity="0.7" />
            <circle cx="100" cy="158" r="2.4" fill="var(--fc-accent)" opacity="0.5" />
            <line
              x1="100"
              y1="100"
              x2="158"
              y2="100"
              stroke="var(--fc-accent)"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <circle cx="100" cy="100" r="3" fill="var(--fc-accent)" />
          </svg>
          <div className={s.heroGlyphLabel}>
            <span className={s.heroGlyphLabelNum} dir="ltr">
              {time.slice(0, 5)}
            </span>
            <span className={s.heroGlyphLabelSub}>ساعت جهانی</span>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── KPI strip (single row, no card repetition) ────────────────────────

function KpiStrip({
  kpi,
}: {
  kpi: FintechCockpitProps['kpi'];
}) {
  const items = useMemo(
    () => [
      {
        key: 'pending',
        label: 'در انتظار',
        value: kpi.pendingRequests,
        display: formatIntFa(kpi.pendingRequests),
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
        display: formatIntFa(kpi.activeCustomers),
        icon: Users,
        accent: 'customers',
        href: '/dashboard/customers',
      },
      {
        key: 'txn',
        label: 'تراکنش ۲۴ ساعت',
        value: kpi.txn24h,
        display: formatIntFa(kpi.txn24h),
        icon: TrendingUp,
        accent: 'txn',
        href: '/dashboard/audit-log',
      },
      {
        key: 'fraud',
        label: 'هشدار باز',
        value: kpi.openFraudCases,
        display: formatIntFa(kpi.openFraudCases),
        icon: ShieldAlert,
        accent: kpi.openFraudCases > 0 ? 'fraud' : 'idle',
        href: '/dashboard/fraud-review',
        alert: kpi.openFraudCases > 0,
      },
    ],
    [kpi],
  );

  return (
    <section className={s.kpiStrip} aria-label="شاخص‌های کلیدی">
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
            <span className={s.kpiCellLabel}>{it.label}</span>
          </Link>
        );
      })}
    </section>
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
  return (
    <section className={s.svcPanel} aria-label="درخواست‌های خدمات">
      <header className={s.panelHeader}>
        <div className={s.panelHeaderMain}>
          <span className={s.panelEyebrow}>
            <Plus aria-hidden size={12} />
            <span>خدمات</span>
          </span>
          <h2 className={s.panelTitle}>درخواست‌های در جریان</h2>
        </div>
        <Link href="/dashboard/service-requests" className={s.panelMore}>
          <span>مشاهده همه</span>
          <ArrowLeft aria-hidden size={14} />
        </Link>
      </header>

      <div className={s.svcKpis}>
        <div className={`${s.svcKpi} ${s.svcKpi_pending}`}>
          <span className={s.svcKpiLabel}>در انتظار</span>
          <span className={s.svcKpiValue}>{formatIntFa(stats.pending)}</span>
        </div>
        <div className={`${s.svcKpi} ${s.svcKpi_today}`}>
          <span className={s.svcKpiLabel}>ثبت امروز</span>
          <span className={s.svcKpiValue}>{formatIntFa(stats.todayCount)}</span>
        </div>
        <div className={`${s.svcKpi} ${s.svcKpi_urgent}`}>
          <span className={s.svcKpiLabel}>فوری</span>
          <span className={s.svcKpiValue}>{formatIntFa(stats.pendingUrgent)}</span>
        </div>
        <div className={s.svcKpi}>
          <span className={s.svcKpiLabel}>کل</span>
          <span className={s.svcKpiValue}>{formatIntFa(stats.total)}</span>
        </div>
      </div>

      <ul className={s.svcList}>
        {recent.length === 0 ? (
          <li className={s.svcEmpty}>
            <Sparkles aria-hidden size={16} />
            <span>درخواست در انتظاری وجود ندارد</span>
          </li>
        ) : (
          recent.map((r) => {
            const statusKey = r.status as keyof typeof STATUS_LABELS;
            const statusLabel = STATUS_LABELS[statusKey] ?? r.status;
            const statusMod = STATUS_CLASS[statusKey] ?? '';
            const typeLabel = SERVICE_TYPE_LABELS[r.serviceType] ?? r.serviceType;
            return (
              <li key={r.id} className={s.svcItem}>
                <Link href="/dashboard/service-requests" className={s.svcItemLink}>
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
                    </span>
                    <span className={s.svcItemMeta}>
                      <span>{typeLabel}</span>
                      <span aria-hidden>·</span>
                      <span className={s.svcItemCode} dir="ltr">
                        {r.trackingCode}
                      </span>
                    </span>
                  </span>
                  <span className={s.svcItemSide}>
                    <span className={s.svcItemAmount}>
                      <span dir="ltr">{formatIntFa(Number(r.amount))}</span>
                      <span className={s.svcItemCurrency}>{r.currency}</span>
                    </span>
                    <span className={`${s.svcStatus} ${s[statusMod] ?? ''}`}>
                      <span className={s.svcStatusDot} aria-hidden />
                      <span>{statusLabel}</span>
                    </span>
                    <span className={s.svcItemTime}>{formatRelDate(r.createdAt)}</span>
                  </span>
                </Link>
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

// ─── Live Ops panel ────────────────────────────────────────────────────

function LivePanel({
  services,
  events,
  activityBars,
}: {
  services: FintechCockpitLiveService[];
  events: FintechCockpitLiveEvent[];
  activityBars: number[];
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const healthy = useMemo(
    () => services.filter((x) => x.status === 'healthy').length,
    [services],
  );
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
          <span className={s.liveStatLabel}>رویداد</span>
          <span className={s.liveStatValue}>{formatCompactFa(events.length)}</span>
        </div>
        <div className={s.liveStat}>
          <span className={s.liveStatLabel}>ساعت</span>
          <span className={s.liveStatValue} dir="ltr">
            {new Date(now).toLocaleTimeString('en-GB', { hour12: false })}
          </span>
        </div>
      </div>

      <div className={s.strip24} role="img" aria-label="نوار فعالیت ۲۴ ساعت اخیر">
        {bars.map((v, i) => {
          const isPeak = i === bars.length - 1;
          const h = Math.max(6, Math.min(100, v));
          return (
            <span
              key={i}
              className={`${s.strip24Bar} ${isPeak ? s.strip24BarPeak : ''}`}
              style={{ height: `${h}%` }}
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

      <ul className={s.eventList}>
        {events.length === 0 ? (
          <li className={s.svcEmpty}>
            <AlertCircle aria-hidden size={16} />
            <span>در حال گوش دادن به رویدادها…</span>
          </li>
        ) : (
          events.slice(0, 4).map((evt) => {
            const Icon: LucideIcon =
              evt.type === 'deposit'
                ? ArrowDownRight
                : evt.type === 'withdraw'
                  ? ArrowUpRight
                  : evt.type === 'kyc'
                    ? ShieldAlert
                    : evt.type === 'fraud'
                      ? AlertCircle
                      : Wallet;
            return (
              <li key={evt.id} className={s.eventItem}>
                <span
                  className={`${s.eventIcon} ${s[`eventIcon_${evt.type}`] ?? ''}`}
                  aria-hidden
                >
                  <Icon size={12} />
                </span>
                <span className={s.eventBody}>
                  <span className={s.eventTop}>
                    <strong className={s.eventActor}>{evt.actor}</strong>
                    <span className={s.eventAction}>{EVENT_LABELS[evt.type]}</span>
                    {evt.amount ? (
                      <span className={s.eventAmount} dir="ltr">
                        {formatCompactFa(evt.amount.value)} {evt.amount.currency}
                      </span>
                    ) : null}
                  </span>
                  <span className={s.eventBottom}>
                    <span className={s.eventDetail}>{evt.detail}</span>
                    <span className={s.eventTime}>· {formatRel(toMs(evt.timestamp), now)}</span>
                  </span>
                </span>
              </li>
            );
          })
        )}
      </ul>
    </section>
  );
}

// ─── Quick actions row ─────────────────────────────────────────────────

function QuickActionsRow() {
  const items: Array<{ label: string; href: string; icon: LucideIcon; hint: string }> = [
    { label: 'صرافی‌ها', href: '/exchanges', icon: Users, hint: 'مدیریت صرافی‌ها' },
    { label: 'نرخ‌های ارز', href: '/exchange-rates', icon: TrendingUp, hint: 'نرخ لحظه‌ای' },
    { label: 'حواله‌ها', href: '/dashboard/transfer', icon: ArrowRight, hint: 'انتقال وجه' },
    { label: 'گزارش‌ها', href: '/dashboard/reports', icon: Wallet, hint: 'گزارش مالی' },
    { label: 'امنیت', href: '/dashboard/permissions', icon: ShieldAlert, hint: 'دسترسی‌ها' },
    { label: 'پشتیبانی', href: '/dashboard/helpdesk', icon: Plus, hint: 'تیکت‌ها' },
  ];

  return (
    <nav className={s.quickRow} aria-label="دسترسی سریع">
      {items.map((it) => {
        const Icon = it.icon;
        return (
          <Link key={it.href} href={it.href} className={s.quickChip}>
            <span className={s.quickChipIcon} aria-hidden>
              <Icon size={14} />
            </span>
            <span className={s.quickChipLabel}>{it.label}</span>
            <span className={s.quickChipHint}>{it.hint}</span>
          </Link>
        );
      })}
    </nav>
  );
}

// ─── Main ──────────────────────────────────────────────────────────────

export function FintechCockpit({
  userName,
  userRole,
  kpi,
  services,
  live,
  editorial,
}: FintechCockpitProps) {
  return (
    <div className={s.root} dir="rtl">
      {/* Cockpit hero */}
      <CockpitHero
        userName={userName}
        userRole={userRole}
        pending={services.stats.pending}
        total={services.stats.total}
        urgent={services.stats.pendingUrgent}
        liveCount={live.events.length}
        fraudCount={kpi.openFraudCases}
      />

      {/* KPI strip — single horizontal row, no card repetition */}
      <KpiStrip kpi={kpi} />

      {/* Quick actions row */}
      <QuickActionsRow />

      {/* Two main panels: services + live ops */}
      <div className={s.mainGrid}>
        <ServicesPanel stats={services.stats} recent={services.recent} />
        <LivePanel services={live.services} events={live.events} activityBars={live.activityBars} />
      </div>

      {/* Optional editorial deck (for editor roles) */}
      {editorial ? <div className={s.editorial}>{editorial}</div> : null}
    </div>
  );
}

export default FintechCockpit;
