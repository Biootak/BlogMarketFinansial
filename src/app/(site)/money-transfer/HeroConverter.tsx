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

import { useEffect, useMemo, useState, useCallback, type FormEvent } from 'react';
import {
  ArrowDown,
  ArrowLeftRight,
  Send,
  TrendingUp,
  Wallet,
  Coins,
  Bitcoin,
  Lock,
} from 'lucide-react';
import { useDirection } from '@/hooks/useDirection';
import styles from './HeroConverter.module.css';
import {
  buildHeroPairs,
  convertViaIRT,
  type computeSpreadStats,
  formatFaNumber,
  inverseRate,
  parseLocaleNumber,
  type HeroPair,
} from '@/lib/money-transfer/hero';

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
  { id: 'forex',  label: 'ارز',     icon: Wallet,  enabled: true },
  { id: 'afghan', label: 'افغانی',  icon: Coins,   enabled: true },
  { id: 'crypto', label: 'رمزارز',  icon: Bitcoin, enabled: true },
];

// presets مبلغ — dynamic بر اساس دسته‌ی انتخاب‌شده
const PRESETS_BY_CATEGORY: Record<CategoryId, readonly number[]> = {
  forex:  [100, 500, 1_000, 5_000, 10_000],
  afghan: [1_000, 5_000, 10_000, 50_000, 100_000],
  crypto: [10, 50, 100, 500, 1_000],
};

