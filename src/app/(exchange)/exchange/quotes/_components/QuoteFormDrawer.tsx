'use client';

/**
 * QuoteFormDrawer — فرم ثبت قیمت جدید (PanelDrawer).
 *
 * انتخاب ارز با CurrencySelect (shared، با جستجو)، نرخ خرید/فروش،
 * واحد، بازهٔ مجاز و مدت اعتبار. پیشنهاد بازار از action واقعی
 * getAutoSuggestedRates می‌آید (snapshot نرخ بازار + اسپرد ۱.۵٪).
 */

import type { QuoteRow } from '@/actions/exchange-quotes';
import { getAutoSuggestedRates, submitQuote } from '@/actions/exchange-quotes';
import { FormField, PanelDrawer } from '@/components/Dashboard/primitives';
import { type CurrencyItem, CurrencySelect } from '@/components/ui/CurrencySelect';
import { useToast } from '@/components/ui/use-toast';
import {
  QUOTE_CURRENCIES,
  UNIT_FA,
  quoteNumber,
  sortCurrenciesMeta,
  spreadPct,
} from '@/lib/exchange-quotes-labels';
import { CheckCircle2, Loader2, Sparkles, XCircle } from 'lucide-react';
import { useCallback, useEffect, useState, useTransition } from 'react';
import s from './QuotesWorkspace.module.css';

interface Props {
  open: boolean;
  exchangeId: string;
  allowedCurrencies: string[];
  onClose: () => void;
  onSaved: (quote: QuoteRow) => void;
}

interface FormState {
  currencyCode: string;
  buyRate: string;
  sellRate: string;
  unit: string;
  minAmount: string;
  maxAmount: string;
  validMinutes: string;
}

const EMPTY_FORM: FormState = {
  currencyCode: 'USD',
  buyRate: '',
  sellRate: '',
  unit: 'afn',
  minAmount: '',
  maxAmount: '',
  validMinutes: '60',
};

const VALID_MINUTES = [
  { value: '30', label: '۳۰ دقیقه' },
  { value: '60', label: '۱ ساعت' },
  { value: '120', label: '۲ ساعت' },
  { value: '240', label: '۴ ساعت' },
  { value: '480', label: '۸ ساعت' },
  { value: '720', label: '۱۲ ساعت' },
  { value: '1440', label: '۲۴ ساعت' },
];

