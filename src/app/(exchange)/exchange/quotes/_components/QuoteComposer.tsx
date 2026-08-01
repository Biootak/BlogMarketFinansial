'use client';

/**
 * QuoteComposer — مودال ثبت قیمت «کامپوزر نرخ» (بازطراحی از نو).
 *
 * چیدمان دو ستونه:
 *  - راست: انتخاب ارز + استپرهای نرخ خرید/فروش (مثل ترمینال معاملات) +
 *    dial اسپرد + پیکربندی (حداقل/حداکثر/مدت)
 *  - چپ: کارت پیش‌نمایش زندهٔ سایت + مقایسه با بازار + خلاصهٔ ارسال
 *
 * فقط داده واقعی: نرخ بازار از getAutoSuggestedRates، ارسال با submitQuote.
 * RTL منطقی، موبایل‌فرست، token-only.
 */

import type { QuoteRow } from '@/actions/exchange-quotes';
import { getAutoSuggestedRates, submitQuote } from '@/actions/exchange-quotes';
import { type CurrencyItem, CurrencySelect } from '@/components/ui/CurrencySelect';
import { useToast } from '@/components/ui/use-toast';
import {
  QUOTE_CURRENCIES,
  quoteNumber,
  sortCurrenciesMeta,
  spreadPct,
} from '@/lib/exchange-quotes-labels';
import {
  Check,
  CheckCircle2,
  Landmark,
  Loader2,
  Minus,
  Plus,
  Sparkles,
  TrendingDown,
  TrendingUp,
  X,
  XCircle,
} from 'lucide-react';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { createPortal } from 'react-dom';
import s from './QuoteComposer.module.css';

interface Props {
  open: boolean;
  exchangeId: string;
  allowedCurrencies: string[];
  onClose: () => void;
  onSaved: (quote: QuoteRow) => void;
}

interface MarketRef {
  marketBuyRate: number;
  marketSellRate: number;
  source: string;
  confidence: string;
  suggestedBuyRate: number;
  suggestedSellRate: number;
}

const STEP_OPTIONS = [0.1, 0.5, 1, 5, 10, 50];
const DURATIONS = [
  { value: '30', label: '۳۰ دقیقه', short: '۳۰د' },
  { value: '60', label: '۱ ساعت', short: '۱س' },
  { value: '120', label: '۲ ساعت', short: '۲س' },
  { value: '240', label: '۴ ساعت', short: '۴س' },
  { value: '720', label: '۱۲ ساعت', short: '۱۲س' },
  { value: '1440', label: '۲۴ ساعت', short: '۲۴س' },
];
const DEFAULT_DURATION = '60';