const DEFAULT_AMOUNT_STR = '1000';

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

  // وقتی category یا لیست pairs عوض شد، selection های نامعتبر را fix می‌کنیم.
  const [fromId, setFromId] = useState<string>('');
  const [toId, setToId] = useState<string>('');
  const [amountRaw, setAmountRaw] = useState<string>(DEFAULT_AMOUNT_STR);

  useEffect(() => {
    if (filteredPairs.length === 0) {
      // رفتن به یک category خالی → reset
      if (fromId) setFromId('');
      if (toId) setToId('');
      return;
    }
    // اطمینان از این‌که selection هنوز در filteredPairs است
    if (!filteredPairs.some((p) => p.id === fromId)) {
      // default مبدا: USD برای forex، AFN/اوّلین برای افغانی
      const preferredFrom =
        filteredPairs.find((p) => p.code === 'USD') ?? filteredPairs[0];
      setFromId(preferredFrom.id);
    }
    if (!filteredPairs.some((p) => p.id === toId)) {
      // B3-fix 2026-07: IRT هرگز در HeroPairs نیست (extractShortCode آن را حذف می‌کند).
      // default مقصد: AED (خاورمیانه) → EUR → دومین → اوّلین
      const preferredTo =
        filteredPairs.find((p) => p.code === 'AED') ??
        filteredPairs.find((p) => p.code === 'EUR') ??
        filteredPairs[1] ??
        filteredPairs[0];
      setToId(preferredTo.id);
    }
  }, [filteredPairs, fromId, toId]);

  const fromPair = filteredPairs.find((p) => p.id === fromId) ?? null;
  const toPair = filteredPairs.find((p) => p.id === toId) ?? null;

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
    setAmountRaw(new Intl.NumberFormat('fa-IR', { useGrouping: false }).format(value));
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const target = document.getElementById('contact');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // فوکوس کردن فیلد «نام» در فرم contact برای continuity
      window.setTimeout(() => {
        const firstInput = target.querySelector<HTMLInputElement>('input[name="name"], input[type="text"]');
        firstInput?.focus({ preventScroll: true });
      }, 600);
    }
  };

  // ===========================================================================
  // DERIVED FOR RENDER
  // ===========================================================================
  const hasRates = filteredPairs.length >= 2;
  const activeCategory = CATEGORIES.find((c) => c.id === category) ?? CATEGORIES[0];

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
      const n = new Intl.NumberFormat('fa-IR').format(mins);
      return `${n} دقیقه پیش`;
    }
    const hours = Math.floor(mins / 60);
    if (hours < 24) {
      const n = new Intl.NumberFormat('fa-IR').format(hours);
      return `${n} ساعت پیش`;
    }
    const days = Math.floor(hours / 24);
    const n = new Intl.NumberFormat('fa-IR').format(days);
    return `${n} روز پیش`;
  }, [freshnessAnchor, isMounted]);

  // stats تمیز: اگه count=0، متن neutral نشان بده
  const safeProviderCount = providerCount > 0 ? providerCount : 0;
  const avgSpread = spreadStats.average;
  const providersLabel =
    safeProviderCount === 0
      ? 'بدون صرافی'
      : new Intl.NumberFormat('fa-IR').format(safeProviderCount);

  // helper برای نمایش spread درصدی (۲ رقم اعشار ولی اگه 0 بود، ردش کن)
  const fmtSpreadPct = (n: number): string => {
    if (!Number.isFinite(n)) return '—';
    if (n === 0) return '۰٫۰۰';
    return formatFaNumber(n, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <section
      dir={dir}
      aria-labelledby="hero-converter-title"
      className="mt-hero dark"
    >
      <div className="mt-hero__grid" aria-hidden />
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

            {/* H1 — proof point واقعی به جای کلیشه */}
            <h1 id="hero-converter-title" className="mt-hero__title mt-fade-up mt-fade-up-d2">
              نرخ لحظه‌ای، از{' '}
              <span className="mt-hero__title-accent">{bestProvider}</span>
            </h1>

            {/* Lead — عدد dynamic با fallback امن */}
            <p className="mt-hero__lead mt-fade-up mt-fade-up-d3">
              از {bestSpread > 0 ? `${fmtSpreadPct(bestSpread)}٪` : 'کمترین'} اسپرد
              تا تسویه در {hasRates ? 'کمتر از چند دقیقه' : 'سریع‌ترین زمان ممکن'}، در
              {' '}
              {pairs.length > 0
                ? `${formatFaNumber(pairs.length)} جفت ارزی`
                : 'صرافی‌های فعال'}
              .
            </p>

            {/* Quick category chips */}
            <div
              className="mt-hero__categories"
              role="tablist"
              aria-label="دسته‌بندی سریع"
            >
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
                    // M3-fix 2026-07: tooltip "به زودی" برای disabled chips
                    title={!cat.enabled ? 'به زودی' : undefined}
                    className={`mt-hero__chip ${isActive ? 'mt-hero__chip--active' : ''}`}
                  >
                    <Icon className="size-3.5" aria-hidden />
                    <span>{cat.label}</span>
                    {!cat.enabled && (
                      <span
                        style={{ fontSize: '0.6rem', opacity: 0.65, marginInlineStart: '0.2rem' }}
                        aria-hidden
                      >
                        زودا
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

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
                  {pairs.length > 0
                    ? formatFaNumber(pairs.length)
                    : '—'}
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
              <a
                href="#contact"
                className="mt-hero__cta mt-hero__cta--ghost"
              >
                <Send className="size-4" aria-hidden />
                <span>گفتگو با کارشناس</span>
              </a>
            </div>
          </div>

          {/* =============================================================
              RIGHT (in RTL: left visually) — calculator
             ============================================================= */}
          <div className="mt-hero__calculator-slot">
            {hasRates ? (
              <form
                onSubmit={handleSubmit}
                className={`mt-calc ${styles.card} mt-fade-scale`}
                aria-label="مبدل ارز"
              >
                <div className="mt-calc__head">
                  <span className="mt-calc__head-icon" aria-hidden>
                    <TrendingUp className="size-3.5" />
                  </span>
                  <span className="mt-calc__head-title">مبدل زنده</span>
                  <span className="mt-calc__head-meta">
                    {activeCategory.label}
                  </span>
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
                    <CurrencyPicker
                      value={fromId}
                      pairs={filteredPairs}
                      onChange={setFromId}
                      ariaLabel="ارز مبدا"
                    />
                  </div>
                  {/* presets */}
                  <div className="mt-calc__presets">
                    {activePresets.map((preset) => {
                      const formatted = new Intl.NumberFormat('fa-IR', {
                        useGrouping: false,
                      }).format(preset);
                      const isActive =
                        Number.isFinite(numericAmount) && numericAmount === preset;
                      return (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => handlePreset(preset)}
                          className={`mt-calc__preset ${
                            isActive ? 'mt-calc__preset--active' : ''
                          }`}
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
                    {Number.isFinite(converted) ? (
                      new Intl.NumberFormat('fa-IR', {
                        // B2-fix: unit=toman → 0 رقم اعشار؛ بقیه از toPair.decimals
                        minimumFractionDigits: toPair?.unit === 'toman' ? 0 : (toPair?.decimals ?? 2),
                        maximumFractionDigits: toPair?.unit === 'toman' ? 0 : (toPair?.decimals ?? 2),
                        useGrouping: true,
                      }).format(converted)
                    ) : (
                      '—'
                    )}
                    <span className={styles.resultUnit}>{toPair?.code ?? '—'}</span>
                  </span>
                  <div className={styles.resultFoot}>
                    <CurrencyPicker
                      value={toId}
                      pairs={filteredPairs}
                      onChange={setToId}
                      ariaLabel="ارز مقصد"
                    />
                  </div>
                </div>

                {/* Dual-direction rate display */}
                <div className="mt-calc__rates">
                  <span className="mt-calc__rate">
                    ۱ {fromPair?.code ?? '—'}
                    <span className="mt-calc__rate-eq"> = </span>
                    <strong>
                      {Number.isFinite(rate)
                        ? formatFaNumber(rate, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 4,
                          })
                        : '—'}
                    </strong>
                    {' '}
                    {toPair?.code ?? '—'}
                  </span>
                  <span className="mt-calc__rate-sep" aria-hidden />
                  <span className="mt-calc__rate">
                    ۱ {toPair?.code ?? '—'}
                    <span className="mt-calc__rate-eq"> = </span>
                    <strong>
                      {Number.isFinite(inverse)
                        ? (() => {
                            // M6-fix 2026-07: برای اعداد خیلی کوچک یا بزرگ از significantDigits استفاده می‌کنیم
                            const abs = Math.abs(inverse);
                            if (abs < 0.01 || abs >= 100_000) {
                              return new Intl.NumberFormat('fa-IR', {
                                maximumSignificantDigits: 4,
                              }).format(inverse);
                            }
                            return formatFaNumber(inverse, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 4,
                            });
                          })()
                        : '—'}
                    </strong>
                    {' '}
                    {fromPair?.code ?? '—'}
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
                    {bestSpread > 0 && (
                      <>
                        {' '}
                        با {fmtSpreadPct(bestSpread)}٪ کارمزد ضمنی
                      </>
                    )}
                  </span>
                </div>

                {/* CTA */}
                <button type="submit" className={`mt-calc__cta ${styles.submit}`}>
                  <Send className="size-4" />
                  <span>تبدیل و ثبت درخواست</span>
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
// CurrencyPicker — native <select> with code chip overlay.
// استفاده از native select به جای custom dropdown:
//   - keyboard / screen reader accessibility built-in
//   - iOS/Android OS picker ux بهتر از listbox flat
//   - size کوچک‌تر بدون نیاز به popper/trap focus
// ----------------------------------------------------------------------------
interface CurrencyPickerProps {
  value: string;
  pairs: HeroPair[];
  onChange: (next: string) => void;
  ariaLabel: string;
}

function CurrencyPicker({
  value,
  pairs,
  onChange,
  ariaLabel,
}: CurrencyPickerProps) {
  const selected = pairs.find((p) => p.id === value);
  return (
    <div className="mt-calc__picker">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-calc__picker-select"
        aria-label={ariaLabel}
      >
        {pairs.map((p) => (
          // M5-fix 2026-07: نام فارسی اول — خواناتر در native picker موبایل
          <option key={p.id} value={p.id}>
            {p.name} ({p.code})
          </option>
        ))}
      </select>
      <span className="mt-calc__picker-flag" aria-hidden>
        <span className="mt-calc__picker-flag-code">
          {selected?.code ?? '•••'}
        </span>
        <svg
          className="mt-calc__picker-caret"
          viewBox="0 0 12 12"
          fill="none"
          aria-hidden="true"
          role="presentation"
        >
          <path
            d="M3 4.5L6 7.5L9 4.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </div>
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
      <p className="mt-calc__loading">
        منتظر دریافت نرخ‌های زنده…
      </p>
    </output>
  );
}
