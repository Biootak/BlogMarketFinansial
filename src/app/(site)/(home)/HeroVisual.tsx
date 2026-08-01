'use client';

/**
 * HeroVisual — Client Component (2026 redesign — million-dollar edition)
 *
 * داده‌های واقعی نرخ ارز را از HeroSection (server) دریافت و نمایش می‌دهد.
 * - کارت ۱: نرخ‌های زنده (AFN/USD/AED) با proof of real platform (صرافی فعال)
 * - کارت ۲: ماشین‌حساب حواله (interactive، sessionStorage-aware)
 * - کارت ۳: وضعیت سرویس (freshness anchor از دیتابیس)
 *
 * نکات طراحی:
 *  - از glassmorphism + ambient SVG stroke به‌عنوان signature استفاده می‌شود
 *  - CTA متفاوت بر اساس نقش کاربر (guest → ثبت صرافی / author → داشبورد)
 *  - freshness واقعی (نه hardcoded)
 *  - همه اعداد فارسی و RTL-safe (logical properties only)
 */

import { formatChangePercent, formatValueOnly } from '@/lib/market-rates/format';
import type { MarketRateItem } from '@/lib/market-rates/types';
import { CurrencySelect } from '@/components/ui/CurrencySelect';
import {
  ArrowLeft,
  BarChart2,
  Building2,
  Globe,
  LayoutDashboard,
  SendHorizonal,
  Shield,
  TrendingDown,
  TrendingUp,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import s from './HeroSection.module.css';

/* ─────────────────────────────────────────────────────────────────────────
   CONSTANTS
   ───────────────────────────────────────────────────────────────────────── */

/**
 * ترتیب ارزها: AFN → USD → EUR → AED (قانون P0 — افغانستان‌اول)
 * دلیل: کاربر افغان باید بتواند افغانی را مستقیماً به تومان/دلار تبدیل کند.
 */
const CALC_CURRENCIES = [
  { code: 'AFN', label: 'افغانی' },
  { code: 'USD', label: 'دلار' },
  { code: 'EUR', label: 'یورو' },
  { code: 'AED', label: 'درهم' },
] as const;

type CalcCurrency = (typeof CALC_CURRENCIES)[number]['code'];

/** نرخ‌های ثابت به‌عنوان fallback زمانی که دادهٔ زنده موجود نیست.
 *  دادهٔ واقعی در HeroSection از سرور به‌صورت usdRate و usdToAfn می‌رسد. */
const EUR_USD_RATIO = 1.08; // ۱ EUR ≈ ۱.۰۸ USD
const AED_USD_RATIO = 0.272; // ۱ AED ≈ ۰.۲۷۲ USD

function toLatinDigits(str: string): string {
  return str.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
}

/* ─────────────────────────────────────────────────────────────────────────
   HOOK: useGlassTilt
   ───────────────────────────────────────────────────────────────────────── */

function useGlassTilt(strength = 5) {
  const ref = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const h = () => setReduced(mq.matches);
    mq.addEventListener('change', h);
    return () => mq.removeEventListener('change', h);
  }, []);

  const handleMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (reduced || !ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const nx = (e.clientX - rect.left) / rect.width - 0.5;
      const ny = (e.clientY - rect.top) / rect.height - 0.5;
      if (rafRef.current === null) {
        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = null;
          if (ref.current) {
            ref.current.style.transform = `perspective(1000px) rotateX(${-ny * strength}deg) rotateY(${nx * strength}deg) translateZ(6px)`;
          }
        });
      }
    },
    [reduced, strength],
  );

  const handleLeave = useCallback(() => {
    if (ref.current) {
      ref.current.style.transition = 'transform 500ms cubic-bezier(0.2, 0.8, 0.2, 1)';
      ref.current.style.transform = '';
      setTimeout(() => {
        if (ref.current) ref.current.style.transition = 'transform 80ms ease-out';
      }, 500);
    }
  }, []);

  useEffect(
    () => () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    },
    [],
  );

  return { ref, handleMove, handleLeave };
}

/* ─────────────────────────────────────────────────────────────────────────
   HERO STATS — داده‌های real از سرور
   ───────────────────────────────────────────────────────────────────────── */

