'use client';

/**
 * LedgerFlowList — جریان تراکنش‌ها (adaptive console, 2026 rebuild).
 *
 * Research-based architecture (Ramp / Brex / Stripe pattern for finance
 * consoles): one component, three density tiers —
 *   - Desktop (≥1280px): dense table with column headers, sticky-less but
 *     scannable, inline balance bars. High density for an admin console.
 *   - Tablet (768–1279px): condensed table — description column drops so
 *     nothing ever overflows or scrolls horizontally.
 *   - Mobile (<768px): card feed — icon, exchange pill, description, amount
 *     hero. Mercury/Wise-style, grouped feel without group headers.
 *
 * The grid tracks are tuned so the minimum column widths always fit the
 * DataPanel main column (≈847px at 1536px viewport) — no horizontal scroll.
 *
 * Tokens only | RTL logical | mobile-first responsive.
 */

import { ArrowDownRight, ArrowUpRight, Landmark } from 'lucide-react';
import { type CSSProperties, useEffect, useRef, useState } from 'react';
import s from './LedgerFlowList.module.css';

const fa = new Intl.NumberFormat('fa-IR');
const CURRENCY_SYMBOLS: Record<string, string> = {
  AFN: '؋',
  USD: '$',
  EUR: '€',
  AED: 'د.إ',
  GBP: '£',
  IRR: '﷼',
  CNY: '¥',
  JPY: '¥',
  KRW: '₩',
  INR: '₹',
  TMT: 'm',
  UZS: "so'm",
  PKR: '₨',
};

function currencySym(code: string): string {
  return CURRENCY_SYMBOLS[code] ?? code.charAt(0);
}

