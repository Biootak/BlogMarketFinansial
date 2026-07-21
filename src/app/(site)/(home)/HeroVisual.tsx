'use client';

/**
 * HeroVisual — Client Component
 *
 * داده‌های واقعی نرخ ارز را از HeroSection (server) دریافت و نمایش می‌دهد.
 * - کارت ۱: نرخ‌های زنده (AFN/USD/AED)
 * - کارت ۲: ماشین‌حساب حواله (interactive)
 * - کارت ۳: وضعیت سرویس
 */

import { formatChangePercent, formatValueOnly } from '@/lib/market-rates/format';
import type { MarketRateItem } from '@/lib/market-rates/types';
import {
  ArrowLeft,
  BarChart2,
  Globe,
  SendHorizonal,
  Shield,
  TrendingDown,
  TrendingUp,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import s from './HeroSection.module.css';

/* ─────────────────────────────────────────────────────────────────────────
   CONSTANTS
   ───────────────────────────────────────────────────────────────────────── */

const CALC_CURRENCIES = [
  { code: 'USD', label: 'دلار' },
  { code: 'EUR', label: 'یورو' },
  { code: 'AED', label: 'درهم' },
] as const;

type CalcCurrency = (typeof CALC_CURRENCIES)[number]['code'];

const EUR_USD_RATIO = 1.08; // ۱ EUR ≈ ۱.۰۸ USD (fallback ثابت)
const AED_USD_RATIO = 0.272; // ۱ AED ≈ ۰.۲۷۲ USD (ثابت: ۱ USD = ۳.۶۷ AED)

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
   HERO STATS
   ───────────────────────────────────────────────────────────────────────── */

const HERO_STATS = [
  { value: '+۵۰۰۰', label: 'کاربر فعال' },
  { value: '+۱۰', label: 'کشور' },
  { value: '۲۴/۷', label: 'پشتیبانی' },
  { value: '۹۹.۹٪', label: 'آپتایم' },
] as const;

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
}

/* ─────────────────────────────────────────────────────────────────────────
   MAIN COMPONENT
   ───────────────────────────────────────────────────────────────────────── */

export default function HeroVisual({ heroRates, usdRate, usdToAfn }: HeroVisualProps) {
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

  // ── mini-calculator state ──────────────────────────────────────────────
  const [calcAmount, setCalcAmount] = useState('100');
  const [calcCurrency, setCalcCurrency] = useState<CalcCurrency>('USD');

  // نرخ USD به تومان از server
  const usdValue = usdRate?.value ?? null;

  // cross-rate به تومان بر اساس ارز انتخابی
  // USD: مستقیم × usdValue
  // EUR: × usdValue × EUR_USD_RATIO
  // AED: × usdValue × AED_USD_RATIO
  function getRateInToman(): number | null {
    if (usdValue === null || !Number.isFinite(usdValue)) return null;
    if (calcCurrency === 'USD') return usdValue;
    if (calcCurrency === 'EUR') return usdValue * EUR_USD_RATIO;
    if (calcCurrency === 'AED') return usdValue * AED_USD_RATIO;
    return null;
  }

  const parsedAmount = Number.parseFloat(toLatinDigits(calcAmount)) || 0;
  const rateInToman = getRateInToman();
  const resultToman = rateInToman !== null && parsedAmount > 0 ? parsedAmount * rateInToman : null;

  // نتیجه به افغانی: (مبلغ × نرخ تومان ارز) ÷ نرخ تومان افغانی
  // usdToAfn = IRAN_USD.value / AFGHANI_AFN.value = تومان/دلار ÷ تومان/افغانی = افغانی/دلار
  // پس: برای هر ارز → resultToman ÷ (usdValue / usdToAfn)
  // = resultToman × usdToAfn / usdValue
  const resultAfn =
    resultToman !== null && usdToAfn !== null && usdValue !== null && usdValue > 0
      ? (resultToman * usdToAfn) / usdValue
      : null;

  const fa = new Intl.NumberFormat('fa-IR', { useGrouping: true, maximumFractionDigits: 0 });

  const resultAfnFormatted = resultAfn !== null ? fa.format(resultAfn) : '—';
  const resultTomanFormatted = resultToman !== null ? fa.format(resultToman) : '—';

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

        {/* CTAs — سه دکمه */}
        <div className={s.ctas}>
          <Link href="/money-transfer" className={s.ctaPrimary}>
            <TrendingUp size={16} strokeWidth={1.75} />
            مشاهده نرخ‌ها
          </Link>
          <Link href="/money-transfer#send" className={s.ctaAction}>
            <SendHorizonal size={16} strokeWidth={1.75} className={s.sendIcon} />
            ارسال حواله
          </Link>
          <Link href="/archive" className={s.ctaSecondary}>
            <BarChart2 size={16} strokeWidth={1.5} />
            تحلیل‌ها
            <ArrowLeft size={15} strokeWidth={1.5} className={s.arrowIcon} />
          </Link>
        </div>

        {/* Mini stats bar */}
        <ul className={s.statsBar} aria-label="آمار پلتفرم">
          {HERO_STATS.map((stat) => (
            <li key={stat.label} className={s.statItem}>
              <span className={s.statVal}>{stat.value}</span>
              <span className={s.statLabel}>{stat.label}</span>
            </li>
          ))}
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

            {/* ── ورودی مبلغ + انتخاب ارز ────────────────────── */}
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
              <select
                value={calcCurrency}
                onChange={(e) => setCalcCurrency(e.target.value as CalcCurrency)}
                className={s.calcSelect}
                aria-label="ارز"
              >
                {CALC_CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code}
                  </option>
                ))}
              </select>
            </div>

            <div className={s.cardDivider} />

            {/* ── نتیجه: افغانی اول، تومان دوم ──────────────── */}
            <div className={s.rateRow}>
              <span className={s.rateName}>دریافتی (AFN)</span>
              <span className={`${s.rateVal} ${resultAfn ? s.trendUp : ''}`}>
                {resultAfnFormatted}
              </span>
            </div>
            <div className={s.rateRow}>
              <span className={s.rateName}>دریافتی (تومان)</span>
              <span className={`${s.rateVal} ${s.resultTomanMuted}`}>{resultTomanFormatted}</span>
            </div>
            <div className={s.rateRow}>
              <span className={s.rateName}>کارمزد</span>
              <span className={s.rateVal}>رایگان</span>
            </div>

            {/* ── دکمه ─────────────────────────────────────── */}
            <Link href={transferHref} className={s.cardCta}>
              <SendHorizonal size={11} strokeWidth={2} className={s.sendIcon} />
              ارسال حواله
            </Link>
          </div>
        </div>

        {/* Card 3: وضعیت سرویس — background */}
        <div className={`${s.glassCard} ${s.cardThird}`}>
          <div className={s.cardInner}>
            <div className={s.statusBadge}>
              <span className={s.statusDot} />
              سرویس فعال
            </div>
            <p className={s.cardNote}>
              نرخ‌ها به‌صورت خودکار
              <br />
              هر ۵ دقیقه به‌روز می‌شوند
            </p>
            <div className={s.uptimeBar}>
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
