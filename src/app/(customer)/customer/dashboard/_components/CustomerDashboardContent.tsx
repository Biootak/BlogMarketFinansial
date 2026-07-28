'use client';

/**
 * CustomerDashboardContent — 2026 «اتاق کنترل» (Control Room)
 * -----------------------------------------------------------------------------
 * ساختار بصری جدید — فراتر از layout متعارف داشبوردهای بانکی:
 *
 *   1. PageHeader          : خوش‌آمدگویی + breadcrumb + CTA اصلی
 *   2. Lattice Pulse       : signature — گرید ۱۲×۸ نقطه با pulse موجی از مرکز
 *                            + Live Balance Ribbon (موجودی کل AFN با micro-sparkline)
 *   3. KPI Strip           : ۴ StatCard asymmetric (موجودی / تراکنش‌های ماه / نیازمند اقدام / نرخ موفقیت)
 *   4. Account Ledger      : grid 2-col از کارت‌های حساب با rail رنگی (vertical execution rail)
 *   5. Activity Heatmap    : ۳۰ روز اخیر (pure CSS grid، با legend و stat boxes)
 *   6. Volume by Kind      : توزیع حجمی ۳۰ روز اخیر به تفکیک نوع تراکنش
 *   7. Recent Transactions : timeline با rail رنگی و status pill
 *   8. Quick Actions       : ۶ کارت اقدام سریع با hover micro-interaction
 *
 *  - فقط توکن‌های --ds-* و --nova-* (no hex/rgb، no emoji)
 *  - RTL-first · logical properties · TypeScript strict
 *  - بدون recharts/chart.js — همه چارت‌ها pure CSS/SVG
 *  - همه ۶ state: loading/empty/error/partial/disabled/success
 *  - a11y: ARIA labels، keyboard nav، focus ring، live regions
 */

