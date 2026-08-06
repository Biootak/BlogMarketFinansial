'use client';

/**
 * FintechCockpit — «میز فرماندهی» / Atlas Console
 * ──────────────────────────────────────────────────────────────────────────
 * بازطراحی ۲۰۲۶-۰۸ (نسل دوم). نسخه‌ی قبلی یک «برگه‌ی پیوسته» بود با یک
 * split ثابت (track + rail) و هفت بخش که همه یک وزن بصری داشتند. مشکلش این
 * بود که چشم نقطه‌ی ورود نداشت و هیچ بخشی تعاملی نبود؛ فقط خوانده می‌شد.
 *
 * زبان جدید: «کنسول تحریری». ساختار از یک گرید ۱۲ ستونه‌ی نامتقارن می‌آید
 * (۸/۴ ، ۷/۵ ، ۴/۸ ، ۱۲) نه از ردیف کارت‌های هم‌اندازه، و یک ستون فهرست
 * چسبان (spine) در لبه‌ی شروع، موقعیت خواندن را نشان می‌دهد.
 *
 *   Spine      → فهرست بخش‌ها، بخش فعال با IntersectionObserver
 *   Masthead   → بیانیه‌ی وضعیت + ساز «Standing» (چهار باند نسبت واقعی)
 *   Tape       → نوار نرخ بازار (ExchangeRate واقعی)، اسکرول snap
 *   Pulse      → منحنی ۲۴ ساعت با crosshair تعاملی + ستون‌های ۱۴ روز
 *   Readouts   → خوانش‌های ریسک/حجم با delta واقعی
 *   Docket     → صف تصمیم، فیلتر سگمنتی روی همان داده
 *   Events     → تایم‌لاین رویدادهای زنده
 *   Systems    → سلامت سرویس‌ها + نوار تأخیر نسبی
 *   Pipelines  → قیف‌ها با باند درصدی و legend جدولی
 *   Index      → فهرست شماره‌دار مسیرها، محدود به نقش کاربر
 *
 * قرارداد props عوض نشده: `FintechCockpitServer` تنها مرز fetch است و این
 * فایل هیچ داده‌ای نمی‌سازد. هیچ عدد ساختگی، هیچ mock، هیچ placeholder.
 *
 * قواعد: توکن-only (بدون hex)، فقط logical properties، mobile-first،
 * انیمیشن فقط روی opacity/transform، بدون emoji، بدون glass تزئینی،
 * بدون بلوک reduced-motion محلی (سراسری در tokens.css کلمپ شده).
 *
 * زمان از سرور تزریق می‌شود (`serverNow`) تا رندر سرور و کلاینت یکی باشد.
 */