export function QuoteFormDrawer({ open, exchangeId, allowedCurrencies, onClose, onSaved }: Props) {
  const { toast } = useToast();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [suggestion, setSuggestion] = useState<{
    marketBuyRate: number;
    marketSellRate: number;
    suggestedBuyRate: number;
    suggestedSellRate: number;
    spreadPercent: number;
    unit: string;
    source: string;
    confidence: string;
  } | null>(null);
  const [suggestPending, setSuggestPending] = useState(false);

  // ── کاتالوگ ارزها ───────────────────────────────────────────────────
  const list = sortCurrenciesMeta(
    allowedCurrencies.length > 0
      ? QUOTE_CURRENCIES.filter((c) => allowedCurrencies.includes(c.code))
      : QUOTE_CURRENCIES,
  );
  const items: CurrencyItem[] = list.map((c) => ({ value: c.code, code: c.code, label: c.name }));

  // ── reset وقتی drawer بسته می‌شود ─────────────────────────────────────
  useEffect(() => {
    if (open) {
      setForm(EMPTY_FORM);
      setError(null);
      setSuggestion(null);
    }
  }, [open]);

  const handleCurrencyChange = useCallback((code: string) => {
    const cur = QUOTE_CURRENCIES.find((c) => c.code === code);
    setForm((f) => ({ ...f, currencyCode: code, unit: cur?.unit ?? 'afn' }));
    setSuggestion(null);
  }, []);

  const handleAutoSuggest = useCallback(async () => {
    if (!form.currencyCode) return;
    setSuggestPending(true);
    setError(null);
    const res = await getAutoSuggestedRates(exchangeId, form.currencyCode, 1.5);
    setSuggestPending(false);
    if (res.success) {
      const s = res.data;
      setSuggestion({
        marketBuyRate: s.marketBuyRate,
        marketSellRate: s.marketSellRate,
        suggestedBuyRate: s.suggestedBuyRate,
        suggestedSellRate: s.suggestedSellRate,
        spreadPercent: s.spreadPercent,
        unit: s.unit,
        source: s.source,
        confidence: s.confidence,
      });
      setForm((f) => ({
        ...f,
        buyRate: s.suggestedBuyRate.toString(),
        sellRate: s.suggestedSellRate.toString(),
        unit: s.unit === 'toman' ? 'toman' : 'afn',
      }));
    } else {
      setError(res.error.message);
    }
  }, [exchangeId, form.currencyCode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const buy = Number(form.buyRate);
    const sell = Number(form.sellRate);
    if (!form.buyRate || !form.sellRate || Number.isNaN(buy) || Number.isNaN(sell)) {
      setError('قیمت خرید و فروش الزامی است');
      return;
    }
    if (buy <= 0 || sell <= 0) {
      setError('قیمت‌ها باید مثبت باشند');
      return;
    }
    if (buy > sell) {
      setError('قیمت فروش باید بیشتر یا مساوی خرید باشد');
      return;
    }

    const cur = QUOTE_CURRENCIES.find((c) => c.code === form.currencyCode);

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
        toast({
          title: 'قیمت ثبت شد',
          description: `${form.currencyCode} در انتظار تایید ادمین`,
        });
        onSaved(res.data);
        onClose();
      } else {
        setError(res.error.message);
      }
    });
  };

  const liveSpread = form.buyRate && form.sellRate ? spreadPct(form.buyRate, form.sellRate) : '—';

  return (
    <PanelDrawer
      open={open}
      title="ثبت قیمت جدید"
      onClose={onClose}
      width="min(560px, 100vw)"
      footer={
        <div className={s.footer}>
          <button
            type="submit"
            form="quote-form"
            className={s.btnPrimary}
            disabled={isPending}
            aria-busy={isPending}
          >
            {isPending ? (
              <Loader2 size={15} className={s.spin} aria-hidden />
            ) : (
              <CheckCircle2 size={15} aria-hidden />
            )}
            {isPending ? 'در حال ثبت…' : 'ثبت قیمت'}
          </button>
          <button type="button" className={s.btnGhost} onClick={onClose} disabled={isPending}>
            انصراف
          </button>
        </div>
      }
    >
      <form id="quote-form" onSubmit={handleSubmit} className={s.form} aria-label="فرم ثبت قیمت">
        {/* ارز */}
        <FormField label="ارز" required>
          <CurrencySelect
            value={form.currencyCode}
            onChange={handleCurrencyChange}
            items={items}
            ariaLabel="انتخاب ارز"
            searchPlaceholder="جستجوی ارز..."
          />
        </FormField>

        {/* واحد */}
        <FormField label="واحد نرخ" hint="واحد پایهٔ نمایش نرخ">
          <select
            className={s.select}
            value={form.unit}
            onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
          >
            {Object.entries(UNIT_FA).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </FormField>

        {/* نرخ‌ها */}
        <div className={s.grid2}>
          <FormField label="قیمت خرید" hint="صرافی از مشتری می‌خرد" required>
            <input
              type="number"
              className={s.input}
              value={form.buyRate}
              onChange={(e) => setForm((f) => ({ ...f, buyRate: e.target.value }))}
              min="0"
              step="any"
              dir="ltr"
              placeholder="مثال: 71.20"
              required
            />
          </FormField>
          <FormField label="قیمت فروش" hint="صرافی به مشتری می‌فروشد" required>
            <input
              type="number"
              className={s.input}
              value={form.sellRate}
              onChange={(e) => setForm((f) => ({ ...f, sellRate: e.target.value }))}
              min="0"
              step="any"
              dir="ltr"
              placeholder="مثال: 71.80"
              required
            />
          </FormField>
        </div>

        {/* پیش‌نویس زنده */}
        {form.buyRate && form.sellRate ? (
          <div className={s.livePreview} aria-live="polite">
            <span className={s.livePreviewItem}>
              اسپرد: <strong dir="ltr">{liveSpread}</strong>
            </span>
            <span className={s.livePreviewItem}>
              خرید: <strong dir="ltr">{quoteNumber(form.buyRate)}</strong>
            </span>
            <span className={s.livePreviewItem}>
              فروش: <strong dir="ltr">{quoteNumber(form.sellRate)}</strong>
            </span>
          </div>
        ) : null}

        {/* پیشنهاد بازار */}
        <div className={s.suggestRow}>
          <button
            type="button"
            className={s.suggestBtn}
            onClick={handleAutoSuggest}
            disabled={suggestPending}
          >
            {suggestPending ? (
              <Loader2 size={14} className={s.spin} aria-hidden />
            ) : (
              <Sparkles size={14} aria-hidden />
            )}
            پیشنهاد بازار
          </button>
          <span className={s.suggestHint}>نرخ پیشنهادی بر اساس بازار + اسپرد {1.5}٪</span>
        </div>

        {suggestion ? (
          <output className={s.suggestPanel} aria-live="polite">
            <div className={s.suggestPanelHead}>
              <span className={s.suggestPanelTitle}>
                <Sparkles size={13} aria-hidden />
                نرخ بازار {form.currencyCode}
              </span>
              <span className={s.suggestSource}>{suggestion.source}</span>
            </div>
            <div className={s.suggestRates}>
              <span>
                خرید <strong dir="ltr">{quoteNumber(suggestion.marketBuyRate)}</strong>
              </span>
              <span>
                فروش <strong dir="ltr">{quoteNumber(suggestion.marketSellRate)}</strong>
              </span>
              <span className={s.suggestConfidence} data-confidence={suggestion.confidence}>
                {suggestion.confidence === 'high'
                  ? 'داده تازه'
                  : suggestion.confidence === 'medium'
                    ? 'نسبتاً تازه'
                    : 'قدیمی'}
              </span>
            </div>
          </output>
        ) : null}

        {/* بازهٔ مجاز */}
        <div className={s.grid2}>
          <FormField label="حداقل مبلغ" hint="اختیاری">
            <input
              type="number"
              className={s.input}
              value={form.minAmount}
              onChange={(e) => setForm((f) => ({ ...f, minAmount: e.target.value }))}
              min="0"
              dir="ltr"
              placeholder="۰"
            />
          </FormField>
          <FormField label="حداکثر مبلغ" hint="اختیاری">
            <input
              type="number"
              className={s.input}
              value={form.maxAmount}
              onChange={(e) => setForm((f) => ({ ...f, maxAmount: e.target.value }))}
              min="0"
              dir="ltr"
              placeholder="بدون محدودیت"
            />
          </FormField>
        </div>

        {/* مدت اعتبار */}
        <FormField label="مدت اعتبار" hint="پس از تایید ادمین، به این مدت در سایت نمایش داده می‌شود">
          <select
            className={s.select}
            value={form.validMinutes}
            onChange={(e) => setForm((f) => ({ ...f, validMinutes: e.target.value }))}
          >
            {VALID_MINUTES.map((v) => (
              <option key={v.value} value={v.value}>
                {v.label}
              </option>
            ))}
          </select>
        </FormField>

        {error && (
          <div className={s.formError} role="alert">
            <XCircle size={16} aria-hidden /> {error}
          </div>
        )}
      </form>
    </PanelDrawer>
  );
}
