'use client';

/**
 * QuotesWorkspace — مدیریت قیمت‌های خرید/فروش صرافی
 * صراف از اینجا برای هر ارز قیمت ثبت می‌کند.
 */

import type { QuoteRow } from '@/actions/exchange-quotes';
import { submitQuote } from '@/actions/exchange-quotes';
import { CheckCircle2, Clock, Loader2, Plus, RefreshCw, X, XCircle } from 'lucide-react';
import { useCallback, useState, useTransition } from 'react';
import s from './QuotesWorkspace.module.css';

const SUPPORTED_CURRENCIES = [
  { code: 'USD', name: 'دلار آمریکا', pair: 'USD/AFN', unit: 'afn' },
  { code: 'EUR', name: 'یورو', pair: 'EUR/AFN', unit: 'afn' },
  { code: 'AED', name: 'درهم امارات', pair: 'AED/AFN', unit: 'afn' },
  { code: 'GBP', name: 'پوند انگلیس', pair: 'GBP/AFN', unit: 'afn' },
  { code: 'AFN', name: 'افغانی', pair: 'AFN/IRR', unit: 'toman' },
  { code: 'TRY', name: 'لیر ترکیه', pair: 'TRY/AFN', unit: 'afn' },
  { code: 'SAR', name: 'ریال عربستان', pair: 'SAR/AFN', unit: 'afn' },
  { code: 'CAD', name: 'دلار کانادا', pair: 'CAD/AFN', unit: 'afn' },
] as const;

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  PENDING:  { label: 'در انتظار تایید', color: 'var(--ds-warning)' },
  ACTIVE:   { label: 'فعال — در سایت', color: 'var(--ds-success)' },
  REJECTED: { label: 'رد شده', color: 'var(--ds-error)' },
  EXPIRED:  { label: 'منقضی', color: 'var(--ds-text-3)' },
  ARCHIVED: { label: 'آرشیو', color: 'var(--ds-text-3)' },
  LOCKED:   { label: 'در حال معامله', color: 'var(--ds-info, #3b82f6)' },
};

interface QuoteFormState {
  currencyCode: string;
  buyRate: string;
  sellRate: string;
  unit: string;
  minAmount: string;
  maxAmount: string;
  validMinutes: string;
}

const EMPTY_FORM: QuoteFormState = {
  currencyCode: 'USD',
  buyRate: '',
  sellRate: '',
  unit: 'afn',
  minAmount: '',
  maxAmount: '',
  validMinutes: '60',
};

interface Props {
  exchangeId: string;
  allowedCurrencies: string[];
  initialQuotes: QuoteRow[];
}