import { useVisibilityAwareInterval } from '@/hooks/useVisibilityAwareInterval';
import {
  Activity,
  ArrowDownRight,
  ArrowLeft,
  ArrowUpRight,
  BadgeCheck,
  CheckCircle2,
  Clock3,
  Coins,
  FileText,
  Landmark,
  Layers,
  LifeBuoy,
  Minus,
  ScrollText,
  ShieldAlert,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import Link from 'next/link';
import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import s from './FintechCockpit.module.css';

// ─── Types (قرارداد عمومی — تغییر نکرده) ──────────────────────────────────

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

/** یک بخش از قیف (status → تعداد). */
export interface CockpitSegment {
  key: string;
  count: number;
}

/** خروجی `getCockpitInsights` — همه از دیتابیس. */
export interface CockpitInsights {
  /** ۱۴ خانه، قدیمی → جدید. تعداد تراکنش هر روز. */
  txnTrend: number[];
  txn24h: number;
  txnPrev24h: number;
  volume7d: number;
  volumePrev7d: number;
  volumeCurrency: string;
  requestFunnel: CockpitSegment[];
  kycFunnel: CockpitSegment[];
  dealFunnel: CockpitSegment[];
  pendingByService: CockpitSegment[];
}

/** یک ردیف نوار نرخ — از `MarketRateItem` نرمال‌سازی شده (divisor اعمال شده). */
export interface CockpitRate {
  symbol: string;
  label: string;
  value: number;
  decimals: number;
  unit: string;
  changePercent: number;
}

export interface FintechCockpitProps {
  userName: string;
  userRole: 'OWNER' | 'ADMIN' | 'AUTHOR' | 'SUPERADMIN';
  /** `Date.now()` گرفته‌شده در سرور — پایه‌ی همه‌ی محاسبات زمانی. */
  serverNow: number;
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
  insights?: CockpitInsights;
  rates?: CockpitRate[];
  editorial?: React.ReactNode;
}

// ─── Formatting ───────────────────────────────────────────────────────────

const HOUR = 3_600_000;
const DAY = 86_400_000;

const fa = new Intl.NumberFormat('fa-IR');
const fa1 = new Intl.NumberFormat('fa-IR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const decimalFormatter = (decimals: number) =>
  new Intl.NumberFormat('fa-IR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

const compact = (value: number): string => {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `${fa1.format(value / 1_000_000_000)} میلیارد`;
  if (abs >= 1_000_000) return `${fa1.format(value / 1_000_000)} میلیون`;
  if (abs >= 10_000) return `${fa.format(Math.round(value / 1000))} هزار`;
  return fa.format(Math.round(value));
};

/** نسبت ۰..۱ → درصد فارسی. */
const pct = (ratio: number): string => `${fa.format(Math.round(ratio * 100))}٪`;

type Trend = 'up' | 'down' | 'flat';

const deltaOf = (current: number, previous: number): { trend: Trend; label: string } => {
  if (previous <= 0) {
    return current > 0
      ? { trend: 'up', label: 'بدون مبنای قبلی' }
      : { trend: 'flat', label: 'بدون داده' };
  }
  const change = ((current - previous) / previous) * 100;
  if (change > 0.5) return { trend: 'up', label: `${fa1.format(change)}٪ بیشتر` };
  if (change < -0.5) return { trend: 'down', label: `${fa1.format(Math.abs(change))}٪ کمتر` };
  return { trend: 'flat', label: 'بدون تغییر معنادار' };
};

/** پیکان روند معنای جهانی دارد و در RTL آینه نمی‌شود. */
const TrendGlyph = ({ trend }: { trend: Trend }) =>
  trend === 'up' ? (
    <TrendingUp size={13} strokeWidth={1.75} aria-hidden="true" />
  ) : trend === 'down' ? (
    <TrendingDown size={13} strokeWidth={1.75} aria-hidden="true" />
  ) : (
    <Minus size={13} strokeWidth={1.75} aria-hidden="true" />
  );

const ago = (value: string | Date | number, now: number): string => {
  const minutes = Math.max(0, Math.floor((now - new Date(value).getTime()) / 60_000));
  if (minutes < 1) return 'همین حالا';
  if (minutes < 60) return `${fa.format(minutes)} دقیقه پیش`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${fa.format(hours)} ساعت پیش`;
  return `${fa.format(Math.floor(hours / 24))} روز پیش`;
};

const isSameDay = (value: string | Date, now: number): boolean => {
  const a = new Date(value);
  const b = new Date(now);
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
};

const clock = (value: number) =>
  new Date(value).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

const jalali = (value: number) =>
  new Date(value).toLocaleDateString('fa-IR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

// ─── Vocabulary ───────────────────────────────────────────────────────────

const SERVICE_LABELS: Record<string, string> = {
  INTERNATIONAL_TRANSFER: 'حواله بین‌المللی',
  ONLINE_PAYMENT: 'پرداخت آنلاین',
  TUITION_PAYMENT: 'پرداخت شهریه',
  FREELANCE_INCOME: 'نقد کردن درآمد',
  SOFTWARE_PURCHASE: 'خرید نرم‌افزار',
  CURRENCY_BUY: 'خرید ارز',
  CURRENCY_SELL: 'فروش ارز',
  OTHER: 'سایر خدمات',
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'در انتظار',
  SUBMITTED: 'ثبت‌شده',
  IN_REVIEW: 'در بررسی',
  IN_PROGRESS: 'در حال انجام',
  PROCESSING: 'در حال پردازش',
  MATCHED: 'تطبیق‌شده',
  APPROVED: 'تأیید شده',
  COMPLETED: 'تکمیل شده',
  SETTLED: 'تسویه شده',
  REJECTED: 'رد شده',
  CANCELLED: 'لغو شده',
  FAILED: 'ناموفق',
  EXPIRED: 'منقضی',
  NOT_STARTED: 'شروع نشده',
  UNKNOWN: 'نامشخص',
};

const UNIT_LABELS: Record<string, string> = {
  toman: 'تومان',
  rial: 'ریال',
  usd: 'دلار',
  eur: 'یورو',
  afn: 'افغانی',
  pound: 'پوند',
};

const labelFor = (key: string) => STATUS_LABELS[key] ?? SERVICE_LABELS[key] ?? key;

const toneFor = (key: string): string => {
  if (['PENDING', 'SUBMITTED', 'IN_REVIEW', 'NOT_STARTED', 'EXPIRED'].includes(key)) return 'amber';
  if (['IN_PROGRESS', 'PROCESSING', 'MATCHED'].includes(key)) return 'cyan';
  if (['COMPLETED', 'APPROVED', 'SETTLED'].includes(key)) return 'emerald';
  if (['CANCELLED', 'REJECTED', 'FAILED'].includes(key)) return 'rose';
  return 'slate';
};

const SERVICE_HEALTH: Record<FintechCockpitLiveService['status'], string> = {
  healthy: 'سالم',
  degraded: 'کند',
  down: 'قطع',
  idle: 'بی‌سنجه',
};

const eventIcon = (type: FintechCockpitLiveEvent['type']) => {
  if (type === 'fraud') return ShieldAlert;
  if (type === 'auth') return ShieldCheck;
  if (type === 'kyc') return BadgeCheck;
  if (type === 'withdraw') return ArrowUpRight;
  if (type === 'deposit') return ArrowDownRight;
  return Wallet;
};

type Role = FintechCockpitProps['userRole'];
const ADMINS: Role[] = ['OWNER', 'ADMIN', 'SUPERADMIN'];
const ALL: Role[] = ['OWNER', 'ADMIN', 'SUPERADMIN', 'AUTHOR'];

const ROUTES: Array<{
  href: string;
  label: string;
  hint: string;
  icon: typeof Layers;
  roles: Role[];
}> = [
  {
    href: '/dashboard/service-requests',
    label: 'درخواست‌های خدمات',
    hint: 'صف تصمیم',
    icon: Layers,
    roles: ADMINS,
  },
  {
    href: '/dashboard/exchanges',
    label: 'صرافی‌ها',
    hint: 'اعضا و نقش‌ها',
    icon: Landmark,
    roles: ADMINS,
  },
  {
    href: '/dashboard/exchange-rates',
    label: 'نرخ ارز',
    hint: 'بازار زنده',
    icon: Coins,
    roles: ALL,
  },
  {
    href: '/dashboard/fraud-review',
    label: 'بازبینی ریسک',
    hint: 'پرونده‌های باز',
    icon: ShieldAlert,
    roles: ADMINS,
  },
  {
    href: '/dashboard/kyc-review',
    label: 'احراز هویت',
    hint: 'در انتظار بررسی',
    icon: BadgeCheck,
    roles: ADMINS,
  },
  { href: '/dashboard/reports', label: 'گزارش‌ها', hint: 'تحلیل مالی', icon: Activity, roles: ALL },
  {
    href: '/dashboard/audit-log',
    label: 'دفتر رویداد',
    hint: 'ردپای سیستم',
    icon: ScrollText,
    roles: ADMINS,
  },
  { href: '/dashboard/helpdesk', label: 'پشتیبانی', hint: 'تیکت‌های باز', icon: LifeBuoy, roles: ALL },
  { href: '/dashboard/posts', label: 'نوشته‌ها', hint: 'تحریریه', icon: FileText, roles: ALL },
];

// ─── Shared bits ──────────────────────────────────────────────────────────

function Head({
  id,
  index,
  title,
  note,
  action,
}: {
  id: string;
  index: string;
  title: string;
  note?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className={s.head}>
      <span className={s.headIndex} aria-hidden="true" dir="ltr">
        {index}
      </span>
      <h2 className={s.headTitle} id={`${id}-title`}>
        {title}
      </h2>
      <span className={s.headRule} aria-hidden="true" />
      {note ? <span className={s.headNote}>{note}</span> : null}
      {action ?? null}
    </div>
  );
}

function Panel({
  id,
  span,
  children,
}: {
  id: string;
  span: 4 | 5 | 7 | 8 | 12;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className={s.panel}
      data-span={span}
      style={{ scrollMarginBlockStart: '6rem' }}
    >
      {children}
    </section>
  );
}

function More({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className={s.more}>
      {children}
      <ArrowLeft size={14} strokeWidth={1.75} aria-hidden="true" />
    </Link>
  );
}

function Blank({
  icon: Icon,
  title,
  body,
  href,
  cta,
}: {
  icon: typeof Layers;
  title: string;
  body: string;
  href?: string;
  cta?: string;
}) {
  return (
    <div className={s.blank}>
      <span className={s.blankMark} aria-hidden="true">
        <Icon size={20} strokeWidth={1.5} />
      </span>
      <strong>{title}</strong>
      <p>{body}</p>
      {href && cta ? (
        <Link href={href} className={s.blankCta}>
          {cta}
          <ArrowLeft size={14} strokeWidth={1.75} aria-hidden="true" />
        </Link>
      ) : null}
    </div>
  );
}

// ─── Spine — فهرست بخش‌ها ─────────────────────────────────────────────────

interface SpineItem {
  id: string;
  index: string;
  label: string;
}

function Spine({ items }: { items: SpineItem[] }) {
  const [active, setActive] = useState<string>(items[0]?.id ?? '');

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const nodes = items
      .map((item) => document.getElementById(item.id))
      .filter((node): node is HTMLElement => node !== null);
    if (nodes.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries.find((entry) => entry.isIntersecting);
        if (first) setActive(first.target.id);
      },
      { rootMargin: '-38% 0px -56% 0px', threshold: 0 },
    );
    for (const node of nodes) observer.observe(node);
    return () => observer.disconnect();
  }, [items]);

  return (
    <nav className={s.spine} aria-label="فهرست بخش‌های میز فرماندهی">
      <ol className={s.spineList}>
        {items.map((item) => {
          const on = item.id === active;
          return (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                className={s.spineItem}
                data-on={on}
                aria-current={on ? 'true' : undefined}
              >
                <span className={s.spineNum} dir="ltr">
                  {item.index}
                </span>
                <span className={s.spineDot} aria-hidden="true" />
                <span className={s.spineLabel}>{item.label}</span>
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// ─── Standing — ساز وضعیت (چهار باند نسبت واقعی) ──────────────────────────

interface StandingBand {
  key: string;
  label: string;
  value: string;
  /** نسبت واقعی ۰..۱ — اگر مبنای واقعی وجود ندارد `null` (باند خط‌چین می‌شود). */
  ratio: number | null;
  note: string;
  tone: 'brand' | 'emerald' | 'amber' | 'rose';
}

function Standing({ bands }: { bands: StandingBand[] }) {
  return (
    <dl className={s.standing}>
      {bands.map((band) => (
        <div key={band.key} className={s.band}>
          <dt className={s.bandLabel}>{band.label}</dt>
          <dd className={s.bandValue} dir="ltr">
            {band.value}
          </dd>
          <div className={s.bandTrack} aria-hidden="true">
            {band.ratio === null ? (
              <span className={s.bandNull} />
            ) : (
              <span
                className={`${s.bandFill} ${s[`tone_${band.tone}`]}`}
                style={{ '--fill': Math.max(0.015, Math.min(1, band.ratio)) } as React.CSSProperties}
              />
            )}
          </div>
          <p className={s.bandNote}>{band.note}</p>
        </div>
      ))}
    </dl>
  );
}

// ─── 0. Masthead ──────────────────────────────────────────────────────────

function Masthead({
  userName,
  now,
  stats,
  kpi,
  health,
  measured,
}: {
  userName: string;
  now: number;
  stats: FintechCockpitServiceStats;
  kpi: FintechCockpitProps['kpi'];
  health: number | null;
  measured: number;
}) {
  const hour = new Date(now).getHours();
  const greeting =
    hour < 5
      ? 'شب بخیر'
      : hour < 12
        ? 'صبح بخیر'
        : hour < 17
          ? 'ظهر بخیر'
          : hour < 21
            ? 'عصر بخیر'
            : 'شب بخیر';

  const facts: string[] = [];
  if (stats.pending > 0) facts.push(`${fa.format(stats.pending)} درخواست در صف`);
  if (stats.pendingUrgent > 0) facts.push(`${fa.format(stats.pendingUrgent)} فوری`);
  if (kpi.openFraudCases > 0) facts.push(`${fa.format(kpi.openFraudCases)} پرونده‌ی ریسک باز`);
  if (stats.todayCount > 0) facts.push(`${fa.format(stats.todayCount)} ثبت امروز`);

  const bands: StandingBand[] = [
    {
      key: 'health',
      label: 'سلامت سرویس‌ها',
      value: health === null ? '—' : pct(health / 100),
      ratio: health === null ? null : health / 100,
      note:
        measured === 0
          ? 'هیچ سرویسی سنجه‌ی زنده ندارد'
          : `${fa.format(measured)} سرویس سنجیده‌شده`,
      tone: health === null ? 'brand' : health >= 90 ? 'emerald' : health >= 60 ? 'amber' : 'rose',
    },
    {
      key: 'queue',
      label: 'صف در انتظار',
      value: fa.format(stats.pending),
      ratio: stats.total > 0 ? stats.pending / stats.total : null,
      note: stats.total > 0 ? `از ${fa.format(stats.total)} درخواست ثبت‌شده` : 'هنوز درخواستی ثبت نشده',
      tone: stats.pending === 0 ? 'emerald' : 'brand',
    },
    {
      key: 'urgent',
      label: 'فوری در صف',
      value: fa.format(stats.pendingUrgent),
      ratio: stats.pending > 0 ? stats.pendingUrgent / stats.pending : null,
      note:
        stats.pending > 0
          ? `${pct(stats.pendingUrgent / stats.pending)} از صف`
          : 'صف خالی است',
      tone: stats.pendingUrgent > 0 ? 'rose' : 'emerald',
    },
    {
      key: 'risk',
      label: 'پرونده‌ی ریسک باز',
      value: fa.format(kpi.openFraudCases),
      ratio: null,
      note: kpi.openFraudCases > 0 ? 'نیازمند بازبینی دستی' : 'هیچ پرونده‌ی بازی نیست',
      tone: kpi.openFraudCases > 0 ? 'rose' : 'emerald',
    },
  ];

  return (
    <header className={s.masthead}>
      <div className={s.mastheadMain}>
        <p className={s.kicker}>
          <span className={s.pulseDot} aria-hidden="true" />
          میز فرماندهی
          <span className={s.kickerSep} aria-hidden="true" />
          <time dir="ltr" dateTime={new Date(now).toISOString()}>
            {clock(now)}
          </time>
          <span className={s.kickerSep} aria-hidden="true" />
          {jalali(now)}
        </p>

        <h1 className={s.greeting}>
          {greeting}، <em>{userName || 'مدیر'}</em>
        </h1>

        <p className={s.runIn}>
          {facts.length > 0
            ? facts.join(' · ')
            : 'هیچ موردی منتظر تصمیم تو نیست. میز تمیز است.'}
        </p>

        <p className={s.mastheadTail}>
          <span>
            مشتری فعال <b dir="ltr">{fa.format(kpi.activeCustomers)}</b>
          </span>
          <span className={s.kickerSep} aria-hidden="true" />
          <span>
            تراکنش ۲۴ ساعت <b dir="ltr">{fa.format(kpi.txn24h)}</b>
          </span>
        </p>
      </div>

      <div className={s.mastheadAside}>
        <Standing bands={bands} />
      </div>
    </header>
  );
}

// ─── Tape — نوار نرخ بازار ────────────────────────────────────────────────

function Tape({ rates }: { rates: CockpitRate[] }) {
  if (rates.length === 0) return null;

  return (
    <section className={s.tapeWrap} aria-label="نرخ‌های بازار">
      <div className={s.tape}>
        {rates.map((rate) => {
          const trend: Trend =
            rate.changePercent > 0.01 ? 'up' : rate.changePercent < -0.01 ? 'down' : 'flat';
          return (
            <Link
              key={rate.symbol}
              href="/dashboard/exchange-rates"
              className={s.tapeItem}
              title={rate.label}
            >
              <span className={s.tapeName}>{rate.label}</span>
              <span className={s.tapeValue} dir="ltr">
                {decimalFormatter(rate.decimals).format(rate.value)}
              </span>
              <span className={s.tapeFoot}>
                <span className={`${s.tapeDelta} ${s[`trend_${trend}`]}`}>
                  <TrendGlyph trend={trend} />
                  {trend === 'flat' ? 'ثابت' : `${fa1.format(Math.abs(rate.changePercent))}٪`}
                </span>
                <small className={s.tapeUnit}>{UNIT_LABELS[rate.unit] ?? rate.unit}</small>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

// ─── 01. Pulse — منحنی تعاملی ۲۴ ساعت + ستون‌های ۱۴ روز ───────────────────

function Pulse({
  bars,
  insights,
  now,
}: {
  bars: number[];
  insights?: CockpitInsights;
  now: number;
}) {
  const [cursor, setCursor] = useState<number | null>(null);

  const series = bars.length > 1 ? bars : [];
  const count = series.length;
  const peak = count > 0 ? Math.max(...series) : 0;
  const peakIndex = count > 0 ? series.indexOf(peak) : 0;
  const hasSignal = peak > 0;

  const hourLabel = (index: number) =>
    new Date(now - (count - 1 - index) * HOUR).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    });

  const yOf = (value: number) => 96 - Math.max(0, Math.min(100, value)) * 0.9;
  const xOf = (index: number) => (count > 1 ? (index / (count - 1)) * 100 : 0);

  const coords = series.map((value, index) => `${xOf(index).toFixed(2)},${yOf(value).toFixed(2)}`).join(' ');

  const move = (clientX: number, element: HTMLElement) => {
    if (count < 2) return;
    const rect = element.getBoundingClientRect();
    if (rect.width === 0) return;
    const ratio = (clientX - rect.left) / rect.width;
    const index = Math.round(ratio * (count - 1));
    setCursor(Math.max(0, Math.min(count - 1, index)));
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (count < 2) return;
    const current = cursor ?? count - 1;
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      setCursor(Math.min(count - 1, current + 1));
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      setCursor(Math.max(0, current - 1));
    } else if (event.key === 'Home') {
      event.preventDefault();
      setCursor(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      setCursor(count - 1);
    } else if (event.key === 'Escape') {
      setCursor(null);
    }
  };

  const trend = insights?.txnTrend ?? [];
  const trendMax = trend.length > 0 ? Math.max(...trend, 1) : 1;
  const trendLast = trend.length > 0 ? (trend[trend.length - 1] ?? 0) : 0;
  const txnDelta = insights ? deltaOf(insights.txn24h, insights.txnPrev24h) : null;

  const dayLabel = (index: number) =>
    new Date(now - (trend.length - 1 - index) * DAY).toLocaleDateString('fa-IR', {
      day: 'numeric',
      month: 'short',
    });

  return (
    <Panel id="pulse" span={8}>
      <Head
        id="pulse"
        index="01"
        title="نبض پلتفرم"
        note={hasSignal ? `اوج در ${hourLabel(peakIndex)}` : 'بدون رویداد ثبت‌شده'}
        action={<More href="/dashboard/audit-log">دفتر رویداد</More>}
      />

      {hasSignal ? (
        <>
          {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
          <div
            className={s.ridge}
            dir="ltr"
            tabIndex={0}
            role="group"
            aria-label={`فعالیت ۲۴ ساعت گذشته. بیشترین شدت در ساعت ${hourLabel(peakIndex)}. با کلید جهت‌نما مقدار هر ساعت را بخوان.`}
            onPointerMove={(event) => move(event.clientX, event.currentTarget)}
            onPointerDown={(event) => move(event.clientX, event.currentTarget)}
            onPointerLeave={() => setCursor(null)}
            onKeyDown={onKeyDown}
            onBlur={() => setCursor(null)}
          >
            <svg className={s.ridgeSvg} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              <line className={s.gridLine} x1="0" y1="33" x2="100" y2="33" vectorEffect="non-scaling-stroke" />
              <line className={s.gridLine} x1="0" y1="64" x2="100" y2="64" vectorEffect="non-scaling-stroke" />
              <line className={s.baseLine} x1="0" y1="96" x2="100" y2="96" vectorEffect="non-scaling-stroke" />
              <polygon className={s.area} points={`0,100 ${coords} 100,100`} />
              <polyline className={s.line} points={coords} vectorEffect="non-scaling-stroke" />
              {cursor !== null ? (
                <circle
                  className={s.cursorDot}
                  cx={xOf(cursor)}
                  cy={yOf(series[cursor] ?? 0)}
                  r="1.6"
                  vectorEffect="non-scaling-stroke"
                />
              ) : null}
            </svg>

            {cursor !== null ? (
              <span
                className={s.cross}
                style={{ '--x': `${xOf(cursor)}%` } as React.CSSProperties}
                aria-hidden="true"
              />
            ) : null}
          </div>

          <div className={s.ridgeFoot}>
            <output className={s.readout}>
              {cursor === null ? (
                <span className={s.readoutHint}>نشانگر را روی منحنی ببر یا با کلید جهت‌نما بخوان</span>
              ) : (
                <>
                  <span className={s.readoutValue} dir="ltr">
                    {hourLabel(cursor)}
                  </span>
                  <span className={s.readoutSep} aria-hidden="true" />
                  <span>
                    شدت فعالیت <b>{fa.format(series[cursor] ?? 0)}</b>
                  </span>
                </>
              )}
            </output>
            <span className={s.ridgeScale} dir="ltr" aria-hidden="true">
              {hourLabel(0)} → {hourLabel(count - 1)}
            </span>
          </div>
        </>
      ) : (
        <Blank
          icon={Activity}
          title="هنوز رویدادی ثبت نشده"
          body="به‌محض ثبت اولین فعالیت در دفتر رویداد، منحنی ۲۴ ساعته اینجا شکل می‌گیرد."
        />
      )}

      {trend.length > 1 ? (
        <div className={s.trend}>
          <div className={s.trendHead}>
            <span className={s.miniLabel}>تراکنش، ۱۴ روز</span>
            {txnDelta ? (
              <span className={`${s.chip} ${s[`trend_${txnDelta.trend}`]}`}>
                <TrendGlyph trend={txnDelta.trend} />
                {txnDelta.label}
              </span>
            ) : null}
            <span className={s.trendPeak} dir="ltr">
              {fa.format(trendMax)}
            </span>
          </div>

          <ol
            className={s.trendBars}
            dir="ltr"
            role="img"
            aria-label={`روند تراکنش ۱۴ روز گذشته. بیشینه ${fa.format(trendMax)}، آخرین روز ${fa.format(trendLast)}.`}
          >
            {trend.map((value, index) => (
              <li
                // biome-ignore lint/suspicious/noArrayIndexKey: سری زمانی ثابت‌طول، کلید معنادار دیگری ندارد
                key={`day-${index}`}
                data-label={`${dayLabel(index)} · ${fa.format(value)}`}
                aria-hidden="true"
              >
                <i style={{ blockSize: `${Math.max(2, (value / trendMax) * 100)}%` }} />
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </Panel>
  );
}

// ─── 02. Readouts ─────────────────────────────────────────────────────────

function Readouts({
  kpi,
  stats,
  insights,
}: {
  kpi: FintechCockpitProps['kpi'];
  stats: FintechCockpitServiceStats;
  insights?: CockpitInsights;
}) {
  const volumeDelta = insights ? deltaOf(insights.volume7d, insights.volumePrev7d) : null;
  const txnDelta = insights ? deltaOf(insights.txn24h, insights.txnPrev24h) : null;

  const rows: Array<{
    label: string;
    value: string;
    note: string;
    href: string;
    tone?: string;
    trend?: Trend;
    lead?: boolean;
  }> = [
    {
      label: 'صف تصمیم',
      value: fa.format(stats.pending),
      note:
        stats.pendingUrgent > 0 ? `${fa.format(stats.pendingUrgent)} مورد فوری` : 'بدون مورد فوری',
      href: '/dashboard/service-requests',
      tone: stats.pendingUrgent > 0 ? 'rose' : stats.pending > 0 ? 'amber' : 'emerald',
      lead: true,
    },
    {
      label: 'پرونده ریسک باز',
      value: fa.format(kpi.openFraudCases),
      note: kpi.openFraudCases > 0 ? 'نیازمند بازبینی' : 'هیچ پرونده‌ی بازی نیست',
      href: '/dashboard/fraud-review',
      tone: kpi.openFraudCases > 0 ? 'rose' : 'emerald',
    },
    {
      label: 'تراکنش ۲۴ ساعت',
      value: fa.format(insights?.txn24h ?? kpi.txn24h),
      note: txnDelta ? txnDelta.label : 'بدون مبنای مقایسه',
      href: '/dashboard/audit-log',
      trend: txnDelta?.trend,
    },
    {
      label: `حجم معاملات ۷ روز (${insights?.volumeCurrency ?? kpi.dealsCurrency})`,
      value: compact(insights?.volume7d ?? kpi.dealsVolume),
      note: volumeDelta ? volumeDelta.label : 'بدون مبنای مقایسه',
      href: '/dashboard/my-deals',
      trend: volumeDelta?.trend,
    },
    {
      label: 'مشتری فعال',
      value: fa.format(kpi.activeCustomers),
      note: 'احراز هویت تأییدشده',
      href: '/dashboard/customers',
    },
  ];

  return (
    <Panel id="readouts" span={4}>
      <Head id="readouts" index="02" title="خوانش وضعیت" />
      <div className={s.readouts}>
        {rows.map((row) => (
          <Link
            key={row.label}
            href={row.href}
            className={s.readRow}
            data-lead={row.lead ? 'true' : undefined}
          >
            <span className={s.readLabel}>{row.label}</span>
            <strong className={`${s.readValue} ${row.tone ? s[`tone_${row.tone}`] : ''}`} dir="ltr">
              {row.value}
            </strong>
            <span className={`${s.readNote} ${row.trend ? s[`trend_${row.trend}`] : ''}`}>
              {row.trend ? <TrendGlyph trend={row.trend} /> : null}
              {row.note}
            </span>
            <ArrowLeft size={14} strokeWidth={1.75} className={s.readGo} aria-hidden="true" />
          </Link>
        ))}
      </div>
      {!insights ? (
        <p className={s.degraded}>
          سنجه‌های تجمیعی این لحظه در دسترس نیست؛ اعداد پایه از KPI زنده خوانده شده‌اند.
        </p>
      ) : null}
    </Panel>
  );
}

// ─── 03. Docket — صف تصمیم با فیلتر ───────────────────────────────────────

type DocketFilter = 'all' | 'urgent' | 'today';

function Docket({
  recent,
  stats,
  now,
}: {
  recent: FintechCockpitService[];
  stats: FintechCockpitServiceStats;
  now: number;
}) {
  const [filter, setFilter] = useState<DocketFilter>('all');

  const counts = useMemo(
    () => ({
      all: recent.length,
      urgent: recent.filter((item) => item.urgency === 'URGENT').length,
      today: recent.filter((item) => isSameDay(item.createdAt, now)).length,
    }),
    [recent, now],
  );

  const rows = useMemo(() => {
    if (filter === 'urgent') return recent.filter((item) => item.urgency === 'URGENT');
    if (filter === 'today') return recent.filter((item) => isSameDay(item.createdAt, now));
    return recent;
  }, [recent, filter, now]);

  const tabs: Array<{ key: DocketFilter; label: string; count: number }> = [
    { key: 'all', label: 'همه', count: counts.all },
    { key: 'urgent', label: 'فوری', count: counts.urgent },
    { key: 'today', label: 'امروز', count: counts.today },
  ];

  return (
    <Panel id="docket" span={7}>
      <Head
        id="docket"
        index="03"
        title="صف تصمیم"
        note={`${fa.format(stats.pending)} در انتظار · ${fa.format(stats.todayCount)} امروز`}
        action={<More href="/dashboard/service-requests">همه‌ی درخواست‌ها</More>}
      />

      {recent.length > 0 ? (
        <>
          <div className={s.filters} role="group" aria-label="فیلتر صف تصمیم">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={s.filterBtn}
                data-on={filter === tab.key}
                aria-pressed={filter === tab.key}
                onClick={() => setFilter(tab.key)}
              >
                {tab.label}
                <span className={s.filterCount} dir="ltr">
                  {fa.format(tab.count)}
                </span>
              </button>
            ))}
          </div>

          {rows.length > 0 ? (
            <ol className={s.docket}>
              {rows.map((item, index) => {
                const urgent = item.urgency === 'URGENT';
                return (
                  <li key={item.id}>
                    <Link href="/dashboard/service-requests" className={s.row}>
                      <span className={s.rowIndex} aria-hidden="true" dir="ltr">
                        {String(index + 1).padStart(2, '0')}
                      </span>

                      <span className={s.rowBody}>
                        <strong className={s.rowName}>{item.fullName || 'بدون نام'}</strong>
                        <small className={s.rowMeta}>
                          {SERVICE_LABELS[item.serviceType] ?? item.serviceType}
                          <span className={s.dotSep} aria-hidden="true" />
                          <span dir="ltr" className={s.mono}>
                            {item.trackingCode}
                          </span>
                        </small>
                      </span>

                      <span className={s.rowSide}>
                        <b dir="ltr" className={s.rowAmount}>
                          {item.amount} {item.currency}
                        </b>
                        <span className={s.rowTags}>
                          {urgent ? (
                            <span className={`${s.tag} ${s.tagUrgent}`}>
                              <ShieldAlert size={12} strokeWidth={2} aria-hidden="true" />
                              فوری
                            </span>
                          ) : (
                            <span className={s.tag}>
                              {STATUS_LABELS[item.status] ?? item.status}
                            </span>
                          )}
                          <time dateTime={new Date(item.createdAt).toISOString()}>
                            {ago(item.createdAt, now)}
                          </time>
                        </span>
                      </span>

                      <ArrowLeft
                        size={15}
                        strokeWidth={1.75}
                        className={s.rowGo}
                        aria-hidden="true"
                      />
                    </Link>
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className={s.filterEmpty}>
              با این فیلتر موردی نیست.{' '}
              <button type="button" className={s.linkBtn} onClick={() => setFilter('all')}>
                نمایش همه
              </button>
            </p>
          )}
        </>
      ) : (
        <Blank
          icon={CheckCircle2}
          title="صف خالی است"
          body="هیچ درخواست خدماتی منتظر تصمیم نیست. تاریخچه‌ی کامل در مرکز درخواست‌ها باقی است."
          href="/dashboard/service-requests"
          cta="مرور تاریخچه"
        />
      )}
    </Panel>
  );
}

// ─── 04. Events ───────────────────────────────────────────────────────────

function Events({ events, now }: { events: FintechCockpitLiveEvent[]; now: number }) {
  return (
    <Panel id="events" span={5}>
      <Head
        id="events"
        index="04"
        title="رویدادها"
        action={<More href="/dashboard/audit-log">همه</More>}
      />
      {events.length > 0 ? (
        <ol className={s.events}>
          {events.slice(0, 7).map((event) => {
            const Icon = eventIcon(event.type);
            return (
              <li key={event.id} className={s.event}>
                <span className={s.eventMark} aria-hidden="true">
                  <Icon size={12} strokeWidth={1.75} />
                </span>
                <span className={s.eventBody}>
                  <strong>{event.actor}</strong>
                  <small dir="auto">{event.detail}</small>
                </span>
                <time className={s.eventTime} dateTime={new Date(event.timestamp).toISOString()}>
                  {ago(event.timestamp, now)}
                </time>
              </li>
            );
          })}
        </ol>
      ) : (
        <Blank
          icon={Clock3}
          title="دفتر رویداد ساکت است"
          body="هر ورود، حواله یا تغییر وضعیت به‌محض ثبت اینجا ظاهر می‌شود."
        />
      )}
    </Panel>
  );
}

// ─── 05. Systems ──────────────────────────────────────────────────────────

function Systems({ services }: { services: FintechCockpitLiveService[] }) {
  if (services.length === 0) return null;

  const latencies = services
    .map((service) => service.latencyMs)
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  const maxLatency = latencies.length > 0 ? Math.max(...latencies, 1) : 0;

  return (
    <Panel id="systems" span={4}>
      <Head
        id="systems"
        index="05"
        title="سرویس‌ها"
        note={maxLatency > 0 ? `کندترین ${Math.round(maxLatency)}ms` : undefined}
      />
      <ul className={s.systems}>
        {services.map((service) => {
          const latency = service.latencyMs;
          const ratio =
            typeof latency === 'number' && maxLatency > 0
              ? Math.max(0.04, Math.min(1, latency / maxLatency))
              : null;
          return (
            <li key={service.id} className={s.sysRow} title={service.desc}>
              <span className={`${s.glyph} ${s[`glyph_${service.status}`]}`} aria-hidden="true" />
              <span className={s.sysName}>{service.name}</span>
              <span className={s.sysState}>{SERVICE_HEALTH[service.status]}</span>
              <span className={s.sysBar} aria-hidden="true">
                {ratio === null ? (
                  <i className={s.sysBarNull} />
                ) : (
                  <i
                    className={`${s.sysBarFill} ${s[`glyphFill_${service.status}`]}`}
                    style={{ '--fill': ratio } as React.CSSProperties}
                  />
                )}
              </span>
              <span className={s.sysLatency} dir="ltr">
                {latency == null ? '—' : `${Math.round(latency)}ms`}
              </span>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

// ─── 06. Pipelines ────────────────────────────────────────────────────────

function Pipeline({
  title,
  segments,
  href,
  emptyNote,
}: {
  title: string;
  segments: CockpitSegment[];
  href: string;
  emptyNote: string;
}) {
  const total = segments.reduce((sum, segment) => sum + segment.count, 0);

  return (
    <div className={s.pipe}>
      <div className={s.pipeHead}>
        <h3 className={s.pipeTitle}>{title}</h3>
        <Link href={href} className={s.pipeTotal}>
          <span dir="ltr">{fa.format(total)}</span>
          <ArrowLeft size={13} strokeWidth={1.75} aria-hidden="true" />
        </Link>
      </div>

      {total > 0 ? (
        <>
          <div
            className={s.bar}
            role="img"
            aria-label={segments
              .map((segment) => `${labelFor(segment.key)}: ${fa.format(segment.count)}`)
              .join('، ')}
          >
            {segments.map((segment) => (
              <span
                key={segment.key}
                className={s[`seg_${toneFor(segment.key)}`]}
                style={{ inlineSize: `${(segment.count / total) * 100}%` }}
              />
            ))}
          </div>
          <ul className={s.legend}>
            {segments.slice(0, 5).map((segment) => (
              <li key={segment.key}>
                <span
                  className={`${s.dot} ${s[`seg_${toneFor(segment.key)}`]}`}
                  aria-hidden="true"
                />
                <span className={s.legendLabel}>{labelFor(segment.key)}</span>
                <b dir="ltr">{fa.format(segment.count)}</b>
                <span className={s.legendPct} dir="ltr">
                  {pct(segment.count / total)}
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className={s.pipeEmpty}>{emptyNote}</p>
      )}
    </div>
  );
}

function Pipelines({ insights }: { insights: CockpitInsights }) {
  const hasAny =
    insights.requestFunnel.length > 0 ||
    insights.kycFunnel.length > 0 ||
    insights.dealFunnel.length > 0;
  if (!hasAny) return null;

  return (
    <Panel id="pipelines" span={8}>
      <Head id="pipelines" index="06" title="قیف‌های عملیاتی" note="سهم هر وضعیت از کل رکوردها" />
      <div className={s.pipes}>
        <Pipeline
          title="درخواست‌های خدمات"
          segments={insights.requestFunnel}
          href="/dashboard/service-requests"
          emptyNote="هنوز درخواستی ثبت نشده است."
        />
        <Pipeline
          title="احراز هویت مشتریان"
          segments={insights.kycFunnel}
          href="/dashboard/kyc-review"
          emptyNote="هنوز پرونده‌ی احراز هویتی وجود ندارد."
        />
        <Pipeline
          title="معاملات ارزی"
          segments={insights.dealFunnel}
          href="/dashboard/my-deals"
          emptyNote="هنوز معامله‌ای ثبت نشده است."
        />
      </div>

      {insights.pendingByService.length > 0 ? (
        <div className={s.load}>
          <span className={s.miniLabel}>بار صف به تفکیک خدمت</span>
          <ul className={s.loadList}>
            {insights.pendingByService.map((segment) => (
              <li key={segment.key}>
                <span>{SERVICE_LABELS[segment.key] ?? segment.key}</span>
                <b dir="ltr">{fa.format(segment.count)}</b>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </Panel>
  );
}

// ─── 07. Index — مسیرها ───────────────────────────────────────────────────

function RouteIndex({ userRole }: { userRole: Role }) {
  const allowed = ROUTES.filter((route) => route.roles.includes(userRole));
  if (allowed.length === 0) return null;

  return (
    <Panel id="index" span={12}>
      <Head id="index" index="07" title="مسیرها" note={`${fa.format(allowed.length)} مقصد در دسترس نقش تو`} />
      <nav className={s.routes}>
        {allowed.map(({ href, label, hint, icon: Icon }, position) => (
          <Link key={href} href={href} className={s.route}>
            <span className={s.routeNum} aria-hidden="true" dir="ltr">
              {String(position + 1).padStart(2, '0')}
            </span>
            <Icon size={17} strokeWidth={1.5} className={s.routeIcon} aria-hidden="true" />
            <span className={s.routeBody}>
              <b>{label}</b>
              <small>{hint}</small>
            </span>
            <ArrowLeft size={14} strokeWidth={1.75} className={s.routeGo} aria-hidden="true" />
          </Link>
        ))}
      </nav>
    </Panel>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────

export function FintechCockpit({
  userName,
  userRole,
  serverNow,
  kpi,
  services,
  live,
  insights,
  rates,
  editorial,
}: FintechCockpitProps) {
  // seed از سرور ⇒ رندر اول سرور و کلاینت یکسان است (بدون hydration mismatch).
  const [now, setNow] = useState(serverNow);
  useVisibilityAwareInterval(() => setNow(Date.now()), 30_000);

  const measured = live.services.filter((service) => service.status !== 'idle');
  const health =
    measured.length > 0
      ? Math.round(
          (measured.filter((service) => service.status === 'healthy').length / measured.length) *
            100,
        )
      : null;

  const hasSystems = live.services.length > 0;
  const hasPipelines =
    !!insights &&
    (insights.requestFunnel.length > 0 ||
      insights.kycFunnel.length > 0 ||
      insights.dealFunnel.length > 0);
  const hasRoutes = ROUTES.some((route) => route.roles.includes(userRole));

  const spineItems = useMemo<SpineItem[]>(() => {
    const items: SpineItem[] = [
      { id: 'pulse', index: '01', label: 'نبض' },
      { id: 'readouts', index: '02', label: 'خوانش' },
      { id: 'docket', index: '03', label: 'صف' },
      { id: 'events', index: '04', label: 'رویداد' },
    ];
    if (hasSystems) items.push({ id: 'systems', index: '05', label: 'سرویس' });
    if (hasPipelines) items.push({ id: 'pipelines', index: '06', label: 'قیف' });
    if (hasRoutes) items.push({ id: 'index', index: '07', label: 'مسیر' });
    return items;
  }, [hasSystems, hasPipelines, hasRoutes]);

  return (
    <div className={s.sheet} dir="rtl">
      <Spine items={spineItems} />

      <div className={s.body}>
        <Masthead
          userName={userName}
          now={now}
          stats={services.stats}
          kpi={kpi}
          health={health}
          measured={measured.length}
        />

        <Tape rates={rates ?? []} />

        <div className={s.grid}>
          <Pulse bars={live.activityBars} insights={insights} now={now} />
          <Readouts kpi={kpi} stats={services.stats} insights={insights} />
          <Docket recent={services.recent} stats={services.stats} now={now} />
          <Events events={live.events} now={now} />
          <Systems services={live.services} />
          {insights ? <Pipelines insights={insights} /> : null}
          <RouteIndex userRole={userRole} />
        </div>

        {editorial ? <div className={s.editorial}>{editorial}</div> : null}
      </div>
    </div>
  );
}

export default FintechCockpit;
