/**
 * TransactionRow — یک ردیف تراکنش در لیست
 *
 * ساختار بصری:
 *
 *   [rail]  [icon]  مشتری · نوع تراکنش          مبلغ (با tone credit/debit)
 *            ↑      [meta: زمان، مقصد، یادداشت]   → مقصد · status pill
 *           kind
 *
 * الگو از customer/transactions الهام گرفته ولی متراکم‌تر:
 *   - rail رنگی 2px (سابقه فیزیکی پرونده)
 *   - kind icon با tone اختصاصی
 *   - مبلغ با sign (+/-) و tone
 *   - برای EXCHANGE: نمایش مبدأ → مقصد زیر مبلغ
 *   - status pill + live dot
 */

'use client';

import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  CheckCircle2,
  CircleDollarSign,
  Coins,
  type LucideIcon,
  RefreshCw,
  Send,
  WalletCards,
} from 'lucide-react';
import Link from 'next/link';
import { type CSSProperties } from 'react';
import { type TxRowEnriched } from '@/lib/exchange-tx-formatters';
import s from './TransactionRow.module.css';

const KIND_ICON: Record<string, LucideIcon> = {
  DEPOSIT: ArrowDownLeft,
  WITHDRAWAL: ArrowUpRight,
  EXCHANGE: ArrowLeftRight,
  TRANSFER: Send,
  FEE: Coins,
  SETTLEMENT: WalletCards,
  ADJUSTMENT: RefreshCw,
};

export function TransactionRow({
  row,
  index,
}: {
  row: TxRowEnriched;
  /** شماره ردیف — برای stagger animation */
  index: number;
}) {
  const Icon = KIND_ICON[row.kind] ?? CircleDollarSign;
  const sign = row.tone === 'credit' ? '+' : row.tone === 'debit' ? '−' : '';
  const isExchange = row.kind === 'EXCHANGE';

  return (
    <li
      className={s.row}
      data-status={row.statusKey}
      data-tone={row.tone}
      style={{ '--row-i': Math.min(index, 12) } as CSSProperties}
    >
      <Link
        href={`/exchange/transactions/${row.id}`}
        className={s.rowLink}
        aria-label={`${row.kindLabel} ${row.customerName ?? 'بدون مشتری'} ${row.amountStr}`}
      >
        {/* ── Status rail — سابقه ۱۲۰ ساله بانکداری ────────────────────── */}
        <span className={s.rail} aria-hidden />

        {/* ── Kind icon ───────────────────────────────────────────────── */}
        <span className={s.iconBox} aria-hidden>
          <Icon size={14} strokeWidth={1.75} />
        </span>

        {/* ── Main: customer + kind + meta ────────────────────────────── */}
        <div className={s.main}>
          <div className={s.topLine}>
            <span className={s.customerName}>{row.customerName ?? '—'}</span>
            <span className={s.kindTag}>{row.kindLabel}</span>
          </div>
          <div className={s.metaLine}>
            {row.customerPhone && (
              <>
                <span className={s.metaItem} dir="ltr">
                  {row.customerPhone}
                </span>
                <span className={s.dot} aria-hidden />
              </>
            )}
            <span className={s.metaItem} title={row.createdAtFull}>
              {row.createdAtCompact}
            </span>
            {isExchange && row.destAmountStr && row.destCurrency && (
              <>
                <span className={s.dot} aria-hidden />
                <span className={s.metaExchange}>
                  <ArrowLeftRight size={9} aria-hidden className={s.metaExchangeIcon} />
                  {row.destAmountStr}
                </span>
              </>
            )}
            {row.feeAmount > 0 && (
              <>
                <span className={s.dot} aria-hidden />
                <span className={s.metaFee}>
                  کارمزد {row.feeStr}
                </span>
              </>
            )}
            {row.note && (
              <>
                <span className={s.dot} aria-hidden />
                <span className={s.metaNote} title={row.note}>
                  {row.note.length > 28 ? `${row.note.slice(0, 28)}…` : row.note}
                </span>
              </>
            )}
          </div>
        </div>

        {/* ── Right: amount + status pill ─────────────────────────────── */}
        <div className={s.right}>
          <span className={s.amount} data-tone={row.tone}>
            <span className={s.amountSign} aria-hidden>
              {sign}
            </span>
            <span className={s.amountValue}>
              {row.amountStr.replace(` ${row.currency}`, '')}
            </span>
            <span className={s.amountCurrency}>{row.currency}</span>
          </span>
          <span className={s.statusPill} data-status={row.statusKey}>
            {row.statusKey === 'success' && (
              <CheckCircle2 size={9} strokeWidth={2.4} aria-hidden className={s.statusIcon} />
            )}
            <span>{row.statusLabel}</span>
          </span>
        </div>
      </Link>
    </li>
  );
}