export function QuoteComposer({ open, exchangeId, allowedCurrencies, onClose, onSaved }: Props) {
  const { toast } = useToast();
  const [currency, setCurrency] = useState('USD');
  const [unit, setUnit] = useState('afn');
  const [buy, setBuy] = useState('');
  const [sell, setSell] = useState('');
  const [minAmt, setMinAmt] = useState('');
  const [maxAmt, setMaxAmt] = useState('');
  const [duration, setDuration] = useState(DEFAULT_DURATION);
  const [stepIdx, setStepIdx] = useState(2);
  const [error, setError] = useState<string | null>(null);
  const [market, setMarket] = useState<MarketRef | null>(null);
  const [suggestPending, setSuggestPending] = useState(false);
  const [isPending, startTransition] = useTransition();

  const list = useMemo(
    () =>
      sortCurrenciesMeta(
        allowedCurrencies.length > 0
          ? QUOTE_CURRENCIES.filter((c) => allowedCurrencies.includes(c.code))
          : QUOTE_CURRENCIES,
      ),
    [allowedCurrencies],
  );
  const items: CurrencyItem[] = list.map((c) => ({ value: c.code, code: c.code, label: c.name }));

  const cur = QUOTE_CURRENCIES.find((c) => c.code === currency) ?? QUOTE_CURRENCIES[0];
  const step = STEP_OPTIONS[stepIdx] ?? 1;

  // reset هنگام باز شدن
  useEffect(() => {
    if (!open) return;
    setBuy('');
    setSell('');
    setMinAmt('');
    setMaxAmt('');
    setDuration(DEFAULT_DURATION);
    setStepIdx(2);
    setError(null);
    setMarket(null);
  }, [open]);

  const handleCurrency = (code: string) => {
    setCurrency(code);
    const meta = QUOTE_CURRENCIES.find((c) => c.code === code);
    setUnit(meta?.unit ?? 'afn');
    setMarket(null);
    setError(null);
  };

  const nudge = (side: 'buy' | 'sell', dir: 1 | -1) => {
    const setter = side === 'buy' ? setBuy : setSell;
    const current = Number(side === 'buy' ? buy : sell);
    const next = Number.isFinite(current) && current > 0 ? current + dir * step : step;
    setter(Math.max(0, Number(next.toFixed(4))).toString());
  };

  const handleAutoSuggest = async () => {
    setSuggestPending(true);
    setError(null);
    const res = await getAutoSuggestedRates(exchangeId, currency, 1.5);
    setSuggestPending(false);
    if (res.success) {
      const d = res.data;
      setMarket({
        marketBuyRate: d.marketBuyRate,
        marketSellRate: d.marketSellRate,
        suggestedBuyRate: d.suggestedBuyRate,
        suggestedSellRate: d.suggestedSellRate,
        source: d.source,
        confidence: d.confidence,
      });
      setUnit(d.unit === 'toman' ? 'toman' : 'afn');
      setBuy(d.suggestedBuyRate.toString());
      setSell(d.suggestedSellRate.toString());
    } else {
      setError(res.error.message);
    }
  };

  const applyMarket = () => {
    if (!market) return;
    setBuy(market.suggestedBuyRate.toString());
    setSell(market.suggestedSellRate.toString());
  };

  const buyNum = Number(buy);
  const sellNum = Number(sell);
  const hasBoth = Number.isFinite(buyNum) && buyNum > 0 && Number.isFinite(sellNum) && sellNum > 0;
  const spread = hasBoth ? ((sellNum - buyNum) / buyNum) * 100 : null;
  const marketSpread =
    market && hasBoth
      ? ((market.marketSellRate - market.marketBuyRate) / market.marketBuyRate) * 100
      : null;
  const buyDelta =
    market && buyNum > 0 ? ((buyNum - market.marketBuyRate) / market.marketBuyRate) * 100 : null;
  const sellDelta =
    market && sellNum > 0
      ? ((sellNum - market.marketSellRate) / market.marketSellRate) * 100
      : null;

  let dialTone: 'default' | 'gold' = 'default';
  let dialDesc = 'تفاوت بین نرخ خرید و فروش';
  if (spread !== null && marketSpread !== null) {
    if (spread <= marketSpread * 1.05) {
      dialDesc = 'اسپرد شما هم‌سطح بازار است — قابل رقابت';
    } else {
      dialTone = 'gold';
      dialDesc = 'اسپرد شما گشوده‌تر از بازار است';
    }
  }

  const validInput = hasBoth && buyNum <= sellNum;

  const handleSubmit = () => {
    setError(null);
    if (!hasBoth) {
      setError('قیمت خرید و فروش الزامی است');
      return;
    }
    if (buyNum <= 0 || sellNum <= 0) {
      setError('قیمت‌ها باید مثبت باشند');
      return;
    }
    if (buyNum > sellNum) {
      setError('قیمت فروش باید بیشتر یا مساوی خرید باشد');
      return;
    }

    startTransition(async () => {
      const res = await submitQuote(exchangeId, {
        currencyCode: currency,
        currencyPair: cur.pair,
        buyRate: buyNum,
        sellRate: sellNum,
        unit,
        minAmount: minAmt ? Number(minAmt) : null,
        maxAmount: maxAmt ? Number(maxAmt) : null,
        validMinutes: Number(duration) || 60,
      });
      if (res.success) {
        toast({ title: 'قیمت ثبت شد', description: `${currency} در انتظار تایید ادمین` });
        onSaved(res.data);
        onClose();
      } else {
        setError(res.error.message);
      }
    });
  };

  if (!open || typeof window === 'undefined') return null;

  const modal = (
    <div
      className={s.overlay}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <dialog open aria-label="ثبت قیمت جدید" className={s.panel}>
        {/* ── Header ─────────────────────────────────────────────────── */}
        <header className={s.header}>
          <span className={s.headerIcon}>
            <Landmark size={20} aria-hidden />
          </span>
          <div className={s.headerTitles}>
            <span className={s.headerTitle}>ثبت قیمت جدید</span>
            <span className={s.headerSub}>
              برای {cur.name} · {cur.pair}
            </span>
          </div>
          {market && (
            <span className={s.headerBadge}>
              <span className={s.liveDot} aria-hidden />
              بازار متصل
            </span>
          )}
          <button type="button" className={s.closeBtn} onClick={onClose} aria-label="بستن">
            <X size={16} aria-hidden />
          </button>
        </header>

        {/* ── Body ───────────────────────────────────────────────────── */}
        <div className={s.body}>
          {/* ═══ ستون ابزار ═══ */}
          <div className={s.instrument}>
            {/* انتخاب ارز */}
            <div className={s.pickRow}>
              <div className={s.pickCurrency}>
                <CurrencySelect
                  value={currency}
                  onChange={handleCurrency}
                  items={items}
                  ariaLabel="انتخاب ارز"
                  searchPlaceholder="جستجوی ارز..."
                />
              </div>
              <span className={s.pickUnit}>
                واحد
                {unit === 'toman' ? (
                  <button
                    type="button"
                    className={s.pickUnitBtn}
                    onClick={() => setUnit('afn')}
                    aria-label="تغییر واحد"
                  >
                    <Minus size={12} aria-hidden />
                  </button>
                ) : (
                  <button
                    type="button"
                    className={s.pickUnitBtn}
                    onClick={() => setUnit('toman')}
                    aria-label="تغییر واحد"
                  >
                    <Plus size={12} aria-hidden />
                  </button>
                )}
                {unit === 'toman' ? 'تومان' : 'AFN'}
              </span>
            </div>

            {/* استپرها */}
            <div className={s.stepperRow}>
              <div className={s.stepper}>
                <div className={s.stepperHead}>
                  <span className={s.stepperLabel}>خرید</span>
                  {buyDelta !== null && (
                    <span className={s.stepperDelta} data-dir={buyDelta > 0 ? 'dear' : 'cheap'}>
                      {buyDelta > 0 ? (
                        <TrendingUp size={10} aria-hidden />
                      ) : (
                        <TrendingDown size={10} aria-hidden />
                      )}
                      {Math.abs(buyDelta).toFixed(2)}٪
                    </span>
                  )}
                </div>
                <div className={s.stepperCtl}>
                  <button
                    type="button"
                    className={s.stepBtn}
                    onClick={() => nudge('buy', -1)}
                    disabled={isPending}
                    aria-label="کاهش نرخ خرید"
                  >
                    <Minus size={16} aria-hidden />
                  </button>
                  <input
                    type="number"
                    className={s.stepperInput}
                    value={buy}
                    onChange={(e) => setBuy(e.target.value)}
                    min="0"
                    step="any"
                    dir="ltr"
                    inputMode="decimal"
                    placeholder="71.20"
                    aria-label="قیمت خرید"
                  />
                  <button
                    type="button"
                    className={s.stepBtn}
                    onClick={() => nudge('buy', 1)}
                    disabled={isPending}
                    aria-label="افزایش نرخ خرید"
                  >
                    <Plus size={16} aria-hidden />
                  </button>
                </div>
              </div>

              <div className={s.stepper}>
                <div className={s.stepperHead}>
                  <span className={s.stepperLabel}>فروش</span>
                  {sellDelta !== null && (
                    <span className={s.stepperDelta} data-dir={sellDelta > 0 ? 'dear' : 'cheap'}>
                      {sellDelta > 0 ? (
                        <TrendingUp size={10} aria-hidden />
                      ) : (
                        <TrendingDown size={10} aria-hidden />
                      )}
                      {Math.abs(sellDelta).toFixed(2)}٪
                    </span>
                  )}
                </div>
                <div className={s.stepperCtl}>
                  <button
                    type="button"
                    className={s.stepBtn}
                    onClick={() => nudge('sell', -1)}
                    disabled={isPending}
                    aria-label="کاهش نرخ فروش"
                  >
                    <Minus size={16} aria-hidden />
                  </button>
                  <input
                    type="number"
                    className={s.stepperInput}
                    value={sell}
                    onChange={(e) => setSell(e.target.value)}
                    min="0"
                    step="any"
                    dir="ltr"
                    inputMode="decimal"
                    placeholder="71.80"
                    aria-label="قیمت فروش"
                  />
                  <button
                    type="button"
                    className={s.stepBtn}
                    onClick={() => nudge('sell', 1)}
                    disabled={isPending}
                    aria-label="افزایش نرخ فروش"
                  >
                    <Plus size={16} aria-hidden />
                  </button>
                </div>
              </div>
            </div>

            {/* گام تنظیم */}
            <div className={s.quickRow}>
              <span className={s.quickLabel}>گام:</span>
              {STEP_OPTIONS.map((v, i) => (
                <button
                  key={v}
                  type="button"
                  className={s.quickChip}
                  data-active={stepIdx === i}
                  onClick={() => setStepIdx(i)}
                >
                  {v}
                </button>
              ))}
            </div>

            {/* dial اسپرد */}
            {hasBoth && (
              <div className={s.spreadLine}>
                <div
                  className={s.spreadRing}
                  data-tone={dialTone}
                  style={
                    { '--spread': Math.max(0, Math.min(100, spread ?? 0)) } as React.CSSProperties
                  }
                  role="img"
                  aria-label={`اسپرد ${spread?.toFixed(2) ?? '—'} درصد`}
                >
                  <div className={s.spreadRingInner}>
                    <span className={s.spreadVal}>{spread?.toFixed(2) ?? '—'}</span>
                    <span className={s.spreadUnit}>٪ اسپرد</span>
                  </div>
                </div>
                <div className={s.spreadInfo}>
                  <span className={s.spreadTitle}>{dialDesc}</span>
                  <span className={s.spreadDesc}>
                    {unit === 'toman' ? 'تومان' : 'AFN'} · {cur.pair} ·{' '}
                    {market
                      ? `بازار ${market.source}`
                      : 'برای مقایسه با بازار، نرخ بازار را بگیرید'}
                  </span>
                </div>
              </div>
            )}

            {/* پیکربندی */}
            <div className={s.config}>
              <span className={s.configLabel}>بازهٔ معامله و اعتبار</span>
              <div className={s.configGrid}>
                <div>
                  <input
                    type="number"
                    className={s.limitInput}
                    value={minAmt}
                    onChange={(e) => setMinAmt(e.target.value)}
                    min="0"
                    dir="ltr"
                    placeholder="حداقل مبلغ (اختیاری)"
                    aria-label="حداقل مبلغ"
                  />
                </div>
                <div>
                  <input
                    type="number"
                    className={s.limitInput}
                    value={maxAmt}
                    onChange={(e) => setMaxAmt(e.target.value)}
                    min="0"
                    dir="ltr"
                    placeholder="حداکثر مبلغ (اختیاری)"
                    aria-label="حداکثر مبلغ"
                  />
                </div>
              </div>
              <div className={s.durationRow}>
                {DURATIONS.map((d) => (
                  <button
                    key={d.value}
                    type="button"
                    className={s.durationChip}
                    data-active={duration === d.value}
                    onClick={() => setDuration(d.value)}
                  >
                    {d.short}
                    <small>{d.label}</small>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ═══ ستون پیش‌نمایش ═══ */}
          <div className={s.preview}>
            {/* کارت زندهٔ سایت */}
            <div className={s.siteCard}>
              <div className={s.siteCardHead}>
                <span className={s.siteCardCode} dir="ltr">
                  {currency}
                </span>
                <span className={s.siteCardPair} dir="ltr">
                  {cur.pair}
                </span>
                <span className={s.siteCardStatus}>
                  <span className={s.siteCardStatusDot} aria-hidden />
                  {hasBoth ? 'آماده نمایش' : 'منتظر نرخ'}
                </span>
              </div>
              <div className={s.siteCardValues}>
                <div className={s.siteCardValue}>
                  <span className={s.siteCardValueLabel}>خرید</span>
                  <span className={s.siteCardValueNum} dir="ltr">
                    {buy ? quoteNumber(buy) : '—'}
                  </span>
                </div>
                <div className={s.siteCardValue}>
                  <span className={s.siteCardValueLabel}>فروش</span>
                  <span className={s.siteCardValueNum} dir="ltr">
                    {sell ? quoteNumber(sell) : '—'}
                  </span>
                </div>
              </div>
              <div className={s.siteCardFoot}>
                <span>
                  اسپرد <strong dir="ltr">{spread === null ? '—' : spreadPct(buy, sell)}</strong>
                </span>
                <span>
                  اعتبار{' '}
                  <strong dir="ltr">
                    {DURATIONS.find((d) => d.value === duration)?.label ?? '—'}
                  </strong>
                </span>
              </div>
            </div>

            {/* مقایسه با بازار */}
            {market ? (
              <div className={s.marketStrip}>
                <div className={s.marketStripHead}>
                  <span className={s.marketStripTitle}>
                    <Sparkles size={12} aria-hidden />
                    بازار {currency}
                  </span>
                  <span className={s.marketStripSource} dir="ltr">
                    {market.source}
                  </span>
                </div>
                <div className={s.marketRows}>
                  <div className={s.marketRow}>
                    <span className={s.marketRowLabel}>نرخ خرید بازار</span>
                    <span className={s.marketRowVal}>{quoteNumber(market.marketBuyRate)}</span>
                  </div>
                  <div className={s.marketRow}>
                    <span className={s.marketRowLabel}>نرخ فروش بازار</span>
                    <span className={s.marketRowVal}>{quoteNumber(market.marketSellRate)}</span>
                  </div>
                </div>
                <button
                  type="button"
                  className={s.marketApply}
                  onClick={applyMarket}
                  disabled={isPending}
                >
                  <Check size={13} aria-hidden />
                  اعمال نرخ پیشنهادی
                </button>
              </div>
            ) : (
              <div className={s.marketStrip}>
                <div className={s.marketStripHead}>
                  <span className={s.marketStripTitle}>
                    <Sparkles size={12} aria-hidden />
                    نرخ بازار
                  </span>
                </div>
                <p className={s.marketEmpty}>
                  نرخ زندهٔ بازار را بگیرید تا جایگاه شما مشخص شود.
                  <button
                    type="button"
                    className={s.marketHintBtn}
                    onClick={handleAutoSuggest}
                    disabled={suggestPending}
                  >
                    {suggestPending ? (
                      <Loader2 size={11} className={s.spin} aria-hidden />
                    ) : (
                      <Sparkles size={11} aria-hidden />
                    )}
                    {suggestPending ? 'در حال دریافت…' : 'دریافت نرخ بازار'}
                  </button>
                </p>
              </div>
            )}

            {/* وضعیت ارسال */}
            {error && (
              <div className={s.errorStrip} role="alert">
                <XCircle size={14} aria-hidden />
                {error}
              </div>
            )}
            {validInput && !error && (
              <div className={s.statusStrip}>
                <CheckCircle2 size={13} aria-hidden />
                قیمت‌ها معتبرند — پس از تایید ادمین در سایت نمایش داده می‌شوند.
              </div>
            )}
          </div>
        </div>

        {/* ── Footer ─────────────────────────────────────────────────── */}
        <footer className={s.footer}>
          <span className={s.footerHint}>
            <kbd>Enter</kbd> ثبت · <kbd>Esc</kbd> بستن
          </span>
          <button type="button" className={s.cancelBtn} onClick={onClose} disabled={isPending}>
            انصراف
          </button>
          <button
            type="button"
            className={s.submitBtn}
            onClick={handleSubmit}
            disabled={isPending || !validInput}
            aria-busy={isPending}
          >
            {isPending ? (
              <Loader2 size={16} className={s.spin} aria-hidden />
            ) : (
              <CheckCircle2 size={16} aria-hidden />
            )}
            {isPending ? 'در حال ثبت…' : 'ثبت قیمت'}
          </button>
        </footer>
      </dialog>
    </div>
  );

  return createPortal(modal, document.body);
}