const STATS_FALLBACK: ReadonlyArray<{ value: string; label: string }> = [
  { value: '+۵۰۰۰', label: 'کاربر فعال' },
  { value: '+۱۰', label: 'کشور' },
  { value: '۲۴/۷', label: 'پشتیبانی' },
  { value: '۹۹.۹٪', label: 'آپتایم' },
] as const;

/** فرمت فارسی عدد بزرگ به شکل جمع‌شده: ۱۲۳۴ → «۱.۲ هزار» / ۱۲۳۴۵۶۷ → «۱.۲ میلیون» */
function formatCompactFa(n: number): string {
  if (n >= 1_000_000) {
    return `${new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 1, minimumFractionDigits: 0 }).format(n / 1_000_000)} میلیون`;
  }
  if (n >= 1_000) {
    return `${new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 1, minimumFractionDigits: 0 }).format(n / 1_000)} هزار`;
  }
  return new Intl.NumberFormat('fa-IR').format(n);
}

/** فرمت فاصله از now (مثلاً «۲ دقیقه پیش» / «هم اکنون») */
function formatFreshnessFa(date: Date | null): string {
  if (!date) return '—';
  const diffMin = Math.floor((Date.now() - date.getTime()) / 60_000);
  if (diffMin < 1) return 'هم اکنون';
  if (diffMin < 60) return `${new Intl.NumberFormat('fa-IR').format(diffMin)} دقیقه پیش`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${new Intl.NumberFormat('fa-IR').format(diffH)} ساعت پیش`;
  return `${new Intl.NumberFormat('fa-IR').format(Math.floor(diffH / 24))} روز پیش`;
}

const SYMBOL_ROW_LABELS: Record<string, string> = {
  AFGHANI_AFN: 'افغانی / تومان',
  IRAN_USD: 'دلار / تومان',
  IRAN_AED: 'درهم / تومان',
};

/* ─────────────────────────────────────────────────────────────────────────
   PROPS
   ───────────────────────────────────────────────────────────────────────── */

interface HeroVisualProps {
  /** نرخ‌های انتخاب‌شده برای نمایش در کارت اول */
  heroRates: MarketRateItem[];
  /** نرخ USD/IRR برای محاسبه حواله */
  usdRate: MarketRateItem | null;
  /** cross-rate: ۱ USD = چند AFN */
  usdToAfn: number | null;
  /** تعداد صرافی‌های فعال — از دیتابیس */
  activeExchangeCount: number;
  /** تعداد کل نرخ‌های موجود */
  totalRates: number;
  /** آخرین زمان به‌روزرسانی بازار */
  freshnessAnchor: Date | null;
  /** آیا کاربر لاگین است؟ (برای شخصی‌سازی CTA) */
  isAuthed: boolean;
  /** آیا نقش author/admin/owner دارد؟ (نمایش داشبورد در CTA) */
  isAuthor: boolean;
}

/* ─────────────────────────────────────────────────────────────────────────
   MAIN COMPONENT
   ───────────────────────────────────────────────────────────────────────── */

export default function HeroVisual({
  heroRates,
  usdRate,
  usdToAfn,
  activeExchangeCount,
  totalRates,
  freshnessAnchor,
  isAuthed,
  isAuthor,
}: HeroVisualProps) {
  const card1 = useGlassTilt(5);
  const card2 = useGlassTilt(4);

  // فرمت headline: ۱ USD = X.XX AFN
  // مثال: 188,400 ÷ 2,900 ≈ 64.97 → «۶۴.۹۷»
  const usdToAfnFormatted =
    usdToAfn !== null && Number.isFinite(usdToAfn)
      ? new Intl.NumberFormat('fa-IR', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
          useGrouping: false,
        }).format(usdToAfn)
      : null;

  // ── mini-calculator state — پیش‌فرض AFN (قانون P0 — افغانستان‌اول) ──
  const [calcAmount, setCalcAmount] = useState('100');
  const [calcCurrency, setCalcCurrency] = useState<CalcCurrency>('AFN');

  // نرخ USD به تومان از server
  const usdValue = usdRate?.value ?? null;

  // نرخ تومان برای هر ارز انتخابی:
  // USD: مستقیم × usdValue (Toman per USD)
  // EUR: × usdValue × EUR_USD_RATIO  (USD per EUR)
  // AED: × usdValue × AED_USD_RATIO  (USD per AED)
  // AFN: usdValue / usdToAfn         (Toman per AFN = Toman per USD ÷ AFN per USD)
  function getRateInToman(): number | null {
    if (usdValue === null || !Number.isFinite(usdValue)) return null;
    if (calcCurrency === 'USD') return usdValue;
    if (calcCurrency === 'EUR') return usdValue * EUR_USD_RATIO;
    if (calcCurrency === 'AED') return usdValue * AED_USD_RATIO;
    if (calcCurrency === 'AFN') {
      if (usdToAfn === null || usdToAfn <= 0 || !Number.isFinite(usdToAfn)) return null;
      return usdValue / usdToAfn;
    }
    return null;
  }

  // آیتم‌های CurrencySelect از CALC_CURRENCIES
  const currencyItems = useMemo(
    () =>
      CALC_CURRENCIES.map((c) => ({
        value: c.code,
        code: c.code,
        label: c.label,
      })),
    [],
  );

  const parsedAmount = Number.parseFloat(toLatinDigits(calcAmount)) || 0;
  const rateInToman = getRateInToman();
  const resultToman = rateInToman !== null && parsedAmount > 0 ? parsedAmount * rateInToman : null;

  // نتیجه به افغانی: (مبلغ × نرخ تومان ارز) ÷ نرخ تومان افغانی
  // usdToAfn = IRAN_USD.value / AFGHANI_AFN.value = تومان/دلار ÷ تومان/افغانی = افغانی/دلار
  // پس: برای هر ارز (غیر AFN) → resultToman × usdToAfn / usdValue
  // اگر ارز انتخابی خودش AFN باشد، resultAfn = همان مبلغ (تبدیل به خودش منطقی نیست؛ null)
  const resultAfn =
    calcCurrency === 'AFN'
      ? null
      : resultToman !== null && usdToAfn !== null && usdValue !== null && usdValue > 0
        ? (resultToman * usdToAfn) / usdValue
        : null;

  // برای حالت AFN source: نتیجه در دلار (معکوس)
  const resultUsdFromAfn =
    calcCurrency === 'AFN' &&
    parsedAmount > 0 &&
    usdToAfn !== null &&
    usdToAfn > 0
      ? parsedAmount / usdToAfn
      : null;

  const fa = new Intl.NumberFormat('fa-IR', { useGrouping: true, maximumFractionDigits: 0 });
  const faInt = new Intl.NumberFormat('fa-IR', {
    useGrouping: true,
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  });

  const resultAfnFormatted = resultAfn !== null ? fa.format(resultAfn) : '—';
  const resultTomanFormatted = resultToman !== null ? fa.format(resultToman) : '—';
  const resultUsdFormatted = resultUsdFromAfn !== null ? faInt.format(resultUsdFromAfn) : '—';

  // لینک به صفحه حواله با prefill
  const transferHref =
    parsedAmount > 0
      ? `/money-transfer?amount=${parsedAmount}&from=${calcCurrency}`
      : '/money-transfer';

  return (
    <section className={s.root} aria-label="صفحه اصلی — پلتفرم مالی">
      {/* ── Ambient layered background ─────────────────────────────── */}
      <div className={s.bg} aria-hidden>
        <svg className={s.grid} role="presentation" focusable="false">
          <defs>
            <pattern id="homeGrid" width="48" height="48" patternUnits="userSpaceOnUse">
              <path d="M 48 0 L 0 0 0 48" fill="none" stroke="currentColor" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#homeGrid)" />
        </svg>

        {/* Signature ambient SVG stroke — لحظه واو */}
        <svg
          className={s.ambientStroke}
          viewBox="0 0 900 600"
          aria-hidden
          focusable="false"
          role="presentation"
        >
          <path
            d="M 50 300 Q 225 100 450 280 T 850 250"
            fill="none"
            stroke="url(#strokeGrad)"
            strokeWidth="1.5"
            strokeDasharray="1200"
            strokeDashoffset="1200"
          >
            <animate
              attributeName="stroke-dashoffset"
              from="1200"
              to="0"
              dur="2.8s"
              begin="0.4s"
              fill="freeze"
              calcMode="spline"
              keySplines="0.22 1 0.36 1"
            />
          </path>
          <path
            d="M 100 400 Q 300 200 520 360 T 870 310"
            fill="none"
            stroke="url(#strokeGrad2)"
            strokeWidth="0.8"
            strokeDasharray="900"
            strokeDashoffset="900"
            opacity="0.5"
          >
            <animate
              attributeName="stroke-dashoffset"
              from="900"
              to="0"
              dur="3.2s"
              begin="0.8s"
              fill="freeze"
              calcMode="spline"
              keySplines="0.22 1 0.36 1"
            />
          </path>
          <defs>
            <linearGradient id="strokeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="oklch(58% 0.12 165)" stopOpacity="0" />
              <stop offset="30%" stopColor="oklch(58% 0.12 165)" stopOpacity="0.6" />
              <stop offset="70%" stopColor="oklch(58% 0.13 290)" stopOpacity="0.4" />
              <stop offset="100%" stopColor="oklch(58% 0.13 290)" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="strokeGrad2" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="oklch(72% 0.13 70)" stopOpacity="0" />
              <stop offset="50%" stopColor="oklch(72% 0.13 70)" stopOpacity="0.4" />
              <stop offset="100%" stopColor="oklch(72% 0.13 70)" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* ── Text column ─────────────────────────────────────────────── */}
      <div className={s.content}>
        {/* Live badge */}
        <div className={s.badge}>
          <span className={s.badgeDot} aria-hidden />
          پلتفرم مالی معتمد افغانستان ۱۴۰۴
        </div>

        {/* Headline — دو‌خطی قوی با focal point */}
        <h1 className={s.headline}>
          <span className={s.headlineMain}>نرخ‌ها، حواله، تحلیل —</span>
          <br />
          <span className={s.headlineAccent}>همه در یک پلتفرم</span>
        </h1>

        {/* Sub */}
        <p className={s.sub}>
          نرخ ارز لحظه‌ای، انتقال پول امن، و تحلیل‌های تخصصی بازار
          <br className={s.subBreak} />
          برای کاربران افغانستان و بیش از ۱۰ کشور دیگر.
        </p>

        {/* Trust pills */}
        <ul className={s.pills} aria-label="ویژگی‌های کلیدی">
          {[
            { icon: Globe, text: 'افغانستان' },
            { icon: Zap, text: 'نرخ لحظه‌ای' },
            { icon: Shield, text: 'انتقال امن' },
          ].map(({ icon: Icon, text }) => (
            <li key={text} className={s.pill}>
              <Icon size={13} strokeWidth={1.75} />
              {text}
            </li>
          ))}
        </ul>

        {/* CTAs — primary + secondary + contextual (role-aware)
            - Guest:   مشاهده نرخ‌ها / ارسال حواله / ثبت صرافی
            - Author:  داشبورد من / ارسال حواله / تحلیل‌ها
        */}
        <div className={s.ctas}>
          {isAuthor ? (
            <Link href="/dashboard" className={s.ctaPrimary}>
              <LayoutDashboard size={16} strokeWidth={1.75} />
              داشبورد من
            </Link>
          ) : (
            <Link href="/money-transfer" className={s.ctaPrimary}>
              <TrendingUp size={16} strokeWidth={1.75} />
              مشاهده نرخ‌ها
            </Link>
          )}
          <Link href="/money-transfer?amount=100&from=AFN#contact" className={s.ctaAction}>
            <SendHorizonal size={16} strokeWidth={1.75} className={s.sendIcon} />
            ارسال حواله
          </Link>
          {!isAuthed && (
            <Link href="/apply-exchange" className={s.ctaSecondary}>
              <Building2 size={16} strokeWidth={1.5} />
              ثبت صرافی
              <ArrowLeft size={15} strokeWidth={1.5} className={s.arrowIcon} />
            </Link>
          )}
          {isAuthed && !isAuthor && (
            <Link href="/archive" className={s.ctaSecondary}>
              <BarChart2 size={16} strokeWidth={1.5} />
              تحلیل‌ها
              <ArrowLeft size={15} strokeWidth={1.5} className={s.arrowIcon} />
            </Link>
          )}
        </div>

        {/* Mini stats bar — data-driven از سرور */}
        <ul className={s.statsBar} aria-label="آمار پلتفرم">
          <li className={s.statItem}>
            <span className={s.statVal}>
              {activeExchangeCount > 0 ? formatCompactFa(activeExchangeCount) : STATS_FALLBACK[0]!.value}
            </span>
            <span className={s.statLabel}>صرافی فعال</span>
          </li>
          <li className={s.statItem}>
            <span className={s.statVal}>
              {totalRates > 0 ? new Intl.NumberFormat('fa-IR').format(totalRates) : '۰'}
            </span>
            <span className={s.statLabel}>نرخ زنده</span>
          </li>
          <li className={s.statItem}>
            <span className={s.statVal}>۲۴/۷</span>
            <span className={s.statLabel}>پشتیبانی</span>
          </li>
          <li className={s.statItem}>
            <span className={s.statVal}>۹۹.۹٪</span>
            <span className={s.statLabel}>آپتایم</span>
          </li>
        </ul>
      </div>

      {/* ── Visual column: floating glass cards ─────────────────────── */}
      <div className={s.visual} aria-hidden>
        {/* Ambient orbs */}
        <div className={s.orbA} />
        <div className={s.orbB} />

        {/* Card 1: نرخ‌های زنده — foreground */}
        <div
          ref={card1.ref}
          className={`${s.glassCard} ${s.cardMain}`}
          onMouseMove={card1.handleMove}
          onMouseLeave={card1.handleLeave}
          style={{ transition: 'transform 80ms ease-out' }}
        >
          <div className={s.cardInner}>
            <div className={s.cardHeader}>
              <div className={s.cardLabel}>۱ دلار =</div>
              <div className={s.cardLiveDot}>
                <span />
                زنده
              </div>
            </div>
            {usdToAfnFormatted ? (
              <div className={s.cardAmount}>
                {usdToAfnFormatted}
                <span className={s.cardUnit}>AFN</span>
              </div>
            ) : (
              <div className={`${s.cardAmount} ${s.cardAmountSkeleton}`} />
            )}
            <div className={s.cardDivider} />

            {/* ردیف‌های نرخ — از داده‌های واقعی */}
            {heroRates.length > 0
              ? heroRates.map((rate) => {
                  const trend = rate.changePercent >= 0 ? ('up' as const) : ('down' as const);
                  // نرخ خرید/فروش — با divisor تقسیم می‌شوند تا به تومان تبدیل شوند
                  // null چک می‌کنیم (نه undefined) چون unstable_cache/JSON فیلدهای
                  // optional را به null تبدیل می‌کند نه undefined
                  const hasBuySell =
                    rate.buyValue != null &&
                    rate.sellValue != null &&
                    rate.buyValue > 0 &&
                    rate.sellValue > 0;
                  const buyDisplay = hasBuySell
                    ? formatValueOnly((rate.buyValue as number) / rate.divisor, rate.decimals)
                    : null;
                  const sellDisplay = hasBuySell
                    ? formatValueOnly((rate.sellValue as number) / rate.divisor, rate.decimals)
                    : null;
                  return (
                    <div key={rate.symbol}>
                      <div className={s.rateRow}>
                        <span className={s.rateName}>
                          {SYMBOL_ROW_LABELS[rate.symbol] ?? rate.displayNameFa}
                        </span>
                        <div className={s.rateRight}>
                          <span
                            className={`${s.rateChange} ${trend === 'up' ? s.trendUp : s.trendDown}`}
                          >
                            {formatChangePercent(rate.changePercent)}
                          </span>
                          <span
                            className={`${s.rateVal} ${trend === 'up' ? s.trendUp : s.trendDown}`}
                          >
                            {trend === 'up' ? (
                              <TrendingUp
                                size={9}
                                strokeWidth={2}
                                style={{ display: 'inline', marginInlineEnd: 3 }}
                              />
                            ) : (
                              <TrendingDown
                                size={9}
                                strokeWidth={2}
                                style={{ display: 'inline', marginInlineEnd: 3 }}
                              />
                            )}
                            {formatValueOnly(rate.value, rate.decimals)}
                          </span>
                        </div>
                      </div>
                      {hasBuySell && (
                        <div className={s.buySellRow}>
                          <span className={s.buySellItem}>
                            <span className={s.buySellLabel}>خرید:</span>
                            <span className={`${s.buySellVal} ${s.buySellBuy}`}>{buyDisplay}</span>
                          </span>
                          <span className={s.buySellItem}>
                            <span className={s.buySellLabel}>فروش:</span>
                            <span className={`${s.buySellVal} ${s.buySellSell}`}>
                              {sellDisplay}
                            </span>
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })
              : /* skeleton ردیف‌ها اگر داده موجود نبود */
                [1, 2, 3].map((i) => (
                  <div key={i} className={`${s.rateRow} ${s.rateRowSkeleton}`} />
                ))}
          </div>
        </div>

        {/* Card 2: انتقال پول — mid depth */}
        <div
          ref={card2.ref}
          className={`${s.glassCard} ${s.cardSecond}`}
          onMouseMove={card2.handleMove}
          onMouseLeave={card2.handleLeave}
          style={{ transition: 'transform 80ms ease-out' }}
        >
          <div className={s.cardInner}>
            <div className={s.cardLabel}>محاسبه حواله</div>

            {/* ── ورودی مبلغ + انتخاب ارز (CurrencySelect — نه native) ── */}
            <div className={s.calcRow}>
              <input
                type="text"
                inputMode="decimal"
                value={calcAmount}
                onChange={(e) => setCalcAmount(e.target.value)}
                className={s.calcInput}
                aria-label="مبلغ"
                placeholder="مبلغ"
              />
              <div className={s.calcSelectSlot}>
                <CurrencySelect
                  items={currencyItems}
                  value={calcCurrency}
                  onChange={(v) => setCalcCurrency(v as CalcCurrency)}
                  size="compact"
                  ariaLabel="ارز"
                />
              </div>
            </div>

            <div className={s.cardDivider} />

            {/* ── نتیجه: برای source غیر AFN، افغانی اول؛ برای AFN، تومان+دلار ── */}
            {calcCurrency === 'AFN' ? (
              <>
                <div className={s.rateRow}>
                  <span className={s.rateName}>تبدیل به (تومان)</span>
                  <span className={`${s.rateVal} ${s.trendUp}`}>{resultTomanFormatted}</span>
                </div>
                <div className={s.rateRow}>
                  <span className={s.rateName}>تبدیل به (دلار)</span>
                  <span className={`${s.rateVal} ${s.resultTomanMuted}`}>
                    {resultUsdFormatted}
                  </span>
                </div>
                <div className={s.rateRow}>
                  <span className={s.rateName}>کارمزد</span>
                  <span className={s.rateVal}>رایگان</span>
                </div>
              </>
            ) : (
              <>
                <div className={s.rateRow}>
                  <span className={s.rateName}>دریافتی (افغانی)</span>
                  <span className={`${s.rateVal} ${resultAfn ? s.trendUp : ''}`}>
                    {resultAfnFormatted}
                  </span>
                </div>
                <div className={s.rateRow}>
                  <span className={s.rateName}>دریافتی (تومان)</span>
                  <span className={`${s.rateVal} ${s.resultTomanMuted}`}>
                    {resultTomanFormatted}
                  </span>
                </div>
                <div className={s.rateRow}>
                  <span className={s.rateName}>کارمزد</span>
                  <span className={s.rateVal}>رایگان</span>
                </div>
              </>
            )}

            {/* ── دکمه ─────────────────────────────────────── */}
            <Link href={transferHref} className={s.cardCta}>
              <SendHorizonal size={11} strokeWidth={2} className={s.sendIcon} />
              ارسال حواله
            </Link>
          </div>
        </div>

        {/* Card 3: وضعیت سرویس — background (data-driven freshness) */}
        <div className={`${s.glassCard} ${s.cardThird}`}>
          <div className={s.cardInner}>
            <div className={s.statusBadge}>
              <span className={s.statusDot} />
              سرویس فعال
            </div>
            <p className={s.cardNote}>
              آخرین به‌روزرسانی
              <br />
              <strong className={s.cardNoteStrong}>
                {formatFreshnessFa(freshnessAnchor)}
              </strong>
            </p>
            <div className={s.uptimeBar} aria-hidden>
              <div className={s.uptimeFill} />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom fade */}
      <div className={s.bottomFade} aria-hidden />
    </section>
  );
}