function formatTime(iso: string | Date): string {
  try {
    return new Date(iso).toLocaleTimeString('fa-IR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

function formatDateShort(iso: string | Date): string {
  try {
    return new Date(iso).toLocaleDateString('fa-IR', {
      day: '2-digit',
      month: 'short',
    });
  } catch {
    return '—';
  }
}

/* ── Types ── */

export interface FlowListRow {
  id: string;
  direction: 'CREDIT' | 'DEBIT';
  amount: string;
  currency: string;
  runningBalance: string;
  description: string | null;
  createdAt: Date | string;
  exchangeName: string;
  customerName: string | null;
  accountLabel: string | null;
  txnId: string | null;
}

export interface LedgerFlowListProps {
  rows: FlowListRow[];
  loading?: boolean;
  empty?: React.ReactNode;
}

/* ── Component ── */

export function LedgerFlowList({ rows, loading, empty }: LedgerFlowListProps) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(t);
  }, []);

  const maxBal = Math.max(...rows.map((r) => Math.abs(Number.parseFloat(r.runningBalance))), 1);

  if (loading && rows.length === 0) {
    return <FlowSkeleton />;
  }

  if (rows.length === 0) {
    return <div className={s.empty}>{empty ?? <span>تراکنشی برای نمایش نیست</span>}</div>;
  }

  return (
    <div
      ref={ref}
      className={`${s.root} ${loading ? s.rootLoading : ''}`}
      // biome-ignore lint/a11y/useSemanticElements: CSS Grid flow layout, not native <table>
      role="table"
      aria-label="تراکنش‌های دفتر کل"
      aria-busy={loading || undefined}
    >
      {/* ── Column headers (hidden on mobile) ── */}
      {/* biome-ignore lint/a11y/useSemanticElements: CSS Grid flow layout */}
      {/* biome-ignore lint/a11y/useFocusableInteractive: decorative row */}
      <div className={s.header} role="row">
        <span className={s.colTime}>زمان</span>
        <span className={s.colExchange}>صرافی</span>
        <span className={s.colParty}>طرف حساب</span>
        <span className={s.colDesc}>توضیحات</span>
        <span className={s.colDir}>جهت</span>
        <span className={s.colAmount}>مبلغ</span>
        <span className={s.colBalance}>موجودی</span>
      </div>

      {/* ── Flow rows ── */}
      {/* biome-ignore lint/a11y/useSemanticElements: CSS Grid flow layout */}
      <div className={s.body} role="rowgroup">
        {rows.map((row, idx) => {
          const isCredit = row.direction === 'CREDIT';
          const bal = Number.parseFloat(row.runningBalance);
          const ratio = Math.min(100, (Math.abs(bal) / maxBal) * 100);
          const amt = Number.parseFloat(row.amount);

          return (
            // biome-ignore lint/a11y/useFocusableInteractive: decorative row
            <div
              key={row.id}
              className={`${s.row} ${isCredit ? s.rowCredit : s.rowDebit}`}
              // biome-ignore lint/a11y/useSemanticElements: CSS Grid flow layout
              role="row"
              style={
                {
                  animationDelay: visible ? `${Math.min(idx, 12) * 22}ms` : '0ms',
                  '--glow-color': isCredit
                    ? 'var(--nova-up, var(--ds-accent-emerald))'
                    : 'var(--nova-down, var(--ds-accent-rose))',
                } as CSSProperties
              }
            >
              {/* Direction edge bar */}
              <span className={s.edgeBar} aria-hidden />

              {/* Time */}
              {/* biome-ignore lint/a11y/useSemanticElements: CSS Grid flow layout */}
              <span className={s.cellTime} role="cell">
                <span className={s.timeMain}>{formatTime(row.createdAt)}</span>
                <span className={s.timeDate}>{formatDateShort(row.createdAt)}</span>
              </span>

              {/* Exchange */}
              {/* biome-ignore lint/a11y/useSemanticElements: CSS Grid flow layout */}
              <span className={s.cellExchange} role="cell">
                <span className={s.exchangeIcon} aria-hidden>
                  <Landmark size={10} strokeWidth={2} />
                </span>
                <span className={s.exchangeName}>{row.exchangeName}</span>
              </span>

              {/* Party */}
              {/* biome-ignore lint/a11y/useSemanticElements: CSS Grid flow layout */}
              <span className={s.cellParty} role="cell">
                <span className={s.partyMain}>{row.customerName ?? '—'}</span>
                {row.accountLabel && <span className={s.accountLabel}>{row.accountLabel}</span>}
              </span>

              {/* Description (party prefix shows on mobile cards only) */}
              {/* biome-ignore lint/a11y/useSemanticElements: CSS Grid flow layout */}
              <span className={s.cellDesc} role="cell">
                <span className={s.mobileParty} aria-hidden>
                  {row.customerName ? (
                    <>
                      <span>{row.customerName}</span>
                      <span className={s.mobileSep}>·</span>
                    </>
                  ) : null}
                </span>
                <span className={s.descMain}>{row.description ?? '—'}</span>
                {row.txnId && <span className={s.txnId}>{row.txnId}</span>}
              </span>

              {/* Direction badge */}
              {/* biome-ignore lint/a11y/useSemanticElements: CSS Grid flow layout */}
              <span className={`${s.cellDir} ${isCredit ? s.dirCredit : s.dirDebit}`} role="cell">
                <span className={s.dirIcon} aria-hidden>
                  {isCredit ? (
                    <ArrowUpRight size={11} strokeWidth={2.25} />
                  ) : (
                    <ArrowDownRight size={11} strokeWidth={2.25} />
                  )}
                </span>
                <span className={s.dirText}>{isCredit ? 'واریز' : 'برداشت'}</span>
              </span>

              {/* Amount */}
              {/* biome-ignore lint/a11y/useSemanticElements: CSS Grid flow layout */}
              <span className={s.cellAmount} role="cell">
                <span className={`${s.amount} ${isCredit ? s.amountUp : s.amountDown}`}>
                  <span className={s.amountSign}>{isCredit ? '+' : '−'}</span>
                  {fa.format(amt)}
                </span>
                <span className={s.currencyBadge}>
                  <span className={s.currencySym}>{currencySym(row.currency)}</span>
                  {row.currency}
                </span>
              </span>

              {/* Balance with inline bar */}
              {/* biome-ignore lint/a11y/useSemanticElements: CSS Grid flow layout */}
              <span className={s.cellBalance} role="cell">
                <span className={s.balanceValue}>
                  {fa.format(Math.abs(bal))}
                  <span className={s.balanceSym}>{currencySym(row.currency)}</span>
                </span>
                <span className={s.balanceBar} aria-hidden>
                  <span
                    className={`${s.balanceFill} ${isCredit ? s.fillUp : s.fillDown}`}
                    style={{ inlineSize: `${ratio}%` }}
                  />
                </span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Skeleton ── */

function FlowSkeleton() {
  return (
    <div className={s.skeleton} aria-label="در حال بارگذاری">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className={s.skelRow}>
          <span className={`${s.skelBlock} ${s.skelIcon}`} />
          <span className={`${s.skelBlock} ${s.skelTime}`} />
          <span className={`${s.skelBlock} ${s.skelExchange}`} />
          <span className={`${s.skelBlock} ${s.skelParty}`} />
          <span className={`${s.skelBlock} ${s.skelDesc}`} />
          <span className={`${s.skelBlock} ${s.skelDir}`} />
          <span className={`${s.skelBlock} ${s.skelAmount}`} />
          <span className={`${s.skelBlock} ${s.skelBalance}`} />
        </div>
      ))}
    </div>
  );
}
