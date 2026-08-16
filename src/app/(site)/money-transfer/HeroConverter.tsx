'use client';

/**
 * HeroConverter — Hero + Live Currency Converter (Money Transfer 2026-07)
 * ----------------------------------------------------------------------------
 * single source of truth برای hero صفحه‌ی money-transfer.
 *
 * چرا این طراحی (defended 2026-07-05):
 *  - hero = impression + core tool. calculator داخل hero کار می‌کند تا
 *    کاربر از لحظه‌ی landing تا conversion فقط یک scroll طی کند.
 *  - headline با proof point واقعی: نام بهترین provider الان، spread آن.
 *    نه «ساده و مطمئن» که هر landing page کلیشه‌ای دارد.
 *  - lead با عدد dynamic که واقعاً صفر نمی‌شود (fallback «صرافی‌های فعال»)
 *    تا bug قبلی («بیش از ۰ ارز») برنگردد.
 *  - stats چهارگانه‌ی data-driven — هر کدام به یک متغیر server-side متصل است.
 *  - CTA دوگانه با اهداف متمایز: scroll-to-table / jump-to-contact.
 *  - quick category chips: preset ارز / افغانی / طلا / رمزارز (طلا و رمزارز
 *    در نسخه‌ی فعلی disabled چون در forex pivot معنا ندارند).
 *  - calculator: pivot = IRT با منطق صرافی ایران: صرافی FROM رو از کاربر
 *    در FROM.buy می‌خره و TO رو در TO.sell به کاربر می‌فروشه.
 *    amount input locale-aware (ورودی ارقام فارسی، نمایش همان‌ها).
 *  - skeleton برای empty state، نه پیام ساده.
 *  - best-deal hint زیر calculator که می‌گوید الان Wise/صرافی چند می‌دهد.
 *  - همه‌ی touch targets ≥ 44px (border-radius: 9999px chip ها).
 */

import { CurrencySelect } from '@/components/ui/CurrencySelect';
import { useDirection } from '@/hooks/useDirection';
import {
  type HeroPair,
  type computeSpreadStats,
  convertViaIRT,
  formatFaNumber,
  formatRate,
  inverseRate,
  parseLocaleNumber,
} from '@/lib/money-transfer/hero';
import { ArrowDown, ArrowLeftRight, Bitcoin, Coins, Lock, Send, Wallet } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styles from './HeroConverter.module.css';

/** کلید sessionStorage برای پاس دادن اطلاعات تبدیل به فرم ثبت درخواست */
export const CONVERTER_PREFILL_KEY = 'mt_converter_prefill';

export interface ConverterPrefill {
  /** مبلغ وارد شده توسط کاربر (string برای حفظ فرمت اصلی) */
  amount: string;
  /** کد ارز مبدا — مثلاً "USD" */
  fromCode: string;
  /** کد ارز مقصد — مثلاً "AED" */
  toCode: string;
  /** دسته‌بندی فعال */
  category: CategoryId;
}

interface HeroConverterProps {
  /** جفت‌های آماده برای calculator (server-side computed) */
  pairs: HeroPair[];
  /** شاخص‌های spread روی pairs فعلی */
  spreadStats: ReturnType<typeof computeSpreadStats>;
  /** تعداد provider های فعال */
  providerCount: number;
  /** نام بهترین provider (کمترین spread) */
  bestProvider: string;
  /** spread آن provider (٪) */
  bestSpread: number;
  /**
   * anchor برای freshness در hero (سرور محاسبه می‌شود).
   * - snapshot.generatedAt اگه snapshot موجود باشه (fresh واقعی بازار)
   * - در غیر این صورت max(db.updatedAt)
   * - null اگه هیچ داده‌ای نیست
   *
   * قبلاً freshness از pairs[].updatedAt حساب می‌شد که اگه DB خالی/قدیمی
   * باشه، عدد «۳ ساعت پیش» یا «نامشخص» نشون می‌داد.
   */
  freshnessAnchor: Date | null;
}

