'use client';

/**
 * FintechCockpit — «میز فرماندهی» (Ledger Desk)
 * ──────────────────────────────────────────────────────────────────────────
 * بازطراحی ۲۰۲۶-۰۸. ساختار قبلی (تیتر ۴٫۸rem + ریل سیگنال + دو پنل هم‌اندازه)
 * کنار گذاشته شد. زبان جدید «دفتر ثبت» است: یک برگه‌ی پیوسته که با خط مو
 * (hairline) تقسیم می‌شود، نه مجموعه‌ای از کارت‌های گرد هم‌اندازه.
 *
 *   Masthead   → سلام + جمله‌ی وضعیت واقعی + ساعت/تاریخ جلالی + نوار «نفس»
 *   Tape       → نوار نرخ بازار (داده‌ی واقعی ExchangeRate)
 *   Pulse      → نمودار SVG فعالیت ۲۴ ساعت + ستون‌های ۱۴ روز تراکنش
 *   Ledger     → صف تصمیم، سطرهای شماره‌دار و متراکم
 *   Posture    → ریل خوانش‌های ریسک/حجم با delta واقعی
 *   Systems    → سلامت سرویس‌ها (لوزی وضعیت + برچسب متنی، نه فقط رنگ)
 *   Events     → تایم‌لاین رویدادهای زنده
 *   Pipelines  → قیف‌های واقعی: درخواست‌ها / احراز هویت / معاملات
 *   Routes     → شبکه‌ی مسیرهای پرکاربرد، محدود به نقش کاربر
 *
 * قواعد رعایت‌شده: توکن‌only (بدون hex)، فقط logical properties، mobile-first،
 * انیمیشن فقط روی opacity/transform، بدون emoji، بدون glass تزئینی،
 * بدون reduced-motion محلی (سراسری در tokens.css کلمپ شده).
 *
 * زمان از سرور تزریق می‌شود (`serverNow`) تا رندر سرور و کلاینت یکی باشد و
 * hydration mismatch ساعت/«چند دقیقه پیش» از بین برود.
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
  Users,
  Wallet,
} from 'lucide-react';
import Link from 'next/link';
import type React from 'react';
import { useState } from 'react';
import s from './FintechCockpit.module.css';

// ─── Types ────────────────────────────────────────────────────────────────

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

const TrendGlyph = ({ trend }: { trend: Trend }) =>
  trend === 'up' ? (
    <TrendingUp size={13} strokeWidth={1.75} />
  ) : trend === 'down' ? (
    <TrendingDown size={13} strokeWidth={1.75} />
  ) : (
    <Minus size={13} strokeWidth={1.75} />
  );

const ago = (value: string | Date | number, now: number): string => {
  const minutes = Math.max(0, Math.floor((now - new Date(value).getTime()) / 60_000));
  if (minutes < 1) return 'همین حالا';
  if (minutes < 60) return `${fa.format(minutes)} دقیقه پیش`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${fa.format(hours)} ساعت پیش`;
  return `${fa.format(Math.floor(hours / 24))} روز پیش`;
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
  { href: '/dashboard/exchanges', label: 'صرافی‌ها', hint: 'اعضا و نقش‌ها', icon: Landmark, roles: ADMINS },
  { href: '/dashboard/exchange-rates', label: 'نرخ ارز', hint: 'بازار زنده', icon: Coins, roles: ALL },
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
  { href: '/dashboard/audit-log', label: 'دفتر رویداد', hint: 'ردپای سیستم', icon: ScrollText, roles: ADMINS },
  { href: '/dashboard/helpdesk', label: 'پشتیبانی', hint: 'تیکت‌های باز', icon: LifeBuoy, roles: ALL },
  { href: '/dashboard/posts', label: 'نوشته‌ها', hint: 'تحریریه', icon: FileText, roles: ALL },
];

// ─── Shared bits ──────────────────────────────────────────────────────────

function Rule({
  index,
  title,
  note,
  action,
}: {
  index: string;
  title: string;
  note?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className={s.rule}>
      <span className={s.ruleIndex} aria-hidden="true" dir="ltr">
        {index}
      </span>
      <h2 className={s.ruleTitle}>{title}</h2>
      <span className={s.ruleLine} aria-hidden="true" />
      {note ? <span className={s.ruleNote}>{note}</span> : null}
      {action}
    </div>
  );
}

function More({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className={s.more}>
      {children}
      <ArrowLeft size={14} strokeWidth={1.75} />
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
          <ArrowLeft size={14} strokeWidth={1.75} />
        </Link>
      ) : null}
    </div>
  );
}

// ─── 1. Masthead ──────────────────────────────────────────────────────────

function Masthead({
  userName,
  now,
  stats,
  kpi,
  health,
}: {
  userName: string;
  now: number;
  stats: FintechCockpitServiceStats;
  kpi: FintechCockpitProps['kpi'];
  health: number | null;
}) {
  const hour = new Date(now).getHours();
  const greeting =
    hour < 5 ? 'شب بخیر' : hour < 12 ? 'صبح بخیر' : hour < 17 ? 'ظهر بخیر' : hour < 21 ? 'عصر بخیر' : 'شب بخیر';

  const facts: string[] = [];
  if (stats.pending > 0) facts.push(`${fa.format(stats.pending)} درخواست در صف`);
  if (stats.pendingUrgent > 0) facts.push(`${fa.format(stats.pendingUrgent)} فوری`);
  if (kpi.openFraudCases > 0) facts.push(`${fa.format(kpi.openFraudCases)} پرونده‌ی ریسک باز`);
  if (stats.todayCount > 0) facts.push(`${fa.format(stats.todayCount)} ثبت امروز`);

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
        </p>
        <h1 className={s.greeting}>
          {greeting}، <em>{userName || 'مدیر'}</em>
        </h1>
        <p className={s.runIn}>
          {facts.length > 0 ? facts.join(' · ') : 'هیچ موردی منتظر تصمیم تو نیست. میز تمیز است.'}
        </p>
      </div>

      <dl className={s.mastheadMeta}>
        <div>
          <dt>تاریخ</dt>
          <dd>{jalali(now)}</dd>
        </div>
        <div>
          <dt>سلامت سرویس</dt>
          <dd aria-live="polite">
            {health === null ? 'بدون سنجه' : `${fa.format(health)}٪ سالم`}
          </dd>
        </div>
        <div>
          <dt>مشتری فعال</dt>
          <dd>{fa.format(kpi.activeCustomers)}</dd>
        </div>
      </dl>

      <span className={s.breath} aria-hidden="true">
        <i />
      </span>
    </header>
  );
}

// ─── 2. Market tape ───────────────────────────────────────────────────────

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
              <span className={`${s.tapeDelta} ${s[`trend_${trend}`]}`}>
                <TrendGlyph trend={trend} />
                {trend === 'flat' ? 'ثابت' : `${fa1.format(Math.abs(rate.changePercent))}٪`}
                <small>{UNIT_LABELS[rate.unit] ?? rate.unit}</small>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

// ─── 3. Pulse (24h SVG + 14d columns) ─────────────────────────────────────

function Pulse({
  bars,
  insights,
  now,
}: {
  bars: number[];
  insights?: CockpitInsights;
  now: number;
}) {
  const series = bars.length > 1 ? bars : new Array(24).fill(0);
  const count = series.length;
  const peak = Math.max(...series);
  const peakIndex = series.indexOf(peak);
  const hasSignal = peak > 0;

  const coords = series
    .map((value, index) => {
      const x = (index / (count - 1)) * 100;
      const y = 96 - Math.max(0, Math.min(100, value)) * 0.9;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');

  const trend = insights?.txnTrend ?? [];
  const trendMax = Math.max(...trend, 1);
  const txnDelta = insights ? deltaOf(insights.txn24h, insights.txnPrev24h) : null;

  const hourLabel = (index: number) =>
    new Date(now - (count - 1 - index) * HOUR).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    });

  const dayLabel = (index: number) =>
    new Date(now - (trend.length - 1 - index) * DAY).toLocaleDateString('fa-IR', {
      day: 'numeric',
      month: 'short',
    });

  return (
    <section className={s.pulse} aria-label="نبض پلتفرم">
      <Rule
        index="01"
        title="نبض پلتفرم"
        note={hasSignal ? `اوج در ${hourLabel(peakIndex)}` : 'بدون رویداد ثبت‌شده'}
        action={<More href="/dashboard/audit-log">دفتر رویداد</More>}
      />

      {hasSignal ? (
        <div className={s.chart} dir="ltr">
          <svg
            className={s.chartSvg}
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            role="img"
            aria-label={`فعالیت ۲۴ ساعت گذشته، بیشترین شدت در ساعت ${hourLabel(peakIndex)}`}
          >
            <line className={s.chartGrid} x1="0" y1="32" x2="100" y2="32" vectorEffect="non-scaling-stroke" />
            <line className={s.chartGrid} x1="0" y1="64" x2="100" y2="64" vectorEffect="non-scaling-stroke" />
            <polygon className={s.chartArea} points={`0,100 ${coords} 100,100`} />
            <polyline className={s.chartLine} points={coords} vectorEffect="non-scaling-stroke" />
          </svg>
          <div className={s.chartHours} aria-hidden="true">
            {series.map((value, index) => (
              <span
                key={`h${index}-${value}`}
                data-label={`${hourLabel(index)} · ${fa.format(value)}`}
              />
            ))}
          </div>
        </div>
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
                <small>نسبت به ۲۴ ساعت قبل</small>
              </span>
            ) : null}
            <span className={s.trendPeak} dir="ltr">
              {fa.format(trendMax)}
            </span>
          </div>
          <ol className={s.trendBars} dir="ltr">
            {trend.map((value, index) => (
              <li key={`d${index}-${value}`} data-label={`${dayLabel(index)} · ${fa.format(value)}`}>
                <i style={{ blockSize: `${Math.max(2, (value / trendMax) * 100)}%` }} />
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </section>
  );
}

// ─── 4. Decision ledger ───────────────────────────────────────────────────

function Ledger({
  recent,
  stats,
  now,
}: {
  recent: FintechCockpitService[];
  stats: FintechCockpitServiceStats;
  now: number;
}) {
  return (
    <section className={s.ledgerWrap} aria-label="صف تصمیم">
      <Rule
        index="02"
        title="صف تصمیم"
        note={`${fa.format(stats.pending)} در انتظار · ${fa.format(stats.todayCount)} امروز`}
        action={<More href="/dashboard/service-requests">همه‌ی درخواست‌ها</More>}
      />

      {recent.length > 0 ? (
        <ol className={s.ledger}>
          {recent.map((item, index) => {
            const urgent = item.urgency === 'URGENT';
            return (
              <li key={item.id}>
                <Link href="/dashboard/service-requests" className={s.row}>
                  <span className={s.rowIndex} aria-hidden="true" dir="ltr">
                    {String(index + 1).padStart(2, '0')}
                  </span>

                  <span className={s.rowBody}>
                    <strong>{item.fullName || 'بدون نام'}</strong>
                    <small>
                      {SERVICE_LABELS[item.serviceType] ?? item.serviceType}
                      <span className={s.dotSep} aria-hidden="true" />
                      <span dir="ltr" className={s.mono}>
                        {item.trackingCode}
                      </span>
                    </small>
                  </span>

                  <span className={s.rowSide}>
                    <b dir="ltr" className={s.mono}>
                      {item.amount} {item.currency}
                    </b>
                    <span className={s.rowTags}>
                      {urgent ? (
                        <span className={`${s.tag} ${s.tagUrgent}`}>
                          <ShieldAlert size={12} strokeWidth={2} />
                          فوری
                        </span>
                      ) : (
                        <span className={s.tag}>{STATUS_LABELS[item.status] ?? item.status}</span>
                      )}
                      <time dateTime={new Date(item.createdAt).toISOString()}>
                        {ago(item.createdAt, now)}
                      </time>
                    </span>
                  </span>

                  <ArrowLeft size={15} strokeWidth={1.75} className={s.rowGo} aria-hidden="true" />
                </Link>
              </li>
            );
          })}
        </ol>
      ) : (
        <Blank
          icon={CheckCircle2}
          title="صف خالی است"
          body="هیچ درخواست خدماتی منتظر تصمیم نیست. تاریخچه‌ی کامل در مرکز درخواست‌ها باقی است."
          href="/dashboard/service-requests"
          cta="مرور تاریخچه"
        />
      )}
    </section>
  );
}

// ─── 5. Posture rail ──────────────────────────────────────────────────────

function Posture({
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
        stats.pendingUrgent > 0
          ? `${fa.format(stats.pendingUrgent)} مورد فوری`
          : 'بدون مورد فوری',
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
      note: txnDelta ? txnDelta.label : 'بدون مقایسه',
      href: '/dashboard/audit-log',
      trend: txnDelta?.trend,
    },
    {
      label: `حجم معاملات ۷ روز (${insights?.volumeCurrency ?? kpi.dealsCurrency})`,
      value: compact(insights?.volume7d ?? kpi.dealsVolume),
      note: volumeDelta ? volumeDelta.label : 'بدون مقایسه',
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
    <section className={s.postureWrap} aria-label="وضعیت کلی">
      <Rule index="03" title="خوانش وضعیت" />
      <div className={s.posture}>
        {rows.map((row) => (
          <Link
            key={row.label}
            href={row.href}
            className={`${s.postureRow} ${row.lead ? s.postureLead : ''}`}
          >
            <span className={s.postureLabel}>{row.label}</span>
            <strong className={`${s.postureValue} ${row.tone ? s[`tone_${row.tone}`] : ''}`}>
              {row.value}
            </strong>
            <span className={`${s.postureNote} ${row.trend ? s[`trend_${row.trend}`] : ''}`}>
              {row.trend ? <TrendGlyph trend={row.trend} /> : null}
              {row.note}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

// ─── 6. Systems ───────────────────────────────────────────────────────────

function Systems({ services }: { services: FintechCockpitLiveService[] }) {
  if (services.length === 0) return null;

  return (
    <section className={s.systemsWrap} aria-label="سلامت سرویس‌ها">
      <Rule index="04" title="سرویس‌ها" />
      <ul className={s.systems}>
        {services.map((service) => (
          <li key={service.id} className={s.sysRow}>
            <span
              className={`${s.glyph} ${s[`glyph_${service.status}`]}`}
              aria-hidden="true"
            />
            <span className={s.sysName}>{service.name}</span>
            <span className={s.sysState}>{SERVICE_HEALTH[service.status]}</span>
            <span className={s.sysLatency} dir="ltr">
              {service.latencyMs == null ? '—' : `${Math.round(service.latencyMs)}ms`}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ─── 7. Event timeline ────────────────────────────────────────────────────

function Events({ events, now }: { events: FintechCockpitLiveEvent[]; now: number }) {
  return (
    <section className={s.eventsWrap} aria-label="رویدادهای اخیر">
      <Rule index="05" title="رویدادها" action={<More href="/dashboard/audit-log">همه</More>} />
      {events.length > 0 ? (
        <ol className={s.events}>
          {events.slice(0, 6).map((event) => {
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
                <time dateTime={new Date(event.timestamp).toISOString()}>
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
    </section>
  );
}

// ─── 8. Pipelines ─────────────────────────────────────────────────────────

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
        <h3>{title}</h3>
        <Link href={href} className={s.pipeTotal}>
          {fa.format(total)}
          <ArrowLeft size={13} strokeWidth={1.75} />
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
                <span className={`${s.dot} ${s[`seg_${toneFor(segment.key)}`]}`} aria-hidden="true" />
                <span className={s.legendLabel}>{labelFor(segment.key)}</span>
                <b>{fa.format(segment.count)}</b>
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
    <section className={s.pipesWrap} aria-label="قیف‌های عملیاتی">
      <Rule index="06" title="قیف‌های عملیاتی" note="سهم هر وضعیت از کل رکوردها" />
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
          <ul>
            {insights.pendingByService.map((segment) => (
              <li key={segment.key}>
                <span>{SERVICE_LABELS[segment.key] ?? segment.key}</span>
                <b>{fa.format(segment.count)}</b>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

// ─── 9. Routes ────────────────────────────────────────────────────────────

function Routes({ userRole }: { userRole: Role }) {
  const allowed = ROUTES.filter((route) => route.roles.includes(userRole));
  if (allowed.length === 0) return null;

  return (
    <section className={s.routesWrap} aria-label="مسیرهای پرکاربرد">
      <Rule index="07" title="مسیرها" />
      <nav className={s.routes}>
        {allowed.map(({ href, label, hint, icon: Icon }) => (
          <Link key={href} href={href} className={s.route}>
            <Icon size={17} strokeWidth={1.5} aria-hidden="true" />
            <span>
              <b>{label}</b>
              <small>{hint}</small>
            </span>
            <ArrowLeft size={14} strokeWidth={1.75} aria-hidden="true" />
          </Link>
        ))}
      </nav>
    </section>
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

  return (
    <div className={s.sheet} dir="rtl">
      <Masthead userName={userName} now={now} stats={services.stats} kpi={kpi} health={health} />

      <Tape rates={rates ?? []} />

      <div className={s.split}>
        <div className={s.track}>
          <Pulse bars={live.activityBars} insights={insights} now={now} />
          <Ledger recent={services.recent} stats={services.stats} now={now} />
        </div>

        <aside className={s.rail}>
          <Posture kpi={kpi} stats={services.stats} insights={insights} />
          <Systems services={live.services} />
          <Events events={live.events} now={now} />
        </aside>
      </div>

      {insights ? <Pipelines insights={insights} /> : null}

      <Routes userRole={userRole} />

      {editorial ? <div className={s.editorial}>{editorial}</div> : null}
    </div>
  );
}

export default FintechCockpit;