export default function QuotesWorkspace({ exchangeId, allowedCurrencies, initialQuotes }: Props) {
  const [quotes, setQuotes] = useState<QuoteRow[]>(initialQuotes);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<QuoteFormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  const availableCurrencies = allowedCurrencies.length > 0
    ? SUPPORTED_CURRENCIES.filter(c => allowedCurrencies.includes(c.code))
    : SUPPORTED_CURRENCIES;

  const handleCurrencyChange = useCallback((code: string) => {
    const cur = SUPPORTED_CURRENCIES.find(c => c.code === code);
    setForm(f => ({ ...f, currencyCode: code, unit: cur?.unit ?? 'afn' }));
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const buy = Number(form.buyRate);
    const sell = Number(form.sellRate);
    if (!form.buyRate || !form.sellRate || Number.isNaN(buy) || Number.isNaN(sell)) {
      setError('قیمت خرید و فروش الزامی است');
      return;
    }
    if (buy <= 0 || sell <= 0) { setError('قیمت‌ها باید مثبت باشند'); return; }
    if (buy > sell) { setError('قیمت فروش باید بیشتر یا مساوی خرید باشد'); return; }

    const cur = SUPPORTED_CURRENCIES.find(c => c.code === form.currencyCode);

    startTransition(async () => {
      const res = await submitQuote(exchangeId, {
        currencyCode: form.currencyCode,
        currencyPair: cur?.pair ?? `${form.currencyCode}/AFN`,
        buyRate: buy,
        sellRate: sell,
        unit: form.unit,
        minAmount: form.minAmount ? Number(form.minAmount) : null,
        maxAmount: form.maxAmount ? Number(form.maxAmount) : null,
        validMinutes: Number(form.validMinutes) || 60,
      });

      if (res.success) {
        setQuotes(prev => [res.data, ...prev.filter(q => !(q.currencyCode === form.currencyCode && q.status === 'PENDING'))]);
        setSaved(true);
        setForm(EMPTY_FORM);
        setTimeout(() => { setSaved(false); setShowForm(false); }, 1800);
      } else {
        setError(res.error.message);
      }
    });
  }

  function minutesLeft(expiresAt: Date | null): string {
    if (!expiresAt) return '';
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return 'منقضی';
    const m = Math.ceil(diff / 60000);
    return m >= 60 ? `${Math.floor(m / 60)} ساعت` : `${m} دقیقه`;
  }

  return (
    <div className={s.root}>
      {/* دکمه افزودن */}
      <div className={s.toolbar}>
        <button
          type="button"
          className={s.addBtn}
          onClick={() => { setShowForm(v => !v); setError(null); setSaved(false); }}
        >
          <Plus className="w-4 h-4" aria-hidden />
          ثبت قیمت جدید
        </button>
        <p className={s.hint}>
          پس از تایید ادمین، قیمت‌ها به مدت <strong>{form.validMinutes || 60} دقیقه</strong> در سایت نمایش داده می‌شوند.
        </p>
      </div>

      {/* فرم ثبت */}
      {showForm && (
        <form onSubmit={handleSubmit} className={s.form} aria-label="فرم ثبت قیمت">
          <div className={s.formHeader}>
            <h3 className={s.formTitle}>ثبت قیمت جدید</h3>
            <button type="button" onClick={() => setShowForm(false)} className={s.closeBtn} aria-label="بستن">
              <X className="w-4 h-4" aria-hidden />
            </button>
          </div>

          <div className={s.formGrid}>
            {/* ارز */}
            <div className={s.field}>
              <label htmlFor="q-currency" className={s.label}>ارز</label>
              <select
                id="q-currency"
                className={s.select}
                value={form.currencyCode}
                onChange={e => handleCurrencyChange(e.target.value)}
              >
                {availableCurrencies.map(c => (
                  <option key={c.code} value={c.code}>{c.name} ({c.code})</option>
                ))}
              </select>
            </div>

            {/* واحد */}
            <div className={s.field}>
              <label htmlFor="q-unit" className={s.label}>واحد</label>
              <select
                id="q-unit"
                className={s.select}
                value={form.unit}
                onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
              >
                <option value="afn">افغانی (AFN)</option>
                <option value="toman">تومان (IRR)</option>
                <option value="usd">دلار (USD)</option>
              </select>
            </div>

            {/* خرید */}
            <div className={s.field}>
              <label htmlFor="q-buy" className={s.label}>
                قیمت خرید
                <span className={s.labelHint}>(صرافی از مشتری می‌خرد)</span>
              </label>
              <input
                id="q-buy"
                type="number"
                className={s.input}
                value={form.buyRate}
                onChange={e => setForm(f => ({ ...f, buyRate: e.target.value }))}
                min="0"
                step="any"
                dir="ltr"
                required
                placeholder="مثال: 71.20"
              />
            </div>

            {/* فروش */}
            <div className={s.field}>
              <label htmlFor="q-sell" className={s.label}>
                قیمت فروش
                <span className={s.labelHint}>(صرافی به مشتری می‌فروشد)</span>
              </label>
              <input
                id="q-sell"
                type="number"
                className={s.input}
                value={form.sellRate}
                onChange={e => setForm(f => ({ ...f, sellRate: e.target.value }))}
                min="0"
                step="any"
                dir="ltr"
                required
                placeholder="مثال: 71.80"
              />
            </div>

            {/* حداقل */}
            <div className={s.field}>
              <label htmlFor="q-min" className={s.label}>
                حداقل مبلغ <span className={s.labelHint}>(اختیاری)</span>
              </label>
              <input
                id="q-min"
                type="number"
                className={s.input}
                value={form.minAmount}
                onChange={e => setForm(f => ({ ...f, minAmount: e.target.value }))}
                min="0"
                dir="ltr"
                placeholder="۰"
              />
            </div>

            {/* حداکثر */}
            <div className={s.field}>
              <label htmlFor="q-max" className={s.label}>
                حداکثر مبلغ <span className={s.labelHint}>(اختیاری)</span>
              </label>
              <input
                id="q-max"
                type="number"
                className={s.input}
                value={form.maxAmount}
                onChange={e => setForm(f => ({ ...f, maxAmount: e.target.value }))}
                min="0"
                dir="ltr"
                placeholder="بدون محدودیت"
              />
            </div>

            {/* مدت اعتبار */}
            <div className={s.field}>
              <label htmlFor="q-valid" className={s.label}>مدت اعتبار (دقیقه)</label>
              <select
                id="q-valid"
                className={s.select}
                value={form.validMinutes}
                onChange={e => setForm(f => ({ ...f, validMinutes: e.target.value }))}
              >
                <option value="30">۳۰ دقیقه</option>
                <option value="60">۱ ساعت</option>
                <option value="120">۲ ساعت</option>
                <option value="240">۴ ساعت</option>
                <option value="480">۸ ساعت</option>
                <option value="720">۱۲ ساعت</option>
                <option value="1440">۲۴ ساعت</option>
              </select>
            </div>
          </div>

          {/* پیش‌نمایش */}
          {form.buyRate && form.sellRate && (
            <div className={s.preview} role="status" aria-live="polite">
              <span className={s.previewLabel}>پیش‌نمایش:</span>
              <span className={s.previewItem}>
                خرید: <strong dir="ltr">{Number(form.buyRate).toLocaleString('fa-IR')}</strong>
              </span>
              <span className={s.previewSep}>|</span>
              <span className={s.previewItem}>
                فروش: <strong dir="ltr">{Number(form.sellRate).toLocaleString('fa-IR')}</strong>
              </span>
              <span className={s.previewItem}>
                اسپرد: <strong dir="ltr">
                  {form.buyRate && form.sellRate
                    ? (((Number(form.sellRate) - Number(form.buyRate)) / Number(form.buyRate)) * 100).toFixed(2)
                    : '0'}٪
                </strong>
              </span>
            </div>
          )}

          {error && (
            <div className={s.formError} role="alert">
              <XCircle className="w-4 h-4" aria-hidden /> {error}
            </div>
          )}
          {saved && (
            <output className={s.formSuccess}>
              <CheckCircle2 className="w-4 h-4" aria-hidden /> ثبت شد — در انتظار تایید ادمین
            </output>
          )}

          <div className={s.formFooter}>
            <button type="submit" className={s.submitBtn} disabled={isPending} aria-busy={isPending}>
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> : <Plus className="w-4 h-4" aria-hidden />}
              {isPending ? 'در حال ثبت…' : 'ثبت قیمت'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className={s.cancelBtn}>انصراف</button>
          </div>
        </form>
      )}

      {/* جدول قیمت‌های موجود */}
      {quotes.length === 0 ? (
        <div className={s.empty}>
          <RefreshCw className="w-8 h-8" style={{ opacity: 0.3 }} aria-hidden />
          <p>هنوز قیمتی ثبت نشده. اولین قیمت را ثبت کنید تا در سایت نمایش داده شود.</p>
        </div>
      ) : (
        <div className={s.tableWrap} role="table" aria-label="قیمت‌های ثبت‌شده">
          <div className={s.tableHead} role="row">
            <span role="columnheader">ارز</span>
            <span role="columnheader">خرید</span>
            <span role="columnheader">فروش</span>
            <span role="columnheader">واحد</span>
            <span role="columnheader">وضعیت</span>
            <span role="columnheader">انقضا</span>
          </div>
          {quotes.map(q => {
            const st = STATUS_LABEL[q.status] ?? { label: q.status, color: 'inherit' };
            return (
              <div key={q.id} className={s.tableRow} role="row" data-status={q.status}>
                <span className={s.cellCurrency} role="cell">
                  <strong>{q.currencyCode}</strong>
                  <small>{q.currencyPair}</small>
                </span>
                <span className={`${s.cellNum} tabular-nums`} role="cell" dir="ltr">
                  {Number(q.buyRate).toLocaleString('fa-IR')}
                </span>
                <span className={`${s.cellNum} tabular-nums`} role="cell" dir="ltr">
                  {Number(q.sellRate).toLocaleString('fa-IR')}
                </span>
                <span role="cell">{q.unit}</span>
                <span
                  className={s.statusBadge}
                  role="cell"
                  style={{ color: st.color }}
                >
                  {q.status === 'ACTIVE' && <span className={s.liveDot} aria-hidden />}
                  {st.label}
                </span>
                <span className={s.cellExpiry} role="cell">
                  {q.status === 'ACTIVE' && q.expiresAt ? (
                    <span className={s.countdown}>
                      <Clock className="w-3 h-3" aria-hidden />
                      {minutesLeft(q.expiresAt)}
                    </span>
                  ) : (
                    q.status === 'REJECTED' && q.note ? (
                      <span className={s.rejectNote} title={q.note}>دلیل: {q.note.slice(0, 40)}</span>
                    ) : '—'
                  )}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