// gold از calculator حذف شد (2026-07) — فقط در ExchangeRateTableView نمایش می‌یابد.
type CategoryId = 'forex' | 'afghan' | 'crypto';

interface CategoryMeta {
  id: CategoryId;
  label: string;
  icon: typeof Wallet;
  /** آیا در نسخه‌ی فعلی calculator ساپورت می‌شود */
  enabled: boolean;
}

const CATEGORIES: readonly CategoryMeta[] = [
  { id: 'forex', label: 'ارز', icon: Wallet, enabled: true },
  { id: 'afghan', label: 'صراف افغانستان', icon: Coins, enabled: true },
  { id: 'crypto', label: 'رمزارز', icon: Bitcoin, enabled: true },
];

// presets مبلغ — dynamic بر اساس دسته‌ی انتخاب‌شده
// تب افغانی: واحد AFN — مبالغ معمول صراف کابل
const PRESETS_BY_CATEGORY: Record<CategoryId, readonly number[]> = {
  forex: [100, 500, 1_000, 5_000, 10_000],
  afghan: [100, 500, 1_000, 5_000, 10_000],
  crypto: [10, 50, 100, 500, 1_000],
};

const DEFAULT_AMOUNT_STR = '1000';

/**
 * ارزهای پیش‌فرض هر تب — وقتی تب عوض می‌شود این‌ها فعال می‌شوند.
 *  - مبدا: USD برای همه (در تب افغانی هم دلار مبدأ طبیعی صراف کابل است)
 *  - مقصد تب ارز: AED → EUR
 *  - مقصد تب افغانی: AFN (افغانی — واحد اصلی بازار کابل)
 *  - مقصد تب رمزارز: دومین جفت (مثل BTC → ETH)
 */
function getCategoryDefaults(
  category: CategoryId,
  pairs: HeroPair[],
): { from: HeroPair | undefined; to: HeroPair | undefined } {
  const from =
    pairs.find((p) => p.code === 'USD') ?? pairs.find((p) => p.code === 'EUR') ?? pairs[0];

  let to: HeroPair | undefined;
  if (category === 'afghan') {
    to =
      pairs.find((p) => p.code === 'AFN') ??
      pairs.find((p) => p.code === 'USD') ??
      pairs[1] ??
      pairs[0];
  } else if (category === 'crypto') {
    to = pairs[1] ?? pairs[0];
  } else {
    to =
      pairs.find((p) => p.code === 'AED') ??
      pairs.find((p) => p.code === 'EUR') ??
      pairs[1] ??
      pairs[0];
  }

  return { from, to };
}

/* ────────────────────────────────────────────────────────────────────────
   MODULE-LEVEL FORMATTERS — the converter re-renders on every keystroke,
   so formatters are hoisted instead of re-allocated per render.
   ──────────────────────────────────────────────────────────────────────── */
const FA_NO_GROUP = new Intl.NumberFormat('fa-IR', { useGrouping: false });
const FA_INT = new Intl.NumberFormat('fa-IR');

/** Cache of formatters keyed by (min/max fraction digits) — result value
 *  depends on the destination pair's decimals, but the option set is tiny
 *  so a tiny Map is cheaper than re-creating a formatter per render. */
const resultFormatterCache = new Map<string, Intl.NumberFormat>();
function getResultFormatter(minFrac: number, maxFrac: number): Intl.NumberFormat {
  const key = `${minFrac}:${maxFrac}`;
  let fmt = resultFormatterCache.get(key);
  if (!fmt) {
    fmt = new Intl.NumberFormat('fa-IR', {
      minimumFractionDigits: minFrac,
      maximumFractionDigits: maxFrac,
      useGrouping: true,
    });
    resultFormatterCache.set(key, fmt);
  }
  return fmt;
}

