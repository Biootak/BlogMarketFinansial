'use client';

/**
 * SettlementWorkspace — مدیریت تسویه‌حساب صرافی در پنل صراف
 *
 * داده‌ها از page.tsx (Server Component) به‌عنوان initialRows پاس می‌شوند.
 * filter فقط client-side روی همان آرایه اعمال می‌شود — بدون re-fetch.
 * فقط OWNER/MANAGER می‌توانند دکمه تأیید را ببینند (آپشنال در آینده).
 */

import type { SettlementRow } from '@/actions/settlement';
import { BadgeCheck, BarChart3, CheckCircle2, Clock, Receipt } from 'lucide-react';
import { useMemo, useState } from 'react';
import s from './SettlementWorkspace.module.css';

const STATUS_FA: Record<string, string> = {
  PENDING: 'در انتظار',
  APPROVED: 'تأیید شده',
  PAID: 'پرداخت شده',
  CANCELLED: 'لغو شده',
};

const STATUS_CLASS: Record<string, string> = {
  PENDING: s.statusPending,
  APPROVED: s.statusApproved,
  PAID: s.statusPaid,
  CANCELLED: s.statusCancelled,
};

const fmtNum = (v: string | number) =>
  new Intl.NumberFormat('fa-IR', { notation: 'compact', maximumFractionDigits: 1 }).format(
    Number(v) / 100,
  );

const fmtDate = (d: Date) =>
  new Intl.DateTimeFormat('fa-IR', { month: 'short', day: 'numeric', year: '2-digit' }).format(
    new Date(d),
  );

interface Props {
  initialRows: SettlementRow[];
  staffRole: string;
}

export default function SettlementWorkspace({ initialRows, staffRole }: Props) {
  const [filter, setFilter] = useState<string>('all');

  // approve فقط توسط ادمین پلتفرم انجام می‌شود — صراف نمی‌تواند settlement خودش را approve کند
  void staffRole;

  // فیلتر client-side — بدون re-fetch
  const rows = useMemo(
    () => (filter === 'all' ? initialRows : initialRows.filter((r) => r.status === filter)),
    [initialRows, filter],
  );

  // اعداد خلاصه
  const totalVolume = rows.reduce((s, r) => s + Number(r.totalVolume), 0);
  const totalFee = rows.reduce((s, r) => s + Number(r.platformFee), 0);
  const totalNet = rows.reduce((s, r) => s + Number(r.exchangeNet), 0);

  return (
    <div className={s.root}>
      {/* ── Summary ─────────────────────────────────────── */}
      <div className={s.summaryGrid}>
        <div
          className={s.summaryCard}
          style={{ '--accent-color': 'var(--ds-brand-500)' } as React.CSSProperties}
        >
          <div className={s.summaryValue}>
            {new Intl.NumberFormat('fa-IR', {
              notation: 'compact',
              maximumFractionDigits: 1,
            }).format(totalVolume / 100)}
          </div>
          <div className={s.summaryLabel}>حجم کل معاملات (AFN)</div>
        </div>
        <div
          className={s.summaryCard}
          style={{ '--accent-color': 'var(--ds-accent-amber)' } as React.CSSProperties}
        >
          <div className={s.summaryValue}>
            {new Intl.NumberFormat('fa-IR', {
              notation: 'compact',
              maximumFractionDigits: 1,
            }).format(totalFee / 100)}
          </div>
          <div className={s.summaryLabel}>کارمزد پلتفرم</div>
        </div>
        <div
          className={s.summaryCard}
          style={{ '--accent-color': 'var(--ds-status-success-fg)' } as React.CSSProperties}
        >
          <div className={s.summaryValue}>
            {new Intl.NumberFormat('fa-IR', {
              notation: 'compact',
              maximumFractionDigits: 1,
            }).format(totalNet / 100)}
          </div>
          <div className={s.summaryLabel}>درآمد خالص صرافی</div>
        </div>
      </div>

      {/* ── Filter ──────────────────────────────────────── */}
      <div className={s.filterBar}>
        <BarChart3 size={14} style={{ color: 'var(--at-fg-subtle)', flexShrink: 0 }} aria-hidden />
        {['all', 'PENDING', 'APPROVED', 'PAID'].map((k) => (
          <button
            key={k}
            type="button"
            className={`${s.filterBtn} ${filter === k ? s.filterBtnActive : ''}`}
            onClick={() => setFilter(k)}
          >
            {k === 'all' ? 'همه' : STATUS_FA[k]}
          </button>
        ))}
      </div>

      {/* ── Table ───────────────────────────────────────── */}
      <div className={s.tableWrap}>
        {rows.length === 0 ? (
          <div className={s.empty}>
            <Receipt
              size={36}
              strokeWidth={1}
              style={{ opacity: 0.25, display: 'block', margin: '0 auto 12px' }}
              aria-hidden
            />
            <p>هنوز دوره‌ای تسویه نشده است.</p>
          </div>
        ) : (
          <table className={s.table} aria-label="جدول تسویه">
            <thead>
              <tr className={s.tableHead}>
                <th scope="col">دوره</th>
                <th scope="col">حجم</th>
                <th scope="col">معاملات</th>
                <th scope="col">کارمزد</th>
                <th scope="col">درآمد خالص</th>
                <th scope="col">وضعیت</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const statusCls = STATUS_CLASS[row.status] ?? '';
                const Icon =
                  row.status === 'PAID'
                    ? CheckCircle2
                    : row.status === 'APPROVED'
                      ? BadgeCheck
                      : Clock;

                return (
                  <tr key={row.id} className={s.tableRow}>
                    <td className={s.cellName}>
                      <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: '12px' }}>
                        {fmtDate(row.periodStart)} — {fmtDate(row.periodEnd)}
                      </span>
                    </td>
                    <td
                      className={s.cellNum}
                      title={`${Number(row.totalVolume) / 100} ${row.currency}`}
                    >
                      {fmtNum(row.totalVolume)} {row.currency}
                    </td>
                    <td style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {new Intl.NumberFormat('fa-IR').format(row.dealCount)}
                    </td>
                    <td className={s.cellNum}>
                      {fmtNum(row.platformFee)} {row.currency}
                    </td>
                    <td
                      className={s.cellNum}
                      style={{ color: 'var(--ds-status-success-fg)', fontWeight: 600 }}
                    >
                      {fmtNum(row.exchangeNet)} {row.currency}
                    </td>
                    <td>
                      <span className={`${s.statusBadge} ${statusCls}`}>
                        <Icon size={11} aria-hidden />
                        {STATUS_FA[row.status] ?? row.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {rows.length > 0 && (
        <p className={s.footer}>{new Intl.NumberFormat('fa-IR').format(rows.length)} دوره تسویه</p>
      )}
    </div>
  );
}