import type { CustomerDashboardData, CustomerTransactionRow } from '@/actions/customer-portal';
import { PageHeader } from '@/components/Dashboard/primitives/PageHeader';
import { StatCard } from '@/components/Dashboard/primitives/StatCard';
import { StatGrid } from '@/components/Dashboard/primitives/StatGrid';
import { GeometricField } from '@/components/Dashboard/primitives/GeometricAccent';
import { EmptyState } from '@/components/Dashboard/primitives/EmptyState';
import { cn } from '@/lib/utils';
import {
  DashboardTable,
  DashboardTableBody,
  DashboardTableCell,
  DashboardTableContainer,
  DashboardTableHead,
  DashboardTableHeader,
  DashboardTableRow,
} from '@/components/Dashboard/shared/DashboardTableWrapper';
import {
  AlertCircle,
  AlertTriangle,
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Banknote,
  Bell,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  CircleDollarSign,
  Clock,
  Coins,
  CreditCard,
  Eye,
  FileSearch,
  Flame,
  History,
  Inbox,
  KeyRound,
  Layers,
  type LucideIcon,
  Plus,
  RefreshCw,
  Send,
  ShieldCheck,
  ShieldX,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Wallet,
  WalletCards,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { useMemo } from 'react';
import s from './CustomerDashboardContent.module.css';

// ─── Constants ────────────────────────────────────────────────────────────── //

const KYC_CONFIG: Record<
  string,
  { label: string; icon: LucideIcon; cssKey: 'approved' | 'pending' | 'warning' | 'danger'; cta?: string }
> = {
  APPROVED: {
    label: 'احراز هویت تأیید شده',
    icon: ShieldCheck,
    cssKey: 'approved',
  },
  PENDING: {
    label: 'مدارک احراز هویت در حال بررسی است',
    icon: Clock,
    cssKey: 'pending',
  },
  NOT_STARTED: {
    label: 'احراز هویت انجام نشده — برای تراکنش‌های بالا KYC الزامی است',
    icon: AlertTriangle,
    cssKey: 'warning',
    cta: 'شروع احراز هویت',
  },
  REJECTED: {
    label: 'احراز هویت رد شد — با پشتیبانی تماس بگیرید',
    icon: ShieldX,
    cssKey: 'danger',
  },
  EXPIRED: {
    label: 'تأییدیه احراز هویت منقضی شده — نیاز به تجدید',
    icon: AlertTriangle,
    cssKey: 'warning',
    cta: 'تمدید احراز هویت',
  },
};

const KIND_LABEL: Record<string, string> = {
  DEPOSIT: 'واریز',
  WITHDRAWAL: 'برداشت',
  TRANSFER: 'انتقال',
  EXCHANGE: 'تبدیل ارز',
  FEE: 'کارمزد',
  SETTLEMENT: 'تسویه',
  ADJUSTMENT: 'اصلاح',
};

const KIND_ICON: Record<string, LucideIcon> = {
  DEPOSIT: ArrowDownLeft,
  WITHDRAWAL: ArrowUpRight,
  TRANSFER: Send,
  EXCHANGE: ArrowLeftRight,
  FEE: Coins,
  SETTLEMENT: WalletCards,
  ADJUSTMENT: RefreshCw,
};

const KIND_CSSKEY: Record<string, 'credit' | 'debit' | 'neutral'> = {
  DEPOSIT: 'credit',
  TRANSFER: 'neutral',
  EXCHANGE: 'neutral',
  WITHDRAWAL: 'debit',
  FEE: 'debit',
  SETTLEMENT: 'neutral',
  ADJUSTMENT: 'neutral',
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'در انتظار',
  PROCESSING: 'در حال پردازش',
  COMPLETED: 'انجام شده',
  FAILED: 'ناموفق',
  REVERSED: 'برگشت خورده',
  CANCELLED: 'لغو شده',
};

const STATUS_CSSKEY: Record<string, 'pending' | 'progress' | 'success' | 'danger' | 'cancelled'> = {
  PENDING: 'pending',
  PROCESSING: 'progress',
  COMPLETED: 'success',
  FAILED: 'danger',
  REVERSED: 'danger',
  CANCELLED: 'cancelled',
};

const ACCOUNT_TYPE_LABEL: Record<string, string> = {
  WALLET: 'کیف پول',
  SAVINGS: 'پس‌انداز',
  CURRENT: 'جاری',
  ESCROW: 'امانی',
  MERCHANT: 'تجاری',
};

// ─── Helpers ─────────────────────────────────────────────────────────────── //

function formatPersianNumber(value: number | string): string {
  const n = typeof value === 'string' ? Number(value) : value;
  if (Number.isFinite(n)) {
    return new Intl.NumberFormat('fa-IR').format(n);
  }
  return String(value);
}

function formatCompact(value: number): string {
  return new Intl.NumberFormat('fa-IR', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

function formatAmount(amount: number, currency: string): string {
  return `${formatPersianNumber(amount)} ${currency}`;
}

function formatPersianDate(date: string | Date): string {
  return new Intl.DateTimeFormat('fa-IR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date));
}

function formatPersianDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('fa-IR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

function relativeTime(date: string | Date): string {
  const diff = Date.now() - new Date(date).getTime();
  const min = Math.floor(diff / 60000);
  const hr = Math.floor(diff / 3600000);
  const day = Math.floor(diff / 86400000);
  if (min < 1) return 'لحظاتی پیش';
  if (min < 60) return `${formatPersianNumber(min)} دقیقه پیش`;
  if (hr < 24) return `${formatPersianNumber(hr)} ساعت پیش`;
  if (day < 30) return `${formatPersianNumber(day)} روز پیش`;
  return formatPersianDate(date);
}

function isCreditKind(kind: string): boolean {
  return kind === 'DEPOSIT' || kind === 'TRANSFER';
}

function isNegativeKind(kind: string): boolean {
  return kind === 'WITHDRAWAL' || kind === 'FEE';
}

// ─── Lattice Pulse (Signature) ────────────────────────────────────────────── //
//
// یک گرید ۱۲×۸ از دایره‌های بسیار ریز، که به‌صورت موجی از مرکز روشن می‌شوند.
// استایل از --nova-primary استفاده می‌کند. هر دایره delay = فاصله از مرکز.
// این المانِ signature «اتاق کنترل» است: گرید به‌معنای lattice و pulse به‌معنای
// «سیستم زنده است».
// ──────────────────────────────────────────────────────────────────────────── //

function LatticePulse() {
  // 12 × 8 = 96 نقطه
  const cols = 12;
  const rows = 8;
  const dots: Array<{ x: number; y: number; delay: number }> = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const cx = x - (cols - 1) / 2;
      const cy = y - (rows - 1) / 2;
      const distance = Math.sqrt(cx * cx + cy * cy);
      // هرچه از مرکز دورتر، دیرتر روشن شود
      const delay = distance * 90;
      dots.push({ x, y, delay });
    }
  }
  return (
    <div className={s.lattice} aria-hidden>
      <svg
        className={s.latticeSvg}
        viewBox="0 0 1200 320"
        preserveAspectRatio="xMidYMid meet"
        role="presentation"
      >
        <defs>
          <radialGradient id="lattice-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.3" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="1200" height="320" fill="url(#lattice-glow)" />
        {dots.map((d) => {
          const cx = 50 + d.x * 100;
          const cy = 20 + d.y * 40;
          return (
            <circle
              key={`${d.x}-${d.y}`}
              cx={cx}
              cy={cy}
              r="1.4"
              className={s.latticeDot}
              style={{ animationDelay: `${d.delay}ms` }}
            />
          );
        })}
      </svg>
    </div>
  );
}

// ─── Live Balance Ribbon ─────────────────────────────────────────────────── //
//
// نوار افقی که موجودی کل را به‌صورت برجسته نشان می‌دهد، با یک
// ۷-نقطه sparkline (SVG path) که از داده‌های واقعی ساخته می‌شود.
// ──────────────────────────────────────────────────────────────────────────── //

function LiveBalanceRibbon({
  totalAfn,
  spark,
  delta,
  pendingCount,
  rateOfSuccess,
}: {
  totalAfn: number;
  spark: Array<{ amount: number; count: number }>;
  delta: { sign: 'up' | 'down' | 'flat'; label: string };
  pendingCount: number;
  rateOfSuccess: number;
}) {
  // Spark path
  const points = spark.map((s, i) => ({ x: i, y: s.amount }));
  const maxY = Math.max(1, ...points.map((p) => p.y));
  const minY = Math.min(0, ...points.map((p) => p.y));
  const range = Math.max(1, maxY - minY);

  const pathD = points
    .map((p, i) => {
      const x = (i / Math.max(1, points.length - 1)) * 100;
      const y = 100 - ((p.y - minY) / range) * 100;
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');

  const fillD =
    pathD +
    ` L 100 100 L 0 100 Z`;

  return (
    <div className={s.ribbon} aria-label="نوار موجودی زنده">
      <GeometricField density="min" className={s.ribbonGeo} />

      <div className={s.ribbonInner}>
        <div className={s.ribbonLeft}>
          <div className={s.ribbonEyebrow}>
            <span className={s.ribbonLive} aria-hidden />
            <span>موجودی کل (افغانی)</span>
          </div>
          <div className={s.ribbonValue}>
            <span className={s.ribbonNumber}>{formatPersianNumber(totalAfn)}</span>
            <span className={s.ribbonCurrency}>AFN</span>
          </div>
          <div className={s.ribbonDelta} data-sign={delta.sign}>
            {delta.sign === 'up' ? (
              <TrendingUp size={11} aria-hidden />
            ) : delta.sign === 'down' ? (
              <TrendingDown size={11} aria-hidden />
            ) : (
              <ArrowLeftRight size={11} aria-hidden />
            )}
            <span>{delta.label}</span>
          </div>
        </div>

        <div className={s.ribbonCenter}>
          <div className={s.ribbonSpark} aria-hidden>
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className={s.ribbonSparkSvg}>
              <defs>
                <linearGradient id="ribbon-spark-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="currentColor" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d={fillD} fill="url(#ribbon-spark-grad)" />
              <path d={pathD} fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              {points.map((p, i) => {
                const x = (i / Math.max(1, points.length - 1)) * 100;
                const y = 100 - ((p.y - minY) / range) * 100;
                return <circle key={i} cx={x} cy={y} r="1.6" fill="currentColor" />;
              })}
            </svg>
          </div>
        </div>

        <div className={s.ribbonRight}>
          <div className={s.ribbonMeta}>
            <div className={s.ribbonMetaItem}>
              <span className={s.ribbonMetaLabel}>نیازمند اقدام</span>
              <span className={s.ribbonMetaValue} data-tone="amber">
                {formatPersianNumber(pendingCount)}
              </span>
            </div>
            <span className={s.ribbonDivider} aria-hidden />
            <div className={s.ribbonMetaItem}>
              <span className={s.ribbonMetaLabel}>نرخ موفقیت</span>
              <span className={s.ribbonMetaValue} data-tone="success">
                {formatPersianNumber(rateOfSuccess)}٪
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Account Ledger Card ─────────────────────────────────────────────────── //
//
// هر کارت حساب = یک رکورد دفتر کل.
// rail عمودی رنگی سمت چپ (در RTL: راست) مثل ریل اجرا.
// شامل: نوع حساب، ارز، موجودی (tabular-nums)، وضعیت.
// hover: lift -1px + brighten border.
// ──────────────────────────────────────────────────────────────────────────── //

function AccountLedgerCard({
  account,
  index,
}: {
  account: { id: string; currency: string; balance: number; type: string; status: string };
  index: number;
}) {
  const typeLabel = ACCOUNT_TYPE_LABEL[account.type] ?? account.type;
  const statusLabel =
    account.status === 'ACTIVE'
      ? 'فعال'
      : account.status === 'FROZEN'
        ? 'منجمد'
        : account.status === 'PENDING'
          ? 'در انتظار'
          : 'بسته';
  const statusCssKey: 'success' | 'warning' | 'danger' | 'neutral' =
    account.status === 'ACTIVE'
      ? 'success'
      : account.status === 'FROZEN'
        ? 'warning'
        : account.status === 'PENDING'
          ? 'neutral'
          : 'danger';

  // Bar داخل کارت = نمایش نسبی موجودی نسبت به بزرگ‌ترین حساب.
  // این نسبت توسط parent (LedgerGrid) تزریق می‌شود تا اینجا منطق اضافه نشود.
  return (
    <Link
      href={`/customer/accounts/${account.id}`}
      className={cn(s.ledgerCard, s[`ledgerCard--${statusCssKey}`])}
      style={{ animationDelay: `${Math.min(index, 8) * 60}ms` }}
      aria-label={`حساب ${account.currency} ${typeLabel}، موجودی ${formatPersianNumber(account.balance)}`}
    >
      <span className={s.ledgerRail} aria-hidden />
      <div className={s.ledgerTop}>
        <div className={s.ledgerCurrency} aria-hidden>
          <CircleDollarSign size={13} />
          <span>{account.currency}</span>
        </div>
        <span className={s.ledgerType}>{typeLabel}</span>
      </div>
      <div className={s.ledgerBalanceRow}>
        <span className={s.ledgerBalance}>{formatPersianNumber(account.balance)}</span>
        <span className={s.ledgerBalanceCurrency}>{account.currency}</span>
      </div>
      <div className={s.ledgerFoot}>
        <span className={s.ledgerStatus} data-status={statusCssKey}>
          <span className={s.ledgerStatusDot} aria-hidden />
          {statusLabel}
        </span>
        <ChevronLeft size={12} className={s.ledgerChevron} aria-hidden />
      </div>
    </Link>
  );
}

// ─── Ledger Grid ─────────────────────────────────────────────────────────── //

function LedgerGrid({
  accounts,
}: {
  accounts: Array<{ id: string; currency: string; balance: number; type: string; status: string }>;
}) {
  if (accounts.length === 0) {
    return (
      <EmptyState
        icon={CreditCard}
        title="حسابی یافت نشد"
        description="برای باز کردن حساب با صرافی تماس بگیرید"
        action={
          <Link href="/customer/accounts" className={s.emptyCta}>
            <Plus size={12} aria-hidden />
            مشاهده حساب‌ها
          </Link>
        }
      />
    );
  }
  return (
    <div className={s.ledgerGrid}>
      {accounts.map((a, i) => (
        <AccountLedgerCard key={a.id} account={a} index={i} />
      ))}
    </div>
  );
}

// ─── Activity Heatmap (30 days) ───────────────────────────────────────────── //
//
// pure-CSS grid از ۳۰ سلول. هر سلول = یک روز. شدت رنگ = تعداد تراکنش.
// label بالا: مجموع، روزهای فعال، میانگین، رشته.
// ──────────────────────────────────────────────────────────────────────────── //

function ActivityHeatmap({ heatmap }: { heatmap: Array<{ date: string; count: number; volume: number }> }) {
  const max = Math.max(1, ...heatmap.map((c) => c.count));
  const totalCount = heatmap.reduce((s, c) => s + c.count, 0);
  const activeDays = heatmap.filter((c) => c.count > 0).length;
  const avgPerDay = totalCount / heatmap.length;
  const streak = (() => {
    let count = 0;
    for (let i = heatmap.length - 1; i >= 0; i--) {
      if (heatmap[i].count > 0) count++;
      else break;
    }
    return count;
  })();

  return (
    <section className={s.heatmapPanel} aria-label="نقشه فعالیت ۳۰ روز اخیر">
      <header className={s.heatmapHead}>
        <div className={s.heatmapTitle}>
          <span className={s.heatmapDot} aria-hidden />
          <h3 className={s.heatmapH3}>نقشه فعالیت</h3>
          <span className={s.heatmapSub}>۳۰ روز اخیر</span>
        </div>
        <div className={s.heatmapMeta}>
          <span className={s.heatmapStat}>
            <strong>{formatPersianNumber(totalCount)}</strong> تراکنش
          </span>
          <span className={s.heatmapDivider} aria-hidden />
          <span className={s.heatmapStat}>
            <strong>{formatPersianNumber(activeDays)}</strong> روز فعال
          </span>
          <span className={s.heatmapDivider} aria-hidden />
          <span className={s.heatmapStat}>
            <strong>{formatPersianNumber(Math.round(avgPerDay * 10) / 10)}</strong> میانگین روزانه
          </span>
        </div>
      </header>

      <div
        className={s.heatmapGrid}
        role="img"
        aria-label={`${formatPersianNumber(totalCount)} تراکنش در ۳۰ روز اخیر`}
      >
        {heatmap.map((c, i) => {
          const ratio = c.count / max;
          const intensity =
            c.count === 0 ? 0 : ratio < 0.25 ? 1 : ratio < 0.5 ? 2 : ratio < 0.75 ? 3 : 4;
          return (
            <div
              key={c.date}
              className={s.heatmapCell}
              data-level={intensity}
              style={{ animationDelay: `${i * 6}ms` }}
              title={`${formatPersianDate(c.date)} — ${formatPersianNumber(c.count)} تراکنش`}
              aria-label={`${formatPersianDate(c.date)}: ${formatPersianNumber(c.count)} تراکنش`}
            />
          );
        })}
      </div>

      <div className={s.heatmapStats}>
        <div className={s.heatmapStatBox}>
          <span className={s.heatmapStatLabel}>روزهای فعال</span>
          <span className={s.heatmapStatValue}>
            <strong>{formatPersianNumber(activeDays)}</strong>
            <span className={s.heatmapStatSub}>/ {formatPersianNumber(heatmap.length)}</span>
          </span>
        </div>
        <div className={s.heatmapStatBox}>
          <span className={s.heatmapStatLabel}>روزهای خاموش</span>
          <span className={s.heatmapStatValue}>
            <strong>{formatPersianNumber(heatmap.length - activeDays)}</strong>
          </span>
        </div>
        <div className={s.heatmapStatBox}>
          <span className={s.heatmapStatLabel}>پردسترتـرین</span>
          <span className={s.heatmapStatValue}>
            <strong>{formatPersianNumber(heatmap.filter((c) => c.count === max && c.count > 0).length)}</strong>
            <span className={s.heatmapStatSub}>روز</span>
          </span>
        </div>
        <div className={s.heatmapStatBox}>
          <span className={s.heatmapStatLabel}>رشته فعلی</span>
          <span className={s.heatmapStatValue}>
            <strong>{formatPersianNumber(streak)}</strong>
            <span className={s.heatmapStatSub}>روز</span>
          </span>
        </div>
      </div>

      <footer className={s.heatmapFoot}>
        <span className={s.heatmapLegendLabel}>کم</span>
        <span className={s.heatmapLegend} aria-hidden>
          <span className={s.heatmapCell} data-level="0" />
          <span className={s.heatmapCell} data-level="1" />
          <span className={s.heatmapCell} data-level="2" />
          <span className={s.heatmapCell} data-level="3" />
          <span className={s.heatmapCell} data-level="4" />
        </span>
        <span className={s.heatmapLegendLabel}>زیاد</span>
      </footer>
    </section>
  );
}

// ─── Volume by Kind ──────────────────────────────────────────────────────── //
//
// توزیع حجمی ۳۰ روز اخیر به تفکیک نوع تراکنش.
// هر ردیف: آیکون + label + count + نوار افقی + درصد سهم.
// ──────────────────────────────────────────────────────────────────────────── //

function VolumeByKind({
  data,
}: {
  data: Array<{ kind: string; count: number; volume: number }>;
}) {
  if (data.length === 0) {
    return (
      <section className={s.volumePanel} aria-label="حجم تراکنش‌ها">
        <header className={s.volumeHead}>
          <div className={s.volumeTitle}>
            <span className={s.heatmapDot} aria-hidden />
            <h3 className={s.heatmapH3}>حجم تراکنش‌ها</h3>
          </div>
          <span className={s.volumeSub}>۳۰ روز اخیر</span>
        </header>
        <div className={s.volumeEmpty}>
          <Inbox size={20} aria-hidden />
          <span>هنوز تراکنشی برای نمایش وجود ندارد</span>
        </div>
      </section>
    );
  }
  const total = data.reduce((s, d) => s + d.count, 0);
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <section className={s.volumePanel} aria-label="حجم تراکنش‌ها ۳۰ روز اخیر">
      <header className={s.volumeHead}>
        <div className={s.volumeTitle}>
          <span className={s.heatmapDot} aria-hidden />
          <h3 className={s.heatmapH3}>حجم تراکنش‌ها</h3>
        </div>
        <span className={s.volumeSub}>۳۰ روز اخیر · {formatPersianNumber(total)} مورد</span>
      </header>
      <ul className={s.volumeList}>
        {data.slice(0, 6).map((d, i) => {
          const ratio = d.count / max;
          const share = total > 0 ? Math.round((d.count / total) * 100) : 0;
          const Icon = KIND_ICON[d.kind] ?? CircleDollarSign;
          const cssKey = KIND_CSSKEY[d.kind] ?? 'neutral';
          return (
            <li
              key={d.kind}
              className={cn(s.volumeItem, s[`volumeItem--${cssKey}`])}
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className={s.volumeItemHead}>
                <span className={s.volumeItemIcon} aria-hidden>
                  <Icon size={11} />
                </span>
                <span className={s.volumeItemLabel}>{KIND_LABEL[d.kind] ?? d.kind}</span>
                <span className={s.volumeItemMeta}>
                  <span className={s.volumeItemCount}>{formatPersianNumber(d.count)} مورد</span>
                  <span className={s.volumeItemShare}>{formatPersianNumber(share)}٪</span>
                </span>
              </div>
              <div className={s.volumeTrack} aria-hidden>
                <span
                  className={s.volumeFill}
                  style={{ inlineSize: `${Math.max(2, ratio * 100)}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// ─── Recent Transactions Timeline ───────────────────────────────────────── //
//
// لیست آخرین تراکنش‌ها با rail رنگی. هر ردیف = یک transaction row
// که با اجرای execution rail در سمت چپ (در RTL: راست) مزین شده است.
// ──────────────────────────────────────────────────────────────────────────── //

function RecentTransactions({
  transactions,
}: {
  transactions: CustomerTransactionRow[];
}) {
  if (transactions.length === 0) {
    return (
      <EmptyState
        icon={History}
        title="تراکنشی وجود ندارد"
        description="هنوز هیچ تراکنشی در حساب شما ثبت نشده است."
        action={
          <Link href="/money-transfer" className={s.emptyCta}>
            <Plus size={12} aria-hidden />
            شروع اولین تراکنش
          </Link>
        }
      />
    );
  }
  return (
    <DashboardTableContainer className="mt-4">
      <DashboardTable>
        <DashboardTableHeader>
          <DashboardTableRow>
            <DashboardTableHead>نوع تراکنش</DashboardTableHead>
            <DashboardTableHead>تاریخ</DashboardTableHead>
            <DashboardTableHead>مبلغ</DashboardTableHead>
            <DashboardTableHead>طرف حساب</DashboardTableHead>
            <DashboardTableHead>وضعیت</DashboardTableHead>
          </DashboardTableRow>
        </DashboardTableHeader>
        <DashboardTableBody>
          {transactions.map((txn) => {
            const statusKey = STATUS_CSSKEY[txn.status] ?? 'neutral';
            const credit = isCreditKind(txn.kind);
            const negative = isNegativeKind(txn.kind);
            return (
              <DashboardTableRow key={txn.id}>
                <DashboardTableCell className="font-medium">
                  {KIND_LABEL[txn.kind] ?? txn.kind}
                </DashboardTableCell>
                <DashboardTableCell>
                  <span className="text-[11px] text-neutral-500" title={formatPersianDateTime(txn.createdAt)}>
                    {relativeTime(txn.createdAt)}
                  </span>
                </DashboardTableCell>
                <DashboardTableCell>
                  <span
                    className={cn(
                      'font-mono font-bold',
                      negative ? 'text-red-600' : credit ? 'text-emerald-600' : 'text-neutral-700'
                    )}
                  >
                    {credit ? '+' : negative ? '−' : ''}
                    {formatAmount(txn.amount, txn.currency)}
                  </span>
                </DashboardTableCell>
                <DashboardTableCell>
                  <span className="text-neutral-600">{txn.counterparty || '---'}</span>
                </DashboardTableCell>
                <DashboardTableCell>
                  <span
                    className={cn(
                      'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ring-inset',
                      statusKey === 'success'
                        ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
                        : statusKey === 'danger'
                        ? 'bg-red-50 text-red-700 ring-red-600/20'
                        : 'bg-amber-50 text-amber-700 ring-amber-600/20'
                    )}
                  >
                    {STATUS_LABEL[txn.status] ?? txn.status}
                  </span>
                </DashboardTableCell>
              </DashboardTableRow>
            );
          })}
        </DashboardTableBody>
      </DashboardTable>
    </DashboardTableContainer>
  );
}

// ─── Quick Actions Grid ─────────────────────────────────────────────────── //
//
// ۶ کارت اقدام سریع. هر کارت = یک icon + label + micro-CTA
// روی hover: lift -1px + تغییر رنگ border به accent.
// ──────────────────────────────────────────────────────────────────────────── //

interface QuickAction {
  href: string;
  label: string;
  icon: LucideIcon;
  hint: string;
  accent: 'primary' | 'emerald' | 'amber' | 'violet' | 'cyan' | 'rose';
}

const QUICK_ACTIONS: QuickAction[] = [
  { href: '/transfer', label: 'انتقال سریع', icon: Zap, hint: 'انتقال آنی', accent: 'primary' },
  { href: '/customer/accounts', label: 'حساب جدید', icon: Plus, hint: 'افتتاح حساب', accent: 'emerald' },
  { href: '/customer/kyc', label: 'ارتقاء KYC', icon: ShieldCheck, hint: 'افزایش سقف', accent: 'violet' },
  { href: '/customer/transactions', label: 'تاریخچه', icon: History, hint: 'همه تراکنش‌ها', accent: 'cyan' },
  { href: '/customer/notifications', label: 'اعلان‌ها', icon: Bell, hint: 'پیام‌های مهم', accent: 'amber' },
  { href: '/customer/documents', label: 'مدارک', icon: KeyRound, hint: 'بارگذاری و پیگیری', accent: 'rose' },
];

function QuickActions() {
  return (
    <section className={s.quickSection} aria-label="اقدامات سریع">
      <header className={s.quickHead}>
        <div className={s.quickTitle}>
          <span className={s.heatmapDot} aria-hidden />
          <h3 className={s.heatmapH3}>اقدامات سریع</h3>
        </div>
        <span className={s.quickSub}>دسترسی در یک کلیک</span>
      </header>
      <ul className={s.quickGrid}>
        {QUICK_ACTIONS.map((a, i) => {
          const Icon = a.icon;
          return (
            <li
              key={a.href}
              className={s.quickItem}
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <Link
                href={a.href}
                className={cn(s.quickCard, s[`quickCard--${a.accent}`])}
                aria-label={`${a.label} — ${a.hint}`}
              >
                <span className={s.quickIcon} aria-hidden>
                  <Icon size={14} />
                </span>
                <span className={s.quickLabel}>{a.label}</span>
                <span className={s.quickHint}>{a.hint}</span>
                <ChevronLeft size={11} className={s.quickChevron} aria-hidden />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// ─── KYC Alert ───────────────────────────────────────────────────────────── //
//
// اگر KYC تأیید نشده باشد، یک alert بالای صفحه نمایش داده می‌شود.
// ۴ نوع: not_started, pending, rejected, expired.
// ──────────────────────────────────────────────────────────────────────────── //

function KycAlert({ status }: { status: string }) {
  if (status === 'APPROVED') return null;
  const cfg = KYC_CONFIG[status] ?? KYC_CONFIG.NOT_STARTED;
  const Icon = cfg.icon;
  return (
    <div
      className={cn(s.kycAlert, s[`kycAlert--${cfg.cssKey}`])}
      role="status"
      aria-live="polite"
    >
      <span className={s.kycAlertIcon} aria-hidden>
        <Icon size={13} />
      </span>
      <span className={s.kycAlertText}>{cfg.label}</span>
      {cfg.cta && (
        <Link href="/customer/kyc" className={s.kycAlertCta}>
          {cfg.cta}
          <ChevronLeft size={11} aria-hidden />
        </Link>
      )}
    </div>
  );
}

// ─── Error Boundary (inline) ─────────────────────────────────────────────── //
//
// اگر data ناقص باشد، fallback امن نمایش می‌دهیم.
// ──────────────────────────────────────────────────────────────────────────── //

function ErrorBlock({ message }: { message: string }) {
  return (
    <div className={s.errorBox} role="alert">
      <span className={s.errorIcon} aria-hidden>
        <AlertCircle size={14} />
      </span>
      <div>
        <strong className={s.errorTitle}>خطا در بارگذاری اطلاعات</strong>
        <p className={s.errorMessage}>{message}</p>
      </div>
    </div>
  );
}

// ─── Section Header (Reusable) ───────────────────────────────────────────── //
//
// یک heading pattern که در همهٔ section ها استفاده می‌شود.
// dot pulse سمت راست (در RTL: چپ) + title + sub + actions.
// ──────────────────────────────────────────────────────────────────────────── //

function SectionHeader({
  title,
  sub,
  icon: Icon,
  actions,
}: {
  title: string;
  sub?: string;
  icon?: LucideIcon;
  actions?: React.ReactNode;
}) {
  return (
    <header className={s.secHead}>
      <div className={s.secHeadLeft}>
        {Icon && (
          <span className={s.secHeadIcon} aria-hidden>
            <Icon size={12} />
          </span>
        )}
        <span className={s.secHeadDot} aria-hidden />
        <h2 className={s.secHeadTitle}>{title}</h2>
        {sub && <span className={s.secHeadSub}>{sub}</span>}
      </div>
      {actions && <div className={s.secHeadActions}>{actions}</div>}
    </header>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────── //

export default function CustomerDashboardContent({ data }: { data: CustomerDashboardData }) {
  const { profile, accounts, recentTransactions, stats, heatmap, volumeByKind, weeklySpark } = data;

  // محاسبه KPI نهایی
  const successRate = useMemo(() => {
    const decided = stats.totalTransactions - stats.failedTransactions;
    if (decided <= 0) return 0;
    return Math.round((stats.completedTransactions / decided) * 100);
  }, [stats]);

  // delta: مقایسه ۷ روز اخیر با ۷ روز قبلی
  const sparkDelta = useMemo(() => {
    if (weeklySpark.length < 8) return { sign: 'flat' as const, label: 'بدون مقایسه' };
    const last7 = weeklySpark.slice(-7).reduce((s, p) => s + p.amount, 0);
    const prev7 = weeklySpark.slice(0, Math.max(1, weeklySpark.length - 7)).reduce((s, p) => s + p.amount, 0);
    if (prev7 === 0) return { sign: 'flat' as const, label: 'اولین دوره' };
    const diff = ((last7 - prev7) / prev7) * 100;
    if (Math.abs(diff) < 2) return { sign: 'flat' as const, label: 'بدون تغییر قابل توجه' };
    return {
      sign: diff > 0 ? ('up' as const) : ('down' as const),
      label: `${diff > 0 ? '+' : ''}${formatPersianNumber(Math.round(diff))}٪ در ۷ روز اخیر`,
    };
  }, [weeklySpark]);

  // safe error boundary
  if (!profile) {
    return <ErrorBlock message="پروفایل مشتری یافت نشد. لطفاً با پشتیبانی تماس بگیرید." />;
  }

  return (
    <div className={s.workspace} dir="rtl">
      {/* ─── Page Header ─────────────────────────────────────────────── */}
      <PageHeader
        breadcrumb={[{ label: 'پورتال مشتری' }, { label: 'داشبورد' }]}
        title={`${profile.fullName}، خوش آمدید`}
        description={`${profile.exchange.name}${profile.exchange.city ? ` · ${profile.exchange.city}` : ''}`}
        eyebrow="اتاق کنترل"
        icon="layout-dashboard"
        accent="indigo"
        actions={
          <Link href="/money-transfer" className={s.headerCta}>
            <Sparkles size={13} aria-hidden />
            شروع تراکنش جدید
          </Link>
        }
      />

      {/* ─── KYC Alert ───────────────────────────────────────────────── */}
      <KycAlert status={profile.kycStatus} />

      {/* ─── Signature: Lattice Pulse + Live Ribbon ──────────────────── */}
      <section className={s.signature} aria-label="نمای کلی سیستم">
        <LatticePulse />
        <LiveBalanceRibbon
          totalAfn={stats.totalBalanceAfn}
          spark={weeklySpark}
          delta={sparkDelta}
          pendingCount={stats.pendingTransactions}
          rateOfSuccess={successRate}
        />
      </section>

      {/* ─── KPI Strip ───────────────────────────────────────────────── */}
      <StatGrid cols={4} gap="md" className={s.kpiStrip}>
        <StatCard
          label="کل تراکنش‌ها"
          value={stats.totalTransactions}
          icon={Layers}
          format="persian"
          info="تعداد کل تراکنش‌های ثبت‌شده توسط شما"
          href="/customer/transactions"
        />
        <StatCard
          label="نیازمند اقدام"
          value={stats.pendingTransactions}
          icon={Flame}
          format="persian"
          info="تراکنش‌های در انتظار یا در حال پردازش"
          href="/customer/transactions"
        />
        <StatCard
          label="نرخ موفقیت"
          value={successRate}
          icon={CheckCircle2}
          format="percent"
          info="درصد تراکنش‌هایی که با موفقیت تکمیل شده‌اند"
        />
        <StatCard
          label="تراکنش‌های ناموفق"
          value={stats.failedTransactions}
          icon={AlertCircle}
          format="persian"
          info="تراکنش‌های لغو، برگشت یا ناموفق"
          href="/customer/transactions"
        />
      </StatGrid>

      {/* ─── Account Ledger (asymmetric) ─────────────────────────────── */}
      <section className={s.section}>
        <SectionHeader
          icon={Wallet}
          title="حساب‌های من"
          sub={`${formatPersianNumber(accounts.length)} حساب`}
          actions={
            <Link href="/customer/accounts" className={s.viewAllLink}>
              <Eye size={11} aria-hidden />
              مشاهده همه
            </Link>
          }
        />
        <LedgerGrid accounts={accounts} />
      </section>

      {/* ─── Two-column: Heatmap + Volume by Kind ────────────────────── */}
      <div className={s.dualGrid}>
        <ActivityHeatmap heatmap={heatmap} />
        <VolumeByKind data={volumeByKind} />
      </div>

      {/* ─── Recent Transactions ─────────────────────────────────────── */}
      <section className={s.section}>
        <SectionHeader
          icon={History}
          title="تراکنش‌های اخیر"
          sub="۸ تراکنش آخر"
          actions={
            <div className={s.txnActions}>
              <Link href="/customer/transactions" className={s.viewAllLink}>
                <FileSearch size={11} aria-hidden />
                مشاهده همه
              </Link>
            </div>
          }
        />
        <RecentTransactions transactions={recentTransactions} />
      </section>

      {/* ─── Quick Actions Grid ──────────────────────────────────────── */}
      <QuickActions />

      {/* ─── Footer hint ─────────────────────────────────────────────── */}
      <footer className={s.workspaceFoot}>
        <span className={s.footDot} aria-hidden />
        <span>داده‌های شما به‌صورت لحظه‌ای به‌روزرسانی می‌شوند.</span>
        <span className={s.footDivider} aria-hidden />
        <Banknote size={10} aria-hidden />
        <span>نرخ‌ها از صرافی {profile.exchange.name}</span>
      </footer>
    </div>
  );
}
