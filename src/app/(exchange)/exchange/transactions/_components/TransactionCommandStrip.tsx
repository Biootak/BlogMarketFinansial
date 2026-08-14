/**
 * TransactionCommandStrip — نوار فرماندهی فیلترها
 *
 * ساختار سه لایه:
 *   1. Kind Tabs (همه/واریز/برداشت/صرافی/...) — کلید اصلی navigation
 *   2. Search input + sort + density toggle + new button
 *   3. Status filter chips (همه/در انتظار/تکمیل/ناموفق) — فیلتر ثانویه
 *
 * الگوی "command strip" از Linear/Supabase 2026 — کاربر در یک نگاه
 * state فعلی صف را می‌فهمد و در 1 کلیک فیلتر را عوض می‌کند.
 */

'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TX_KIND_FA, TX_STATUS_FA } from '@/lib/exchange-labels';
import { faNum } from '@/lib/exchange-tx-formatters';
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpDown,
  ArrowUpRight,
  CircleDollarSign,
  Coins,
  Plus,
  RefreshCw,
  Search,
  Send,
  WalletCards,
  X,
} from 'lucide-react';
import { type ReactNode, useId } from 'react';
import s from './TransactionCommandStrip.module.css';

const KIND_ICON: Record<string, React.ComponentType<{ size?: number; strokeWidth?: number }>> = {
  DEPOSIT: ArrowDownLeft,
  WITHDRAWAL: ArrowUpRight,
  EXCHANGE: ArrowLeftRight,
  TRANSFER: Send,
  FEE: Coins,
  SETTLEMENT: WalletCards,
  ADJUSTMENT: RefreshCw,
};

const KIND_ORDER = ['all', 'DEPOSIT', 'WITHDRAWAL', 'EXCHANGE', 'TRANSFER', 'FEE', 'SETTLEMENT'];

export type KindFilter = string;
export type StatusFilter = string;
export type SortKey = 'newest' | 'oldest' | 'amount' | 'customer';

interface Props {
  kindFilter: KindFilter;
  statusFilter: StatusFilter;
  query: string;
  sort: SortKey;
  /** دیکشنری {kind: count} — برای badge شمارنده */
  counts: Record<string, number>;
  totalCount: number;
  canAdd: boolean;
  onKindChange: (k: KindFilter) => void;
  onStatusChange: (s: StatusFilter) => void;
  onQueryChange: (q: string) => void;
  onSortChange: (s: SortKey) => void;
  onAddClick: () => void;
}

export function TransactionCommandStrip({
  kindFilter,
  statusFilter,
  query,
  sort,
  counts,
  totalCount,
  canAdd,
  onKindChange,
  onStatusChange,
  onQueryChange,
  onSortChange,
  onAddClick,
}: Props) {
  const searchId = useId();

  return (
    <section className={s.strip} aria-label="کنترل‌های لیست تراکنش‌ها">
      {/* ── Layer 1: Kind tabs (navigation) ─────────────────────────── */}
      <nav className={s.tabs} aria-label="نوع تراکنش">
        <div className={s.tabsInner} role="tablist">
          {KIND_ORDER.map((k) => {
            const isActive = kindFilter === k;
            const Icon = k === 'all' ? CircleDollarSign : (KIND_ICON[k] ?? CircleDollarSign);
            const label = k === 'all' ? 'همه' : TX_KIND_FA[k];
            const count = k === 'all' ? totalCount : (counts[k] ?? 0);
            return (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={s.tab}
                data-active={isActive}
                onClick={() => onKindChange(k)}
              >
                <Icon size={12} strokeWidth={1.8} aria-hidden />
                <span className={s.tabLabel}>{label}</span>
                <span className={s.tabCount}>{faNum(count)}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* ── Layer 2: Search + sort + new button ──────────────────────── */}
      <div className={s.actions}>
        <div className={s.searchWrap}>
          <Search size={14} className={s.searchIcon} aria-hidden />
          <input
            id={searchId}
            type="search"
            className={s.searchInput}
            placeholder="جستجو مشتری، شماره تماس، شناسه تراکنش…"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            aria-label="جستجو تراکنش‌ها"
          />
          {query && (
            <button
              type="button"
              className={s.clearBtn}
              onClick={() => onQueryChange('')}
              aria-label="پاک کردن جستجو"
            >
              <X size={12} aria-hidden />
            </button>
          )}
        </div>

        <div className={s.sortWrap}>
          <ArrowUpDown size={12} aria-hidden className={s.sortIcon} />
          <Select value={sort} onValueChange={(v) => onSortChange(v as SortKey)}>
            <SelectTrigger className={s.sortSelect} aria-label="مرتب‌سازی">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">جدیدترین</SelectItem>
              <SelectItem value="oldest">قدیمی‌ترین</SelectItem>
              <SelectItem value="amount">بیشترین مبلغ</SelectItem>
              <SelectItem value="customer">نام مشتری</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {canAdd && (
          <button type="button" className={s.addBtn} onClick={onAddClick}>
            <Plus size={14} strokeWidth={2.2} aria-hidden />
            <span>ثبت تراکنش</span>
          </button>
        )}
      </div>

      {/* ── Layer 3: Status filter chips ────────────────────────────── */}
      <div className={s.chips} role="group" aria-label="فیلتر وضعیت">
        <span className={s.chipsLabel}>وضعیت:</span>
        <Chip
          active={statusFilter === 'all'}
          onClick={() => onStatusChange('all')}
          variant="neutral"
        >
          همه
        </Chip>
        {Object.entries(TX_STATUS_FA).map(([k, conf]) => (
          <Chip
            key={k}
            active={statusFilter === k}
            onClick={() => onStatusChange(k)}
            variant={statusVariant(k)}
          >
            {conf.label}
          </Chip>
        ))}
      </div>
    </section>
  );
}

function statusVariant(status: string): 'amber' | 'cyan' | 'up' | 'down' | 'muted' {
  if (status === 'PENDING') return 'amber';
  if (status === 'PROCESSING') return 'cyan';
  if (status === 'COMPLETED') return 'up';
  if (status === 'FAILED' || status === 'REVERSED') return 'down';
  return 'muted';
}

function Chip({
  active,
  onClick,
  variant,
  children,
}: {
  active: boolean;
  onClick: () => void;
  variant: 'amber' | 'cyan' | 'up' | 'down' | 'muted' | 'neutral';
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-active={active}
      data-variant={variant}
      className={s.chip}
      aria-pressed={active}
    >
      {children}
    </button>
  );
}
