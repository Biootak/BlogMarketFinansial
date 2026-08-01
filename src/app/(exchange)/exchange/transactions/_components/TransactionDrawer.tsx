/**
 * TransactionDrawer — Drawer ثبت تراکنش جدید.
 *
 * بازطراحی شده با:
 *  - "Quick-pick" pill row برای kind (نه select)
 *  - "Amount Transit" visual برای EXCHANGE (مبدأ/نرخ/مقصد به‌صورت گرافیکی)
 *  - "Rate Live" indicator — وقتی نرخ پر شد، یک progress بصری مبدأ/مقصد نمایش داده می‌شود
 *  - "Live preview" — همان لحظه مبلغ مقصد محاسبه و نمایش داده می‌شود
 *  - sticky footer با confirm اصلی
 *
 * قانون: همه فیلدهای عددی LTR هستند. فرم تماماً RTL-aware.
 */

'use client';

import {
  ArrowLeftRight,
  CheckCircle2,
  CircleDollarSign,
  Coins,
  type LucideIcon,
  RefreshCw,
  Send,
  WalletCards,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useMemo, useState, type CSSProperties } from 'react';
import type { CustomerRow } from '@/actions/exchange-customers';
import { type TransactionRow, createTransaction } from '@/actions/exchange-transactions';
import { EXCHANGE_CURRENCIES, TX_KIND_FA } from '@/lib/exchange-labels';
import { faNum, formatAmount } from '@/lib/exchange-tx-formatters';
import { FormField, PanelDrawer } from '@/components/Dashboard/primitives';
import { SelectField } from './SelectField';
import s from './TransactionDrawer.module.css';

const KIND_ICON: Record<string, LucideIcon> = {
  DEPOSIT: CircleDollarSign,
  WITHDRAWAL: Send,
  EXCHANGE: ArrowLeftRight,
  TRANSFER: Send,
  FEE: Coins,
  SETTLEMENT: WalletCards,
  ADJUSTMENT: RefreshCw,
};

const KIND_ORDER = ['EXCHANGE', 'DEPOSIT', 'WITHDRAWAL', 'TRANSFER', 'FEE'] as const;

interface Props {
  open: boolean;
  onClose: () => void;
  exchangeId: string;
  customers: CustomerRow[];
  /** اگر تنظیم شود، پس از ثبت موفق به آن URL هدایت می‌شود (مثلاً detail page) */
  onCreated?: (tx: TransactionRow) => void;
}

