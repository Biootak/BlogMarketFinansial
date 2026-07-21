'use client';

/**
 * TransactionsWorkspace — ثبت و مشاهده تراکنش‌های صراف.
 * دکمه «تراکنش جدید» → drawer با فرم کامل.
 */

import type { CustomerRow } from '@/actions/exchange-customers';
import { type TransactionRow, createTransaction } from '@/actions/exchange-transactions';
import { type Column, DataTable, EmptyState, FormField } from '@/components/Dashboard/primitives';
import { Plus, Search } from 'lucide-react';
import { X } from 'lucide-react';
import { type CSSProperties, useCallback, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import s from './TransactionsWorkspace.module.css';

const KIND_FA: Record<string, string> = {
  DEPOSIT: 'واریز',
  WITHDRAWAL: 'برداشت',
  EXCHANGE: 'صرافی',
  TRANSFER: 'انتقال',
  FEE: 'کارمزد',
};
const STATUS_FA: Record<string, string> = {
  COMPLETED: 'تکمیل',
  PENDING: 'در انتظار',
  FAILED: 'ناموفق',
  CANCELLED: 'لغو',
};
const CURRENCIES = ['AFN', 'USD', 'EUR', 'IRR', 'AED', 'GBP', 'TRY', 'SAR', 'PKR'];

interface Props {
  exchangeId: string;
  initialRows: TransactionRow[];
  customers: CustomerRow[];
  staffRole: string;
}

export default function TransactionsWorkspace({
  exchangeId,
  initialRows,
  customers,
  staffRole,
}: Props) {
  const [rows, setRows] = useState(initialRows);
  const [query, setQuery] = useState('');
  const [kindFilter, setKindFilter] = useState('all');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Drawer form state
  const [customerId, setCustomerId] = useState('');
  const [kind, setKind] = useState('EXCHANGE');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('AFN');
  const [rate, setRate] = useState('');
  const [fee, setFee] = useState('0');
  const [destAmount, setDestAmount] = useState('');
  const [destCurrency, setDestCurrency] = useState('USD');
  const [note, setNote] = useState('');
  const [formError, setFormError] = useState('');

  const canAdd = ['OWNER', 'MANAGER', 'STAFF'].includes(staffRole);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (kindFilter !== 'all' && r.kind !== kindFilter) return false;
      if (!q) return true;
      return (
        (r.customer?.fullName ?? '').toLowerCase().includes(q) ||
        (r.customer?.phone ?? '').includes(q)
      );
    });
  }, [rows, query, kindFilter]);

  const handleSubmit = useCallback(async () => {
    if (!customerId || !amount || Number.parseFloat(amount) <= 0) {
      setFormError('مشتری و مبلغ الزامی هستند');
      return;
    }
    setSaving(true);
    setFormError('');
    const result = await createTransaction(exchangeId, {
      customerId,
      kind,
      amount: Number.parseFloat(amount),
      currency,
      rate: rate ? Number.parseFloat(rate) : null,
      fee: Number.parseFloat(fee) || 0,
      destAmount: destAmount ? Number.parseFloat(destAmount) : null,
      destCurrency: destCurrency || null,
      note: note || null,
    });
    setSaving(false);
    if (result.success) {
      setDrawerOpen(false);
      setRows((prev) => [result.data, ...prev]);
      setAmount('');
      setRate('');
      setFee('0');
      setDestAmount('');
      setNote('');
      setCustomerId('');
    } else {
      setFormError(result.error.message);
    }
  }, [customerId, kind, amount, currency, rate, fee, destAmount, destCurrency, note, exchangeId]);

  const columns: Column<TransactionRow>[] = [
    {
      key: 'customer',
      header: 'مشتری',
      render: (r) => (
        <div>
          <div style={{ fontWeight: 600, fontSize: 'var(--ds-text-sm)' }}>
            {r.customer?.fullName ?? '—'}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--at-fg-subtle)', direction: 'ltr' }}>
            {r.customer?.phone ?? ''}
          </div>
        </div>
      ),
      width: '160px',
    },
    {
      key: 'kind',
      header: 'نوع',
      render: (r) => <span className={s.kindBadge}>{KIND_FA[r.kind] ?? r.kind}</span>,
    },
    {
      key: 'amount',
      header: 'مبلغ',
      render: (r) => (
        <span className="tabular-nums">
          {new Intl.NumberFormat('fa-IR').format(Number(r.amount) / 100)} {r.currency}
        </span>
      ),
    },
    {
      key: 'destAmount',
      header: 'مبلغ مقصد',
      render: (r) =>
        r.destAmount ? (
          <span className="tabular-nums">
            {new Intl.NumberFormat('fa-IR').format(Number(r.destAmount) / 100)}{' '}
            {r.destCurrency ?? ''}
          </span>
        ) : (
          <span style={{ color: 'var(--at-fg-subtle)' }}>—</span>
        ),
    },
    {
      key: 'status',
      header: 'وضعیت',
      render: (r) => (
        <span
          className={`${s.statusBadge} ${r.status === 'COMPLETED' ? s.statusCompleted : s.statusPending}`}
        >
          {STATUS_FA[r.status] ?? r.status}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'تاریخ',
      render: (r) => (
        <span className="tabular-nums" style={{ fontSize: '12px', color: 'var(--at-fg-subtle)' }}>
          {new Intl.DateTimeFormat('fa-IR', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }).format(new Date(r.createdAt as string))}
        </span>
      ),
    },
  ];

  // Drawer styles
  const overlay: CSSProperties = {
    position: 'fixed',
    inset: 0,
    zIndex: 1000,
    background: 'rgba(0,0,0,0.45)',
    backdropFilter: 'blur(2px)',
    display: 'flex',
    alignItems: 'stretch',
    justifyContent: 'flex-end',
  };
  const panel: CSSProperties = {
    width: 'min(460px, 100vw)',
    height: '100%',
    overflowY: 'auto',
    background: 'var(--at-surface, #fff)',
    borderInlineStart: '1px solid var(--at-line)',
    display: 'flex',
    flexDirection: 'column',
  };
  const inp: CSSProperties = {
    width: '100%',
    height: '2.4rem',
    padding: '0 0.75rem',
    fontSize: 'var(--ds-text-sm)',
    fontFamily: 'inherit',
    color: 'var(--at-fg)',
    background: 'var(--at-canvas-subtle, #f7f8fa)',
    border: '1px solid var(--at-line)',
    borderRadius: '8px',
    outline: 'none',
  };

  return (
    <>
      <div className={s.toolbar}>
        <div className={s.filterRow}>
          {['all', ...Object.keys(KIND_FA)].map((k) => (
            <button
              key={k}
              type="button"
              className={`${s.filterBtn} ${kindFilter === k ? s.filterBtnActive : ''}`}
              onClick={() => setKindFilter(k)}
            >
              {k === 'all' ? 'همه' : KIND_FA[k]}
            </button>
          ))}
        </div>
        <div className={s.toolbarEnd}>
          <div className={s.searchWrap}>
            <Search className={s.searchIcon} aria-hidden />
            <input
              className={s.searchInput}
              placeholder="جستجو مشتری…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          {canAdd && (
            <button type="button" className={s.addBtn} onClick={() => setDrawerOpen(true)}>
              <Plus className="w-4 h-4" />
              <span>تراکنش جدید</span>
            </button>
          )}
        </div>
      </div>

      <div className={s.tableWrap}>
        <DataTable
          columns={columns}
          rows={filtered}
          rowKey={(r) => r.id}
          ariaLabel="لیست تراکنش‌ها"
          empty={<EmptyState title="تراکنشی یافت نشد" description="اولین تراکنش را ثبت کنید." />}
        />
      </div>

      {/* New Transaction Drawer */}
      {drawerOpen &&
        typeof window !== 'undefined' &&
        createPortal(
          <div
            style={overlay}
            role="presentation"
            onClick={(e) => e.target === e.currentTarget && setDrawerOpen(false)}
            onKeyDown={(e) => e.key === 'Escape' && setDrawerOpen(false)}
          >
            {/* U10-fix: dialog بدون display:contents — semantic و a11y درست */}
            <dialog
              open
              aria-label="تراکنش جدید"
              style={{ border: 'none', padding: 0, background: 'transparent', margin: 0 }}
            >
              <div style={panel}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '1.25rem 1.5rem',
                    borderBottom: '1px solid var(--at-line)',
                    position: 'sticky',
                    top: 0,
                    background: 'var(--at-surface)',
                    zIndex: 1,
                  }}
                >
                  <span
                    style={{
                      fontSize: 'var(--ds-text-base)',
                      fontWeight: 700,
                      color: 'var(--at-fg)',
                    }}
                  >
                    تراکنش جدید
                  </span>
                  <button
                    type="button"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '2rem',
                      height: '2rem',
                      border: '1px solid var(--at-line)',
                      borderRadius: '6px',
                      background: 'transparent',
                      cursor: 'pointer',
                      color: 'var(--at-fg-subtle)',
                    }}
                    onClick={() => setDrawerOpen(false)}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div
                  style={{
                    flex: 1,
                    padding: '1.5rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1.25rem',
                  }}
                >
                  {formError && (
                    <div
                      style={{
                        padding: '0.75rem 1rem',
                        background: 'oklch(97% 0.03 25)',
                        border: '1px solid oklch(80% 0.08 25)',
                        borderRadius: '8px',
                        fontSize: 'var(--ds-text-sm)',
                        color: 'oklch(45% 0.15 25)',
                      }}
                    >
                      {formError}
                    </div>
                  )}

                  <FormField label="مشتری" required>
                    <select
                      style={{ ...inp, cursor: 'pointer' }}
                      value={customerId}
                      onChange={(e) => setCustomerId(e.target.value)}
                    >
                      <option value="">انتخاب مشتری…</option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.fullName} — {c.phone}
                        </option>
                      ))}
                    </select>
                  </FormField>

                  <FormField label="نوع تراکنش" required>
                    <select
                      style={{ ...inp, cursor: 'pointer' }}
                      value={kind}
                      onChange={(e) => setKind(e.target.value)}
                    >
                      {Object.entries(KIND_FA).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </FormField>

                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
                    <FormField label="مبلغ" required>
                      <input
                        style={{ ...inp, direction: 'ltr' }}
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        type="number"
                        min="0"
                        step="any"
                        placeholder="0.00"
                      />
                    </FormField>
                    <FormField label="ارز">
                      <select
                        style={{ ...inp, cursor: 'pointer' }}
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                      >
                        {CURRENCIES.map((c) => (
                          <option key={c}>{c}</option>
                        ))}
                      </select>
                    </FormField>
                  </div>

                  {kind === 'EXCHANGE' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
                      <FormField label="مبلغ مقصد">
                        <input
                          style={{ ...inp, direction: 'ltr' }}
                          value={destAmount}
                          onChange={(e) => setDestAmount(e.target.value)}
                          type="number"
                          min="0"
                          step="any"
                          placeholder="0.00"
                        />
                      </FormField>
                      <FormField label="ارز مقصد">
                        <select
                          style={{ ...inp, cursor: 'pointer' }}
                          value={destCurrency}
                          onChange={(e) => setDestCurrency(e.target.value)}
                        >
                          {CURRENCIES.map((c) => (
                            <option key={c}>{c}</option>
                          ))}
                        </select>
                      </FormField>
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <FormField label="نرخ تبدیل" hint="اختیاری">
                      <input
                        style={{ ...inp, direction: 'ltr' }}
                        value={rate}
                        onChange={(e) => setRate(e.target.value)}
                        type="number"
                        min="0"
                        step="any"
                        placeholder="نرخ"
                      />
                    </FormField>
                    <FormField label="کارمزد">
                      <input
                        style={{ ...inp, direction: 'ltr' }}
                        value={fee}
                        onChange={(e) => setFee(e.target.value)}
                        type="number"
                        min="0"
                        step="any"
                        placeholder="0"
                      />
                    </FormField>
                  </div>

                  <FormField label="یادداشت">
                    <input
                      style={inp}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="توضیح اختیاری"
                    />
                  </FormField>
                </div>

                <div
                  style={{
                    padding: '1rem 1.5rem',
                    borderTop: '1px solid var(--at-line)',
                    display: 'flex',
                    gap: '0.75rem',
                    position: 'sticky',
                    bottom: 0,
                    background: 'var(--at-surface)',
                  }}
                >
                  <button
                    type="button"
                    style={{
                      height: '2.4rem',
                      padding: '0 1.5rem',
                      fontSize: 'var(--ds-text-sm)',
                      fontFamily: 'inherit',
                      fontWeight: 600,
                      color: '#fff',
                      background: 'var(--at-accent)',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: saving ? 'wait' : 'pointer',
                      opacity: saving ? 0.7 : 1,
                    }}
                    onClick={handleSubmit}
                    disabled={saving}
                  >
                    {saving ? 'در حال ثبت…' : 'ثبت تراکنش'}
                  </button>
                  <button
                    type="button"
                    style={{
                      height: '2.4rem',
                      padding: '0 1.25rem',
                      fontSize: 'var(--ds-text-sm)',
                      fontFamily: 'inherit',
                      color: 'var(--at-fg-subtle)',
                      background: 'transparent',
                      border: '1px solid var(--at-line)',
                      borderRadius: '8px',
                      cursor: 'pointer',
                    }}
                    onClick={() => setDrawerOpen(false)}
                  >
                    انصراف
                  </button>
                </div>
              </div>
            </dialog>
          </div>,
          document.body,
        )}
    </>
  );
}