/* ── Ambient dot grid — Linear-style signature (2026-08-16 Motion Blueprint)
   Replaces the old static grid-drift div: each dot pulses on its own cycle
   with a wave delay, opacity-only (no layout thrash), infinite. */
function AmbientDotGrid() {
  const COLS = 4;
  const ROWS = 8;
  const DELAY_STEP = 120; // ms between dots → wave travels down the hero
  return (
    <svg
      className={styles.ambientGrid}
      viewBox="0 0 160 320"
      preserveAspectRatio="xMidYMid slice"
      fill="none"
      aria-hidden
      focusable="false"
    >
      {Array.from({ length: ROWS }, (_, row) =>
        Array.from({ length: COLS }, (_, col) => {
          const index = row * COLS + col;
          const cx = 20 + col * 40;
          const cy = 20 + row * 40;
          return (
            <circle
              key={`${row}-${col}`}
              cx={cx}
              cy={cy}
              r="2"
              className={styles.ambientDot}
              style={{ animationDelay: `${index * DELAY_STEP}ms` }}
            />
          );
        }),
      )}
    </svg>
  );
}

export default function HeroConverter({
  pairs,
  spreadStats,
  providerCount,
  bestProvider,
  bestSpread,
  freshnessAnchor,
}: HeroConverterProps) {
  const dir = useDirection('rtl');

  // M11: freshness از Date.now() محاسبه می‌شد که در هیدریشن (زمان سرور ≠ زمان
  // کلاینت) باعث mismatch می‌شد. فقط بعد از mount محاسبه می‌کنیم.
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // ===========================================================================
  // CATEGORY STATE — کنترل chip فعال و فیلتر جفت‌ها
  // ===========================================================================
  const [category, setCategory] = useState<CategoryId>('forex');

  const filteredPairs = useMemo(() => {
    return pairs.filter((p) => p.category === category);
  }, [pairs, category]);

  // وقتی category یا لیست pairs عوض شد، selection را با تب هماهنگ می‌کنیم.
  const [fromId, setFromId] = useState<string>('');
  const [toId, setToId] = useState<string>('');
  const [amountRaw, setAmountRaw] = useState<string>(DEFAULT_AMOUNT_STR);

  // آخرین تب دیده‌شده — وقتی تب عوض می‌شود، پیش‌فرض‌های همان تب اجباری ست می‌شوند
  // (حتی اگر سلیکشن قبلی در لیست جدید معتبر باشد، مثلاً USD/AED در تب افغانی هم هست).
  const prevCategoryRef = useRef<CategoryId>(category);

  useEffect(() => {
    if (filteredPairs.length === 0) {
      // رفتن به یک category خالی → reset
      if (fromId) setFromId('');
      if (toId) setToId('');
      return;
    }

    const categoryChanged = prevCategoryRef.current !== category;
    prevCategoryRef.current = category;

    const { from: defaultFrom, to: defaultTo } = getCategoryDefaults(category, filteredPairs);
    if (!defaultFrom || !defaultTo) return;

    // تغییر تب → پیش‌فرض‌های همان تب؛ در غیر این صورت فقط selection نامعتبر را fix کن
    if (categoryChanged || !filteredPairs.some((p) => p.id === fromId)) {
      setFromId(defaultFrom.id);
    }
    if (categoryChanged || !filteredPairs.some((p) => p.id === toId)) {
      setToId(defaultTo.id);
    }
  }, [filteredPairs, fromId, toId, category]);

  const fromPair = filteredPairs.find((p) => p.id === fromId) ?? null;
  const toPair = filteredPairs.find((p) => p.id === toId) ?? null;

  // Map pairs → CurrencyItem for CurrencySelect
  const currencyItems = useMemo(
    () => filteredPairs.map((p) => ({ value: p.id, code: p.code, label: p.name })),
    [filteredPairs],
  );

  // ===========================================================================
  // CONVERSION — pivot تومان
  // ===========================================================================
  const numericAmount = parseLocaleNumber(amountRaw);
  const rate = useMemo(() => {
    if (!fromPair || !toPair) return Number.NaN;
    if (fromPair.id === toPair.id) return 1;
    // ۱ FROM = ? TO : صرافی ۱ FROM را در from.buy می‌خرد (پایین) و ۱ TO را در to.sell می‌فروشد (بالا).
    return fromPair.buy / toPair.sell;
  }, [fromPair, toPair]);

  const converted = useMemo(() => {
    if (!fromPair || !toPair) return Number.NaN;
    return convertViaIRT(numericAmount, fromPair, toPair);
  }, [numericAmount, fromPair, toPair]);

  const inverse = inverseRate(rate);

  // Market spread of the destination pair (real, from data) — surfaced as the
  // explicit "implicit fee" so the user never sees a hidden cost.
  const marketSpreadPct = useMemo(() => {
    if (!toPair || !Number.isFinite(toPair.buy) || toPair.buy <= 0) {
      return Number.NaN;
    }
    return ((toPair.sell - toPair.buy) / toPair.buy) * 100;
  }, [toPair]);

  // ===========================================================================
  // INTERACTIONS
  // ===========================================================================
  const handleSwap = useCallback(() => {
    if (!fromPair || !toPair) return;
    const newFrom = toPair;
    const newTo = fromPair;
    setFromId(newFrom.id);
    setToId(newTo.id);
  }, [fromPair, toPair]);

  // M1-fix 2026-07: presets بر اساس category فعلی
  const activePresets = PRESETS_BY_CATEGORY[category];

  const handlePreset = (value: number) => {
    setAmountRaw(FA_NO_GROUP.format(value));
  };

  const { status } = useSession();

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    // ذخیره اطلاعات تبدیل در sessionStorage برای pre-fill فرم
    if (fromPair && toPair) {
      const prefill: ConverterPrefill = {
        amount: amountRaw,
        fromCode: fromPair.code,
        toCode: toPair.code,
        category,
      };
      try {
        sessionStorage.setItem(CONVERTER_PREFILL_KEY, JSON.stringify(prefill));
      } catch {
        // sessionStorage ممکن است در برخی حالت‌ها در دسترس نباشد
      }
    }

    // اگر کاربر لاگین نکرده → redirect به پورتال انتقال (پس از ورود مستقیم به /customer/transfer)
    if (status !== 'authenticated') {
      window.location.href = `/auth?callbackUrl=${encodeURIComponent('/customer/transfer?action=exchange')}`;
      return;
    }

    // کاربر لاگین کرده → مستقیم به پورتال انتقال
    window.location.href = '/customer/transfer?action=exchange';
  };

  // ===========================================================================
  // DERIVED FOR RENDER
  // ===========================================================================
  const hasRates = filteredPairs.length >= 2;
  const _activeCategory = CATEGORIES.find((c) => c.id === category) ?? CATEGORIES[0];

  // freshness از anchor سرور (snapshot.generatedAt یا max db.updatedAt).
  // چرا anchor: قبلاً از pairs[].updatedAt می‌گرفتیم که اگه DB خالی/قدیمی
  // باشه، freshness غلط می‌شد. server این مقدار را درست محاسبه می‌کنه و
  // تازه‌ترین منبع (snapshot) را ترجیح می‌دهد.
  const freshness = useMemo(() => {
    if (!isMounted) return '';
    if (!freshnessAnchor) return 'نامشخص';
    const anchor = new Date(freshnessAnchor).getTime();
    if (!Number.isFinite(anchor) || anchor <= 0) return 'نامشخص';
    const ms = Math.max(0, Date.now() - anchor);
    const mins = Math.floor(ms / 60_000);
    if (mins < 1) return 'همین الآن';
    if (mins < 60) {
      return `${FA_INT.format(mins)} دقیقه پیش`;
    }
    const hours = Math.floor(mins / 60);
    if (hours < 24) {
      return `${FA_INT.format(hours)} ساعت پیش`;
    }
    const days = Math.floor(hours / 24);
    return `${FA_INT.format(days)} روز پیش`;
  }, [freshnessAnchor, isMounted]);

  // stats تمیز: اگه count=0، متن neutral نشان بده
  const safeProviderCount = providerCount > 0 ? providerCount : 0;
  const avgSpread = spreadStats.average;
  const providersLabel = safeProviderCount === 0 ? 'بدون صرافی' : FA_INT.format(safeProviderCount);

  // helper برای نمایش spread درصدی (۲ رقم اعشار ولی اگه 0 بود، ردش کن)
  const fmtSpreadPct = (n: number): string => {
    if (!Number.isFinite(n)) return '—';
    if (n === 0) return '۰٫۰۰';
    return formatFaNumber(n, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <section dir={dir} aria-labelledby="hero-converter-title" className="mt-hero dark">
      <AmbientDotGrid />
      <div className="mt-hero__spotlight" aria-hidden />

      <div className="container relative z-10 mt-hero__container">
        <div className="mt-hero__inner">
          {/* =============================================================
              LEFT/RIGHT SPLIT — in RTL: copy starts visually on the right
             ============================================================= */}
          <div className="mt-hero__copy">
            {/* Live indicator + provider count */}
            <div className="mt-hero__live mt-fade-up mt-fade-up-d1" aria-label="نرخ‌های real-time">
              <span className="mt-hero__live-dot" aria-hidden />
              <span className="mt-hero__live-text">
                <span className="mt-hero__live-count">{providersLabel}</span>
                <span>صرافی فعال — نرخ‌های real-time</span>
              </span>
            </div>

            {/* H1 */}
            <h1 id="hero-converter-title" className="mt-hero__title mt-fade-up mt-fade-up-d2">
              حواله با <span className="mt-hero__title-accent">بهترین نرخ بازار</span>
            </h1>

            {/* Lead */}
            <p className="mt-hero__lead mt-fade-up mt-fade-up-d3">
              از {bestSpread > 0 ? `${fmtSpreadPct(bestSpread)}٪` : 'کمترین'} اسپرد تا تسویه در{' '}
              {hasRates ? 'کمتر از چند دقیقه' : 'سریع‌ترین زمان ممکن'}، در{' '}
              {pairs.length > 0 ? `${formatFaNumber(pairs.length)} جفت ارزی` : 'صرافی‌های فعال'}.
            </p>

            {/* Stats strip — چهار شاخص data-driven */}
            <dl className="mt-hero__stats" aria-label="شاخص‌های کلیدی">
              <div className="mt-hero__stat mt-fade-up mt-fade-up-d1">
                <dt className="mt-hero__stat-label">صرافی فعال</dt>
                <dd className="mt-hero__stat-num">{providersLabel}</dd>
              </div>
              <div className="mt-hero__stat mt-fade-up mt-fade-up-d2">
                <dt className="mt-hero__stat-label">میانگین اسپرد</dt>
                <dd className="mt-hero__stat-num">
                  {fmtSpreadPct(avgSpread)}
                  <span className="mt-hero__stat-num-suffix">٪</span>
                </dd>
              </div>
              <div className="mt-hero__stat mt-fade-up mt-fade-up-d3">
                <dt className="mt-hero__stat-label">جفت ارزی</dt>
                <dd className="mt-hero__stat-num">
                  {pairs.length > 0 ? formatFaNumber(pairs.length) : '—'}
                </dd>
              </div>
              <div className="mt-hero__stat mt-fade-up mt-fade-up-d4">
                <dt className="mt-hero__stat-label">به‌روزرسانی</dt>
                <dd className="mt-hero__stat-num mt-hero__stat-num--text">
                  <span className="mt-hero__stat-num-dot" aria-hidden />
                  {freshness}
                </dd>
              </div>
            </dl>

            {/* CTA — دو هدف متمایز */}
            <div className="mt-hero__ctas">
              <a href="#rates" className="mt-hero__cta mt-hero__cta--primary">
                <span>مشاهده نرخ کامل</span>
                <ArrowDown className="size-4" aria-hidden />
              </a>
              <a href="#contact" className="mt-hero__cta mt-hero__cta--ghost">
                <span>گفتگو با کارشناس</span>
                {/* در RTL آیکون بعد از متن (سمت چپ بصری) + flip افقی */}
                <Send className="size-4" aria-hidden style={{ transform: 'scaleX(-1)' }} />
              </a>
            </div>
          </div>

          {/* =============================================================
              RIGHT (in RTL: left visually) — calculator
             ============================================================= */}
          <div className="mt-hero__calculator-slot">
            {/* Category tabs — بالای ماشین حساب */}
            <div className="mt-calc__tabs" role="tablist" aria-label="دسته‌بندی سریع">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isActive = cat.id === category;
                return (
                  <button
                    key={cat.id}
                    role="tab"
                    aria-selected={isActive}
                    aria-disabled={!cat.enabled}
                    disabled={!cat.enabled}
                    type="button"
                    onClick={() => cat.enabled && setCategory(cat.id)}
                    title={!cat.enabled ? 'به زودی' : undefined}
                    className={`mt-calc__tab ${isActive ? 'mt-calc__tab--active' : ''}`}
                  >
                    <Icon className="size-3" aria-hidden />
                    <span>{cat.label}</span>
                    {!cat.enabled && (
                      <span
                        style={{ fontSize: '0.55rem', opacity: 0.6, marginInlineStart: '0.15rem' }}
                        aria-hidden
                      >
                        زودا
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {hasRates ? (
              <form
                onSubmit={handleSubmit}
                className={`mt-calc mt-calc--tabbed ${styles.card} mt-fade-scale`}
                aria-label="مبدل ارز"
              >
                {/* lock badge — freshness */}
                <div className="mt-calc__head">
                  <span
                    className={styles.lock}
                    title="نرخ بر اساس آخرین بروزرسانی بازار قفل شده است"
                  >
                    <span className={`${styles.lockDot} anim-ping-soft`} aria-hidden />
                    <Lock className={styles.lockIcon} aria-hidden />
                    <span>نرخ قفل · {freshness}</span>
                  </span>
                </div>

                {/* FROM */}
                <label className="mt-calc__field">
                  <span className="mt-calc__field-label">می‌فرستم</span>
                  <div className="mt-calc__field-row">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={amountRaw}
                      onChange={(e) => setAmountRaw(e.target.value)}
                      placeholder="مبلغ"
                      className="mt-calc__amount"
                      aria-label="مبلغ مبدا"
                      autoComplete="off"
                      dir="ltr"
                    />
                    <CurrencySelect
                      value={fromId}
                      items={currencyItems}
                      onChange={setFromId}
                      ariaLabel="ارز مبدا"
                      size="compact"
                    />
                  </div>
                  {/* presets */}
                  <div className="mt-calc__presets">
                    {activePresets.map((preset) => {
                      const formatted = FA_NO_GROUP.format(preset);
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
                </label>

                {/* SWAP */}
                <button
                  type="button"
                  onClick={handleSwap}
                  className="mt-calc__swap"
                  aria-label="جابجایی ارزها"
                >
                  <ArrowLeftRight className="size-4" />
                </button>

                {/* TO — prominent received-amount result (the key number) */}
                {/* B2-fix + P-aria fix 2026-07: aria-live assertive + atomic؛ decimals از unit/decimals */}
                <div className={styles.result} aria-live="assertive" aria-atomic="true">
                  <span className={styles.resultLabel}>
                    <ArrowDown className="size-3.5" aria-hidden />
                    دریافت می‌کنم
                  </span>
                  <span className={styles.resultValue}>
                    {Number.isFinite(converted)
                      ? getResultFormatter(
                          // B2-fix: unit=toman → 0 رقم اعشار؛ بقیه از toPair.decimals
                          toPair?.unit === 'toman' ? 0 : (toPair?.decimals ?? 2),
                          toPair?.unit === 'toman' ? 0 : (toPair?.decimals ?? 2),
                        ).format(converted)
                      : '—'}
                    <span className={styles.resultUnit}>{toPair?.code ?? '—'}</span>
                  </span>
                  <div className={styles.resultFoot}>
                    <CurrencySelect
                      value={toId}
                      items={currencyItems}
                      onChange={setToId}
                      ariaLabel="ارز مقصد"
                      size="compact"
                    />
                  </div>
                </div>

                {/* Dual-direction rate display — unit-aware via formatRate() */}
                <div className="mt-calc__rates">
                  <span className="mt-calc__rate">
                    ۱ {fromPair?.code ?? '—'}
                    <span className="mt-calc__rate-eq"> = </span>
                    <strong>{formatRate(rate, toPair)}</strong> {toPair?.code ?? '—'}
                  </span>
                  <span className="mt-calc__rate-sep" aria-hidden />
                  <span className="mt-calc__rate">
                    ۱ {toPair?.code ?? '—'}
                    <span className="mt-calc__rate-eq"> = </span>
                    <strong>{formatRate(inverse, fromPair)}</strong> {fromPair?.code ?? '—'}
                  </span>
                </div>

                {/* Transparency — explicit market spread (no hidden cost)
                    M4-fix 2026-07: وقتی spread=0 (SINGLE_BULK / mid rate)، متن توضیحی نمایش می‌دهیم
                    P3-fix: ضریب نوار را نرمال کردیم تا بالای ۱۲٪ هم درست scale شود */}
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
                        // P3-fix: clamp نرمال — max spread معنادار ~15٪، scale به ۱۰۰٪
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

                {/* Best-deal hint */}
                <div className="mt-calc__hint" role="note">
                  <span className="mt-calc__hint-dot" aria-hidden />
                  <span className="mt-calc__hint-label">بهترین قیمت</span>
                  <span className="mt-calc__hint-text">
                    <strong>{bestProvider}</strong>
                    {bestSpread > 0 && <> با {fmtSpreadPct(bestSpread)}٪ کارمزد ضمنی</>}
                  </span>
                </div>

                {/* CTA — authenticated → customer/transfer, unauthenticated → auth */}
                <button type="submit" className={`mt-calc__cta ${styles.submit}`}>
                  <span>
                    {status === 'authenticated' ? 'ورود به پنل انتقال' : 'تبدیل و ثبت درخواست'}
                  </span>
                  {/* در RTL آیکون بعد از متن (سمت چپ بصری) + flip افقی */}
                  <Send className="size-4" style={{ transform: 'scaleX(-1)' }} />
                </button>
              </form>
            ) : (
              <CalculatorSkeleton />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

// ----------------------------------------------------------------------------
// Skeleton for empty state — keeps the slot reserved while data loads.
// ----------------------------------------------------------------------------
function CalculatorSkeleton() {
  return (
    <output className="mt-calc mt-calc--empty" aria-live="polite">
      <div className="mt-calc__skeleton">
        <span className="mt-calc__skeleton-bar mt-calc__skeleton-bar--lg" />
        <span className="mt-calc__skeleton-bar" />
        <span className="mt-calc__skeleton-bar mt-calc__skeleton-bar--md" />
        <span className="mt-calc__skeleton-bar" />
        <span className="mt-calc__skeleton-bar mt-calc__skeleton-bar--sm" />
      </div>
      <p className="mt-calc__loading">منتظر دریافت نرخ‌های زنده…</p>
    </output>
  );
}