export function TransactionDrawer({ open, onClose, exchangeId, customers, onCreated }: Props) {
  const router = useRouter();

  // Form state
  const [kind, setKind] = useState<(typeof KIND_ORDER)[number]>('EXCHANGE');
  const [customerId, setCustomerId] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('AFN');
  const [rate, setRate] = useState('');
  const [fee, setFee] = useState('0');
  const [destAmount, setDestAmount] = useState('');
  const [destCurrency, setDestCurrency] = useState('USD');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const customerId$ = useId();

  // reset on close
  useEffect(() => {
    if (open) return;
    setKind('EXCHANGE');
    setCustomerId('');
    setAmount('');
    setCurrency('AFN');
    setRate('');
    setFee('0');
    setDestAmount('');
    setDestCurrency('USD');
    setNote('');
    setError('');
  }, [open]);

  // live preview: محاسبه مقصد از نرخ
  const livePreview = useMemo(() => {
    const a = Number.parseFloat(amount);
    const r = Number.parseFloat(rate);
    if (kind === 'EXCHANGE' && a > 0 && r > 0) {
      return {
        computed: (a * r).toFixed(2),
        fromAmount: a,
        fromCurrency: currency,
        toCurrency: destCurrency,
        rate: r,
      };
    }
    return null;
  }, [amount, rate, currency, destCurrency, kind]);

  const canSubmit =
    customerId && amount && Number.parseFloat(amount) > 0 && (kind !== 'EXCHANGE' || destAmount);

  async function handleSubmit() {
    if (!canSubmit) {
      setError('مشتری و مبلغ الزامی هستند');
      return;
    }
    setSaving(true);
    setError('');
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
      onCreated?.(result.data);
      onClose();
      router.refresh();
    } else {
      setError(result.error.message);
    }
  }

  const inputProps = {
    className: s.input,
    style: { direction: 'ltr' as const },
  };

  return (
    <PanelDrawer
      open={open}
      title="ثبت تراکنش جدید"
      onClose={onClose}
      width="min(540px, 100%)"
      footer={
        <div className={s.footer}>
          <button
            type="button"
            className={s.submitBtn}
            onClick={handleSubmit}
            disabled={!canSubmit || saving}
            data-busy={saving}
          >
            {saving ? (
              <>
                <span className={s.spinner} aria-hidden />
                در حال ثبت…
              </>
            ) : (
              <>
                <CheckCircle2 size={14} strokeWidth={2.2} aria-hidden />
                ثبت نهایی
              </>
            )}
          </button>
          <button type="button" className={s.cancelBtn} onClick={onClose}>
            انصراف
          </button>
        </div>
      }
    >
      <div className={s.body} dir="rtl">
        {error && (
          <div className={s.error} role="alert">
            {error}
          </div>
        )}

        {/* ── Kind picker: pill row به جای select ──────────────────────── */}
        <FormField label="نوع تراکنش" required>
          <div className={s.kindPicker} role="radiogroup" aria-label="نوع تراکنش">
            {KIND_ORDER.map((k) => {
              const Icon = KIND_ICON[k];
              const isActive = kind === k;
              return (
                <button
                  key={k}
                  type="button"
                  role="radio"
                  aria-checked={isActive}
                  className={s.kindPill}
                  data-active={isActive}
                  onClick={() => setKind(k)}
                >
                  {/* متن در RTL سمت راست (ابتدا) — آیکون در سمت چپ (انتها) */}
                  <span>{TX_KIND_FA[k]}</span>
                  <Icon size={12} strokeWidth={1.8} aria-hidden />
                </button>
              );
            })}
          </div>
        </FormField>

        {/* ── Customer select ──────────────────────────────────────────── */}
        <FormField label="مشتری" required>
          <SelectField
            id={customerId$}
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
          >
            <option value="">انتخاب مشتری…</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.fullName} — {c.phone}
              </option>
            ))}
          </SelectField>
        </FormField>

        {/* ── Source amount + currency ────────────────────────────────── */}
        <div className={s.grid2}>
          <FormField label={kind === 'EXCHANGE' ? 'مبلغ مبدأ' : 'مبلغ'} required>
            <input
              {...inputProps}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              type="number"
              min="0"
              step="any"
              placeholder="0.00"
            />
          </FormField>
          <FormField label="ارز">
            <SelectField
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            >
              {EXCHANGE_CURRENCIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </SelectField>
          </FormField>
        </div>

        {/* ── EXCHANGE-specific: amount transit (signature moment) ────── */}
        {kind === 'EXCHANGE' && (
          <div className={s.transit} aria-label="محاسبه تراکنش تبدیل ارز">
            <div className={s.transitTop}>
              <span className={s.transitFrom}>
                {amount && Number.parseFloat(amount) > 0
                  ? formatAmount(
                      (Number.parseFloat(amount) * 100).toFixed(0),
                      currency,
                    )
                  : `۰ ${currency}`}
              </span>
              <span className={s.transitArrow} aria-hidden>
                <ArrowLeftRight size={14} strokeWidth={2} />
              </span>
              <span className={s.transitTo}>
                {destAmount && Number.parseFloat(destAmount) > 0
                  ? formatAmount(
                      (Number.parseFloat(destAmount) * 100).toFixed(0),
                      destCurrency,
                    )
                  : livePreview
                    ? formatAmount(
                        (Number.parseFloat(livePreview.computed) * 100).toFixed(0),
                        destCurrency,
                      )
                    : `۰ ${destCurrency}`}
              </span>
            </div>

            <div className={s.transitGrid}>
              <FormField label="مبلغ مقصد" hint={livePreview ? 'پیش‌نمایش زنده فعال' : undefined}>
                <input
                  {...inputProps}
                  value={destAmount}
                  onChange={(e) => setDestAmount(e.target.value)}
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0.00"
                />
              </FormField>
              <FormField label="ارز مقصد">
                <SelectField
                  value={destCurrency}
                  onChange={(e) => setDestCurrency(e.target.value)}
                >
                  {EXCHANGE_CURRENCIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </SelectField>
              </FormField>
            </div>

            <div className={s.rateRow}>
              <FormField label="نرخ تبدیل" hint="اختیاری — برای پیش‌نمایش زنده">
                <input
                  {...inputProps}
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                  type="number"
                  min="0"
                  step="any"
                  placeholder="نرخ"
                />
              </FormField>
              {livePreview && (
                <div className={s.rateLive} aria-live="polite">
                  <span className={s.rateLiveDot} />
                  <span>پیش‌نمایش زنده</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Fee (همیشه) ────────────────────────────────────────────── */}
        {kind !== 'EXCHANGE' && (
          <div className={s.grid2}>
            <FormField label="کارمزد" hint="اختیاری">
              <input
                {...inputProps}
                value={fee}
                onChange={(e) => setFee(e.target.value)}
                type="number"
                min="0"
                step="any"
                placeholder="0"
              />
            </FormField>
            <FormField label="نرخ" hint="اختیاری">
              <input
                {...inputProps}
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                type="number"
                min="0"
                step="any"
                placeholder="نرخ"
              />
            </FormField>
          </div>
        )}

        {/* ── Note (همیشه) ───────────────────────────────────────────── */}
        <FormField label="یادداشت" hint="اختیاری — حداکثر ۵۰۰ کاراکتر">
          <input
            className={s.input}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="توضیح تراکنش…"
            maxLength={500}
          />
        </FormField>

        {/* ── Summary footer داخل body (پیش از footer اصلی) ──────────── */}
        {canSubmit && (
          <div
            className={s.summary}
            style={{ '--summary-i': 0 } as CSSProperties}
            aria-label="خلاصه تراکنش"
          >
            <span className={s.summaryLabel}>خلاصه:</span>
            <span className={s.summaryValue}>
              {faNum(Number.parseFloat(amount))} {currency}
              {kind === 'EXCHANGE' && destAmount && (
                <>
                  <ArrowLeftRight size={10} aria-hidden className={s.summaryArrow} />
                  {faNum(Number.parseFloat(destAmount))} {destCurrency}
                </>
              )}
              {Number.parseFloat(fee) > 0 && (
                <span className={s.summaryFee}>+ کارمزد {faNum(Number.parseFloat(fee))} {currency}</span>
              )}
            </span>
          </div>
        )}
      </div>
    </PanelDrawer>
  );
}
