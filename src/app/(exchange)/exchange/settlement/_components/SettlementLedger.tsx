/**
 * SettlementLedger — signature moment of settlement page.
 *
 * یک timeline افقی از دوره‌های تسویه که هر کدام به‌صورت یک milestone
 * در یک خط زمانی نورانی نمایش داده می‌شوند. وضعیت هر milestone
 * (PENDING/APPROVED/PAID) با رنگ و آیکون متمایز می‌شود. خط اصلی
 * به‌صورت self-drawing stroke (با viewBox و stroke-dasharray) نمایش داده می‌شود.
 *
 *  - آخرین milestone بزرگ‌تر است (current focus)
 *  - در hover روی هر milestone، جزئیات کوچک نمایش داده می‌شود
 *  - اگر داده نباشد، fallback خلوت (نوار خالی)
 *
 * Server Component — همه props serialize-safe.
 */

import { BadgeCheck, CheckCircle2, Clock } from 'lucide-react';
import s from './SettlementLedger.module.css';

export type SettlementStatus = 'PENDING' | 'APPROVED' | 'PAID' | 'CANCELLED';

interface LedgerEntry {
  id: string;
  periodStart: Date;
  periodEnd: Date;
  status: SettlementStatus;
  net: number; // minor units
  currency: string;
}

interface Props {
  entries: LedgerEntry[];
  currency: string;
}

const STATUS_META: Record<
  SettlementStatus,
  { label: string; tone: 'emerald' | 'amber' | 'violet' | 'muted'; Icon: typeof Clock }
> = {
  PENDING: { label: 'در انتظار', tone: 'amber', Icon: Clock },
  APPROVED: { label: 'تأیید شده', tone: 'violet', Icon: BadgeCheck },
  PAID: { label: 'پرداخت شده', tone: 'emerald', Icon: CheckCircle2 },
  CANCELLED: { label: 'لغو شده', tone: 'muted', Icon: Clock },
};

const fmtNum = (v: number): string =>
  new Intl.NumberFormat('fa-IR', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(v / 100);

const fmtDate = (d: Date): string =>
  new Intl.DateTimeFormat('fa-IR', { month: 'short', day: 'numeric' }).format(new Date(d));

export default function SettlementLedger({ entries, currency }: Props) {
  if (entries.length === 0) {
    return (
      <section className={s.ledger} aria-label="ledger تسویه">
        <div className={s.head}>
          <span className={s.eyebrow}>
            <span className={s.eyebrowDot} aria-hidden />
            خط زمانی تسویه
          </span>
          <h2 className={s.title}>اولین دورهٔ تسویه</h2>
        </div>
        <p className={s.emptyText}>
          هنوز دوره‌ای ثبت نشده. اولین تسویه پس از پایان یک دورهٔ ماهانه به‌صورت خودکار ایجاد می‌شود.
        </p>
      </section>
    );
  }

  // فقط ۸ میلستون آخر برای جلوگیری از شلوغی
  const visible = entries.slice(0, 8);
  const lastIndex = visible.length - 1;

  return (
    <section className={s.ledger} aria-label="ledger تسویه">
      <header className={s.head}>
        <span className={s.eyebrow}>
          <span className={s.eyebrowDot} aria-hidden />
          خط زمانی تسویه
        </span>
        <h2 className={s.title}>سفر دوره‌ها از انتظار تا پرداخت</h2>
        <p className={s.sub}>
          هر نقطه یک دورهٔ تسویه است؛ رنگ و نماد، وضعیت فعلی آن را نشان می‌دهد. دورهٔ فعلی بزرگ‌تر نمایش داده می‌شود.
        </p>
      </header>

      <div className={s.timeline} role="list" aria-label="دوره‌های تسویه">
        {/* خط اصلی (self-drawing stroke) */}
        <svg
          className={s.timelineRail}
          viewBox="0 0 100 4"
          preserveAspectRatio="none"
          aria-hidden
        >
          <defs>
            <linearGradient id="ledgerGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--at-gold)" stopOpacity="0.5" />
              <stop offset="50%" stopColor="var(--at-violet)" stopOpacity="0.5" />
              <stop offset="100%" stopColor="var(--at-accent)" stopOpacity="0.7" />
            </linearGradient>
          </defs>
          <line
            x1="0"
            y1="2"
            x2="100"
            y2="2"
            stroke="url(#ledgerGrad)"
            strokeWidth="0.6"
            strokeLinecap="round"
            className={s.timelineRailLine}
          />
        </svg>

        {visible.map((entry, i) => {
          const meta = STATUS_META[entry.status];
          const Icon = meta.Icon;
          const isCurrent = i === lastIndex;
          const dateLabel = `${fmtDate(entry.periodStart)} – ${fmtDate(entry.periodEnd)}`;
          return (
            <div
              key={entry.id}
              className={s.node}
              data-current={isCurrent || undefined}
              data-tone={meta.tone}
              role="listitem"
            >
              <div className={s.nodeDot} aria-hidden>
                <Icon size={isCurrent ? 13 : 10} strokeWidth={isCurrent ? 2 : 1.75} />
                <span className={s.nodeDotPulse} aria-hidden />
              </div>
              <div className={s.nodeLabel}>
                <span className={s.nodeStatus}>{meta.label}</span>
                <span className={s.nodeDate}>{dateLabel}</span>
              </div>
              <span className={s.nodeValue}>
                {fmtNum(entry.net)} <em className={s.nodeCurrency}>{currency}</em>
              </span>
            </div>
          );
        })}
      </div>

      {/* legend */}
      <div className={s.legend} aria-hidden>
        {(['PENDING', 'APPROVED', 'PAID'] as const).map((st) => {
          const meta = STATUS_META[st];
          return (
            <span key={st} className={s.legendItem} data-tone={meta.tone}>
              <span className={s.legendDot} />
              {meta.label}
            </span>
          );
        })}
      </div>
    </section>
  );
}
