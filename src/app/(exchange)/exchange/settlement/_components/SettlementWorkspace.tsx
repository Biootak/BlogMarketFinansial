'use client';

/**
 * SettlementWorkspace — مدیریت تسویه‌حساب صرافی در پنل صراف
 *
 * صراف لیست دوره‌های تسویه را می‌بیند: تاریخ، حجم معاملات، کارمزد پلتفرم و درآمد خالص.
 * فقط OWNER/MANAGER می‌توانند دکمه تأیید را ببینند (آپشنال در آینده).
 */

import {
  type SettlementRow,
  approveSettlement,
  getSettlements,
} from '@/actions/settlement';
import { BadgeCheck, BarChart3, CheckCircle2, Clock, Loader2, Receipt } from 'lucide-react';
import { useCallback, useEffect, useState, useTransition } from 'react';
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
  exchangeId: string;
  staffRole: string;
}

export default function SettlementWorkspace({ exchangeId, staffRole }: Props) {
  const [rows, setRows] = useState<SettlementRow[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [isPending, startTransition] = useTransition();
  const [actionPending, setActionPending] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const canManage = staffRole === 'OWNER' || staffRole === 'MANAGER';

  const loadData = useCallback(() => {
    startTransition(async () => {
      const data = await getSettlements({
        exchangeId,
        status: filter !== 'all' ? filter : undefined,
        limit: 50,
      });
      setRows(data);
    });
  }, [exchangeId, filter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleApprove(id: string) {
    setActionPending(id);
    setActionError(null);
    const res = await approveSettlement(id);
    setActionPending(null);
    if (res.success) {
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'APPROVED' } : r)));
    } else {
      setActionError(res.error.message);
    }
  }

  // اعداد خلاصه
  const totalVolume = rows.reduce((s, r) => s + Number(r.totalVolume), 0);
  const totalFee = rows.reduce((s, r) => s + Number(r.platformFee), 0);
  const totalNet = rows.reduce((s, r) => s + Number(r.exchangeNet), 0);

  return (
    <div className={s.root}>
      {/* ── Summary ─────────────────────────────────────── */}
      <div className={s.summaryGrid}>
        <div className={s.summaryCard} style={{ '--accent-color': 'var(--ds-primary)' } as React.CSSProperties}>
          <div className={s.summaryValue}>
            {new Intl.NumberFormat('fa-IR', { notation: 'compact', maximumFractionDigits: 1 }).format(totalVolume / 100)}
          </div>
          <div className={s.summaryLabel}>حجم کل معاملات (AFN)</div>
        </div>
        <div className={s.summaryCard} style={{ '--accent-color': 'var(--ds-warning, #f59e0b)' } as React.CSSProperties}>
          <div className={s.summaryValue}>
            {new Intl.NumberFormat('fa-IR', { notation: 'compact', maximumFractionDigits: 1 }).format(totalFee / 100)}
          </div>
          <div className={s.summaryLabel}>کارمزد پلتفرم</div>
        </div>
        <div className={s.summaryCard} style={{ '--accent-color': 'var(--ds-success, #22c55e)' } as React.CSSProperties}>
          <div className={s.summaryValue}>
            {new Intl.NumberFormat('fa-IR', { notation: 'compact', maximumFractionDigits: 1 }).format(totalNet / 100)}
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

      {actionError && (
        <p role="alert" style={{ color: 'var(--ds-error, #ef4444)', fontSize: 'var(--ds-text-sm)', margin: 0 }}>
          {actionError}
        </p>
      )}

      {/* ── Table ───────────────────────────────────────── */}
      <div className={s.tableWrap} aria-busy={isPending}>
        {isPending && (
          <div className={s.loadingOverlay}>
            <span className={s.loadingDot} />
            <span className={s.loadingDot} />
            <span className={s.loadingDot} />
          </div>
        )}

        {rows.length === 0 && !isPending ? (
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
          <>
            <div className={s.tableHead} role="row" aria-label="سرستون جدول تسویه">
              <span role="columnheader">دوره</span>
              <span role="columnheader">حجم</span>
              <span role="columnheader">معاملات</span>
              <span role="columnheader">کارمزد</span>
              <span role="columnheader">درآمد خالص</span>
              <span role="columnheader">وضعیت</span>
              {canManage && <span role="columnheader">عملیات</span>}
            </div>
            {rows.map((row) => {
              const statusCls = STATUS_CLASS[row.status] ?? '';
              const Icon =
                row.status === 'PAID'
                  ? CheckCircle2
                  : row.status === 'APPROVED'
                    ? BadgeCheck
                    : Clock;

              return (
                <div key={row.id} className={s.tableRow} role="row">
                  <span className={s.cellName} role="cell">
                    <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: '12px' }}>
                      {fmtDate(row.periodStart)} — {fmtDate(row.periodEnd)}
                    </span>
                  </span>
                  <span
                    className={s.cellNum}
                    role="cell"
                    title={`${Number(row.totalVolume) / 100} ${row.currency}`}
                  >
                    {fmtNum(row.totalVolume)} {row.currency}
                  </span>
                  <span role="cell" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {new Intl.NumberFormat('fa-IR').format(row.dealCount)}
                  </span>
                  <span className={s.cellNum} role="cell">
                    {fmtNum(row.platformFee)} {row.currency}
                  </span>
                  <span
                    className={s.cellNum}
                    role="cell"
                    style={{ color: 'var(--ds-success, #22c55e)', fontWeight: 600 }}
                  >
                    {fmtNum(row.exchangeNet)} {row.currency}
                  </span>
                  <span role="cell">
                    <span className={`${s.statusBadge} ${statusCls}`}>
                      <Icon size={11} aria-hidden />
                      {STATUS_FA[row.status] ?? row.status}
                    </span>
                  </span>
                  {canManage && (
                    <span role="cell">
                      {row.status === 'PENDING' && (
                        <button
                          type="button"
                          className={`${s.actionBtn} ${s.approveBtn}`}
                          disabled={actionPending === row.id}
                          onClick={() => handleApprove(row.id)}
                        >
                          {actionPending === row.id ? (
                            <Loader2 size={11} style={{ animation: 'spin 0.7s linear infinite' }} aria-hidden />
                          ) : (
                            'تأیید'
                          )}
                        </button>
                      )}
                    </span>
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>

      {rows.length > 0 && (
        <p className={s.footer}>
          {new Intl.NumberFormat('fa-IR').format(rows.length)} دوره تسویه
        </p>
      )}
    </div>
  );
}
