/**
 * CurrencyConverterCard — Shared currency converter widget.
 * --------------------------------------------------------------------------
 * single source of truth برای calculator های «تومان ↔ ارز» در سایت.
 *
 * استفاده‌ها:
 *   - money-transfer/HeroConverter (size="full")
 *   - exchanges/RateCalculator (size="compact")
 *
 * طراحی (defended 2026-07-29):
 *   - استفاده از CurrencySelect (P0 — NO NATIVE FORM CONTROLS).
 *   - استفاده از کلاس‌های mt-calc__* که از قبل در globals.css هستند
 *     (single style contract برای هر دو صفحه).
 *   - size="compact" حذف presets + rates + fee-bar + hint + CTA برای فضای کم.
 *   - size="full" = نسخه‌ی کامل مثل HeroConverter (بدون category chips).
 *
 * data shape:
 *   - items با `value`/`code`/`name`/`buy`/`sell` (همگی در تومان).
 *   - conversion pivot: IRT. ۱ FROM = (FROM.buy / TO.sell) TO
 *   - اگر units متفاوت باشند، unit prop هر آیتم رعایت می‌شود.
 */

'use client';

import { type CurrencyItem, CurrencySelect } from '@/components/ui/CurrencySelect';
import { useDirection } from '@/hooks/useDirection';
import { parseLocaleNumber } from '@/lib/money-transfer/hero';
import { ArrowDown, ArrowLeftRight, Lock, Send, TrendingUp } from 'lucide-react';
import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import styles from './CurrencyConverterCard.module.css';

export type ConverterSize = 'compact' | 'full';

export interface ConverterItem {
  /** Unique id used in the dropdown */
  value: string;
  /** Short code — e.g. "USD" */
  code: string;
  /** Human-readable name — e.g. "دلار آمریکا" */
  name: string;
  /** Toman price the exchange BUYS the user's source from (lower) */
  buy: number;
  /** Toman price the exchange SELLS the target to the user (higher) */
  sell: number;
  /** Unit for display — "toman" | "usd" | etc. (default "toman") */
  unit?: string;
  /** Decimal places for the converted result (default 2) */
  decimals?: number;
}

export interface CurrencyConverterCardProps {
  /** Available currency items */
  items: ConverterItem[];
  /**
   * Base unit mode. If set to "IRT", FROM is locked to toman (the pivot) and
   * the user enters a toman amount to convert to a target currency.
   * If undefined, FROM and TO are both selectable (bidirectional).
   */
  base?: 'IRT' | undefined;
  /** Default source code (matches `code` on an item) */
  defaultFromCode?: string;
  /** Default target code */
  defaultToCode?: string;
  /** Default amount entered in FROM field */
  defaultAmount?: number;
  /** Size variant — "compact" omits the hint, fee, presets, CTA */
  size?: ConverterSize;
  /** Best provider name — shown in the hint when size="full" */
  bestProvider?: string;
  /** Best spread % — shown in the hint when size="full" */
  bestSpread?: number;
  /** Lock timestamp label — e.g. "همین الآن" */
  freshnessLabel?: string;
  /** Submit handler (form submit). If provided, a CTA is shown. */
  onSubmit?: (payload: {
    amount: number;
    from: ConverterItem;
    to: ConverterItem;
  }) => void;
  /** CTA label (size="full" only) */
  submitLabel?: string;
  /** Optional accessible label for the card */
  ariaLabel?: string;
  /**
   * رنگ‌بندی dropdownها:
   *  - "light" (پیش‌فرض): برای صفحات روشن
   *  - "dark": برای صفحات تیره مثل /exchanges — پنل dropdown شیشه‌ای تیره
   */
  tone?: 'light' | 'dark';
}

const DEFAULT_AMOUNT = 1000;
const PRESETS_DEFAULT = [100, 500, 1000, 5000, 10000] as const;

// Cache برای formatFaRaw — جلوگیری از new Intl.NumberFormat در هر keystroke
const _fmtFaRawCache = new Map<number, Intl.NumberFormat>();
function _getFaRawFmt(decimals: number): Intl.NumberFormat {
  let f = _fmtFaRawCache.get(decimals);
  if (!f) {
    f = new Intl.NumberFormat('fa-IR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
      useGrouping: true,
    });
    _fmtFaRawCache.set(decimals, f);
  }
  return f;
}

function formatFaRaw(n: number, decimals: number): string {
  if (!Number.isFinite(n)) return '—';
  return _getFaRawFmt(decimals).format(n);
}

function formatRate(n: number, unit: string | undefined, decimals: number): string {
  if (!Number.isFinite(n)) return '—';
  const d = unit === 'toman' ? 0 : decimals;
  return formatFaRaw(n, d);
}

export function CurrencyConverterCard({
  items,
  base,
  defaultFromCode,
  defaultToCode,
  defaultAmount = DEFAULT_AMOUNT,
  size = 'compact',
  bestProvider,
  bestSpread,
  freshnessLabel,
  onSubmit,
  submitLabel = 'تبدیل و ثبت درخواست',
  ariaLabel = 'مبدل ارز',
  tone = 'light',
}: CurrencyConverterCardProps) {
  const dir = useDirection('rtl');
  const isFull = size === 'full';
  const isBaseMode = base === 'IRT';

  // Synthetic IRT item for base mode (FROM = toman, not selectable)
  const BASE_ITEM: ConverterItem = useMemo(
    () => ({
      value: '__IRT__',
      code: 'IRT',
      name: 'تومان',
      buy: 1,
      sell: 1,
      unit: 'toman',
      decimals: 0,
    }),
    [],
  );

  // Working items list — in base mode, prepend IRT
  const workingItems = useMemo(
    () => (isBaseMode ? [BASE_ITEM, ...items] : items),
    [isBaseMode, items, BASE_ITEM],
  );

  // Items must have at least 2 to convert (1 in base mode since IRT is synthetic)
  const usable = useMemo(() => workingItems.filter((i) => i.buy > 0 && i.sell > 0), [workingItems]);

  const fallback = usable[0]?.value ?? '';
  const initialFrom = useMemo(() => {
    if (isBaseMode) return BASE_ITEM.value;
    if (defaultFromCode) {
      const found = usable.find((i) => i.code === defaultFromCode);
      if (found) return found.value;
    }
    return fallback;
  }, [usable, defaultFromCode, fallback, isBaseMode, BASE_ITEM.value]);

  const initialTo = useMemo(() => {
    if (defaultToCode) {
      const found = usable.find((i) => i.code === defaultToCode);
      if (found) return found.value;
    }
    // try AED → EUR → 2nd → 1st
    const aed = usable.find((i) => i.code === 'AED');
    if (aed) return aed.value;
    const eur = usable.find((i) => i.code === 'EUR');
    if (eur) return eur.value;
    return usable[1]?.value ?? fallback;
  }, [usable, defaultToCode, fallback]);

  const [fromId, setFromId] = useState<string>(initialFrom);
  const [toId, setToId] = useState<string>(initialTo);
  const [amountRaw, setAmountRaw] = useState<string>(
    new Intl.NumberFormat('fa-IR', { useGrouping: false }).format(defaultAmount),
  );

  // Fix selection when items change (e.g. async data loads)
  useEffect(() => {
    if (!usable.some((i) => i.value === fromId)) {
      setFromId(initialFrom);
    }
    if (!usable.some((i) => i.value === toId)) {
      setToId(initialTo);
    }
  }, [usable, fromId, toId, initialFrom, initialTo]);

  const fromItem = usable.find((i) => i.value === fromId) ?? null;
  const toItem = usable.find((i) => i.value === toId) ?? null;

  // Map items → CurrencyItem for the shared dropdown.
  // در base mode (FROM قفل روی تومان است) — IRT را از لیست خارج می‌کنیم.
  // در حالت عادی (مثل /exchanges) — IRT باید در هر دو طرف قابل انتخاب باشد.
  const currencyItems: CurrencyItem[] = useMemo(
    () =>
      usable
        .filter((i) => !isBaseMode || i.value !== BASE_ITEM.value)
        .map((i) => ({ value: i.value, code: i.code, label: i.name })),
    [usable, isBaseMode, BASE_ITEM.value],
  );

  const numericAmount = parseLocaleNumber(amountRaw);

  // Pivot IRT: ۱ FROM = (FROM.buy / TO.sell) TO
  const rate = useMemo(() => {
    if (!fromItem || !toItem) return Number.NaN;
    if (fromItem.value === toItem.value) return 1;
    return fromItem.buy / toItem.sell;
  }, [fromItem, toItem]);

  const converted = useMemo(() => {
    if (!fromItem || !toItem || !Number.isFinite(numericAmount)) return Number.NaN;
    return (numericAmount * fromItem.buy) / toItem.sell;
  }, [numericAmount, fromItem, toItem]);

  const inverse = useMemo(() => {
    if (!Number.isFinite(rate) || rate === 0) return Number.NaN;
    return 1 / rate;
  }, [rate]);

  // Market spread of destination
  const marketSpreadPct = useMemo(() => {
    if (!toItem || toItem.buy <= 0) return Number.NaN;
    return ((toItem.sell - toItem.buy) / toItem.buy) * 100;
  }, [toItem]);

  const handleSwap = useCallback(() => {
    if (!fromItem || !toItem) return;
    setFromId(toItem.value);
    setToId(fromItem.value);
  }, [fromItem, toItem]);

  // وقتی FROM عوض می‌شود و با TO یکسان می‌شود → TO را به ارز قبلی FROM بگردان
  const handleFromChange = useCallback(
    (v: string) => {
      setFromId(v);
      if (v === toId) setToId(fromId);
    },
    [fromId, toId],
  );

  // وقتی TO عوض می‌شود و با FROM یکسان می‌شود → FROM را به ارز قبلی TO بگردان
  const handleToChange = useCallback(
    (v: string) => {
      setToId(v);
      if (v === fromId) setFromId(toId);
    },
    [fromId, toId],
  );

  const handlePreset = (value: number) => {
    setAmountRaw(new Intl.NumberFormat('fa-IR', { useGrouping: false }).format(value));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!onSubmit || !fromItem || !toItem || !Number.isFinite(numericAmount)) return;
    onSubmit({ amount: numericAmount, from: fromItem, to: toItem });
  };

  if (items.length === 0) {
    return (
      <div className={styles.empty} role="status" dir={dir}>
        نرخ فعالی برای محاسبه موجود نیست.
      </div>
    );
  }

  const fmtSpreadPct = (n: number): string => {
    if (!Number.isFinite(n)) return '—';
    if (n === 0) return '۰٫۰۰';
    // reuse decimals=2 از cache بالا — بدون new Intl در هر re-render
    return _getFaRawFmt(2).format(n);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`mt-calc ${size === 'full' ? styles.cardFull : styles.cardCompact}`}
      aria-label={ariaLabel}
      dir={dir}
    >
      {/* Head — only in full mode */}
      {isFull && (
        <div className="mt-calc__head">
          <span className="mt-calc__head-icon" aria-hidden>
            <TrendingUp className="size-3.5" />
          </span>
          <span className="mt-calc__head-title">مبدل زنده</span>
          {freshnessLabel && (
            <span className={styles.lock} title="نرخ بر اساس آخرین بروزرسانی بازار قفل شده است">
              <span className={`${styles.lockDot} anim-ping-soft`} aria-hidden />
              <Lock className={styles.lockIcon} aria-hidden />
              <span>نرخ قفل · {freshnessLabel}</span>
            </span>
          )}
        </div>
      )}

      {/* FROM */}
      <label className="mt-calc__field">
        <span className="mt-calc__field-label">
          {isBaseMode ? 'شما می‌دهید' : isFull ? 'می‌فرستم' : 'می‌دهید'}
        </span>
        <div className="mt-calc__field-row">
          <input
            type="text"
            inputMode="decimal"
            value={amountRaw}
            onChange={(e) => setAmountRaw(e.target.value)}
            placeholder="مبلغ"
            className="mt-calc__amount"
            aria-label={isBaseMode ? 'مبلغ به تومان' : isFull ? 'مبلغ مبدا' : 'مبلغ به تومان'}
            autoComplete="off"
            dir="ltr"
          />
          {isBaseMode ? (
            <span className={styles.baseUnitBadge} aria-label="تومان" dir="ltr">
              <span className={styles.baseUnitCode}>تومان</span>
            </span>
          ) : (
            <CurrencySelect
              value={fromId}
              items={currencyItems}
              onChange={handleFromChange}
              ariaLabel={isFull ? 'ارز مبدا' : 'ارز مبدأ'}
              size="compact"
              tone={tone}
            />
          )}
        </div>
        {/* presets — only full mode (skip in base mode) */}
        {isFull && !isBaseMode && (
          <div className="mt-calc__presets">
            {PRESETS_DEFAULT.map((preset) => {
              const formatted = new Intl.NumberFormat('fa-IR', {
                useGrouping: false,
              }).format(preset);
              const isActive = Number.isFinite(numericAmount) && numericAmount === preset;
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handlePreset(preset)}
                  className={`mt-calc__preset ${isActive ? 'mt-calc__preset--active' : ''}`}
                  aria-pressed={isActive}
                >
                  {formatted}
                </button>
              );
            })}
          </div>
        )}
      </label>

      {/* SWAP — hidden in base mode (FROM is locked to toman) */}
      {!isBaseMode && (
        <button
          type="button"
          onClick={handleSwap}
          className="mt-calc__swap"
          aria-label="جابجایی ارزها"
        >
          <ArrowLeftRight className="size-4" />
        </button>
      )}

      {/* TO — prominent result */}
      <div
        className={isFull ? styles.resultFull : styles.resultCompact}
        aria-live="assertive"
        aria-atomic="true"
      >
        <span className={isFull ? styles.resultLabelFull : styles.resultLabelCompact}>
          <ArrowDown className="size-3.5" aria-hidden />
          {isFull ? 'دریافت می‌کنم' : 'دریافت شما'}
        </span>
        <span className={isFull ? styles.resultValueFull : styles.resultValueCompact}>
          {Number.isFinite(converted)
            ? formatFaRaw(converted, toItem?.unit === 'toman' ? 0 : (toItem?.decimals ?? 2))
            : '—'}
          <span className={isFull ? styles.resultUnitFull : styles.resultUnitCompact}>
            {toItem?.unit === 'toman' ? 'تومان' : (toItem?.code ?? '—')}
          </span>
        </span>
        <div className={isFull ? styles.resultFootFull : styles.resultFootCompact}>
          <CurrencySelect
            value={toId}
            items={currencyItems}
            onChange={handleToChange}
            ariaLabel={isFull ? 'ارز مقصد' : 'انتخاب ارز مقصد'}
            size="compact"
            tone={tone}
          />
        </div>
      </div>

      {/* Rates — only full mode */}
      {isFull && (
        <div className="mt-calc__rates">
          <span className="mt-calc__rate">
            ۱ {fromItem?.code ?? '—'}
            <span className="mt-calc__rate-eq"> = </span>
            <strong>{formatRate(rate, toItem?.unit, toItem?.decimals ?? 2)}</strong>{' '}
            {toItem?.code ?? '—'}
          </span>
          <span className="mt-calc__rate-sep" aria-hidden />
          <span className="mt-calc__rate">
            ۱ {toItem?.code ?? '—'}
            <span className="mt-calc__rate-eq"> = </span>
            <strong>{formatRate(inverse, fromItem?.unit, fromItem?.decimals ?? 2)}</strong>{' '}
            {fromItem?.code ?? '—'}
          </span>
        </div>
      )}

      {/* Fee / spread bar — only full mode */}
      {isFull && (
        <div className={styles.fee}>
          <span className={styles.feeLabel}>
            {Number.isFinite(marketSpreadPct) && marketSpreadPct === 0
              ? 'نرخ واحد (مستقیم از بازار)'
              : 'کارمزد ضمنی (اسپرد بازار)'}
          </span>
          <span className={styles.feeBar} aria-hidden>
            <span
              className={styles.feeBarFill}
              style={{
                inlineSize: `${Math.min(
                  100,
                  Number.isFinite(marketSpreadPct) && marketSpreadPct > 0
                    ? (marketSpreadPct / 15) * 100
                    : 0,
                )}%`,
              }}
            />
          </span>
          <span className={styles.feeVal}>
            {Number.isFinite(marketSpreadPct)
              ? marketSpreadPct === 0
                ? 'بدون اسپرد'
                : `${fmtSpreadPct(marketSpreadPct)}٪`
              : '—'}
          </span>
        </div>
      )}

      {/* Hint — only full mode */}
      {isFull && bestProvider && (
        <div className="mt-calc__hint" role="note">
          <span className="mt-calc__hint-dot" aria-hidden />
          <span className="mt-calc__hint-label">بهترین قیمت</span>
          <span className="mt-calc__hint-text">
            <strong>{bestProvider}</strong>
            {Number.isFinite(bestSpread ?? Number.NaN) && (bestSpread ?? 0) > 0 && (
              <> با {fmtSpreadPct(bestSpread as number)}٪ کارمزد ضمنی</>
            )}
          </span>
        </div>
      )}

      {/* CTA — only if onSubmit is provided (any size) */}
      {onSubmit && (
        <button
          type="submit"
          className={isFull ? `mt-calc__cta ${styles.submit}` : styles.submitCompact}
        >
          <span>{submitLabel}</span>
          {isFull && <Send className="size-4" style={{ transform: 'scaleX(-1)' }} />}
        </button>
      )}
    </form>
  );
}

export default CurrencyConverterCard;
