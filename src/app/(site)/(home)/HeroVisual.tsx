'use client';

/**
 * HeroVisual — Client Component (2026 premium — million-dollar edition)
 *
 * داده‌های واقعی نرخ ارز را از HeroSection (server) دریافت و نمایش می‌دهد.
 * Mobile: inline mini glass rate card + stats grid با هندسه premium
 * Desktop: floating glass card stack با tilt interaction
 */

import { CurrencySelect } from '@/components/ui/CurrencySelect';
import { formatChangePercent, formatValueOnly } from '@/lib/market-rates/format';
import type { MarketRateItem } from '@/lib/market-rates/types';
import {
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
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import s from './HeroSection.module.css';

/* ─────────────────────────────────────────────────────────────────────────
   CONSTANTS
   ───────────────────────────────────────────────────────────────────────── */

/**
 * ترتیب ارزها: AFN → USD → EUR → AED (قانون P0 — افغانستان‌اول)
 */
const CALC_CURRENCIES = [
  { code: 'AFN', label: 'افغانی' },
  { code: 'USD', label: 'دلار' },
  { code: 'EUR', label: 'یورو' },
  { code: 'AED', label: 'درهم' },
] as const;

type CalcCurrency = (typeof CALC_CURRENCIES)[number]['code'];

const EUR_USD_RATIO = 1.08;
const AED_USD_RATIO = 0.272;

function toLatinDigits(str: string): string {
  return str.replace(/[۰-۹]/g, (d) => String(String.fromCharCode(d.charCodeAt(0) - 1728)));
}

const FA_INT = new Intl.NumberFormat('fa-IR', { useGrouping: true, maximumFractionDigits: 0 });
const FA_DEC_2 = new Intl.NumberFormat('fa-IR', {
  useGrouping: true,
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const FA_USD_TO_AFN = new Intl.NumberFormat('fa-IR', {
  useGrouping: true,
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const FA_COMPACT = new Intl.NumberFormat('fa-IR', {
  notation: 'compact',
  maximumFractionDigits: 1,
});
const FA_PLAIN = new Intl.NumberFormat('fa-IR');

/* ── Glass tilt hook ──────────────────────────────────────────────────── */
function useGlassTilt(strength = 5) {
  const ref = useRef<HTMLDivElement>(null);
  const handleMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      el.style.transform = `perspective(600px) rotateX(${-y * strength}deg) rotateY(${x * strength}deg) translateZ(4px)`;
    },
    [strength],
  );
  const handleLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.transform = '';
  }, []);
  return { ref, handleMove, handleLeave };
}

const STATS_FALLBACK: ReadonlyArray<{ value: string; label: string }> = [
  { value: '۱۰۵', label: 'صرافی فعال' },
  { value: '۲۱', label: 'نرخ زنده' },
];

function formatCompactFa(n: number): string {
  if (n >= 1000) return FA_COMPACT.format(n);
  return FA_PLAIN.format(n);
}

function formatFreshnessFa(date: Date | null): string {
  if (!date) return 'لحظاتی پیش';
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'همین الان';
  if (mins < 60) return `${FA_PLAIN.format(mins)} دقیقه پیش`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${FA_PLAIN.format(hrs)} ساعت پیش`;
  return `${FA_PLAIN.format(Math.floor(hrs / 24))} روز پیش`;
}

const SYMBOL_ROW_LABELS: Record<string, string> = {
  USDT: 'تتر',
  BTC: 'بیت‌کوین',
  ETH: 'اتریوم',
  USD: 'دلار آمریکا',
  EUR: 'یورو',
  GBP: 'پوند',
  AED: 'درهم',
  TRY: 'لیر ترکیه',
  CNY: 'یوان چین',
  CAD: 'دلار کانادا',
  AFN: 'افغانی',
};

interface HeroVisualProps {
  /** نرخ‌های featured برای نمایش در کارت اصلی */
  heroRates: MarketRateItem[];
  /** نرخ USD/IRR برای محاسبه‌گر */
  usdRate: MarketRateItem | null;
  /** نرخ USD→AFN (تعداد افغانی در برابر ۱ دلار) */
  usdToAfn: number | null;
  /** تعداد صرافی‌های فعال */
  activeExchangeCount: number;
  /** تعداد کل نرخ‌ها */
  totalRates: number;
  /** آخرین زمان به‌روزرسانی */
  freshnessAnchor: Date | null;
}

export default function HeroVisual({
  heroRates,
  usdRate,
  usdToAfn,
  activeExchangeCount,
  totalRates,
  freshnessAnchor,
}: HeroVisualProps) {
  const { data: session, status } = useSession();
  const isAuthed = status === 'authenticated' && !!session?.user;
  const role = session?.user?.role as string | undefined;
  const isAuthor =
    isAuthed &&
    (role === 'AUTHOR' || role === 'ADMIN' || role === 'OWNER' || role === 'SUPERADMIN');
  const card1 = useGlassTilt(5);
  const card2 = useGlassTilt(4);

  // M11-pattern: freshness با Date.now() در رندر محاسبه می‌شد که بین سرور و
  // کلاینت mismatch هیدریشن می‌داد. فقط بعد از mount محاسبه می‌شود.
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const freshnessLabel = isMounted ? formatFreshnessFa(freshnessAnchor) : '';

  const usdToAfnFormatted =
    usdToAfn !== null && Number.isFinite(usdToAfn) ? FA_USD_TO_AFN.format(usdToAfn) : null;

  const [calcAmount, setCalcAmount] = useState('100');
  const [calcCurrency, setCalcCurrency] = useState<CalcCurrency>('AFN');

  const usdValue = usdRate?.value ?? null;

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

  const resultAfn =
    calcCurrency === 'AFN'
      ? null
      : resultToman !== null && usdToAfn !== null && usdValue !== null && usdValue > 0
        ? (resultToman * usdToAfn) / usdValue
        : null;

  const resultUsdFromAfn =
    calcCurrency === 'AFN' && parsedAmount > 0 && usdToAfn !== null && usdToAfn > 0
      ? parsedAmount / usdToAfn
      : null;

  const resultAfnFormatted = resultAfn !== null ? FA_INT.format(resultAfn) : '—';
  const resultTomanFormatted = resultToman !== null ? FA_INT.format(resultToman) : '—';
  const resultUsdFormatted = resultUsdFromAfn !== null ? FA_DEC_2.format(resultUsdFromAfn) : '—';

  const transferHref =
    parsedAmount > 0
      ? `/money-transfer?amount=${parsedAmount}&from=${calcCurrency}`
      : '/money-transfer';

  return (
    <section className={s.root} aria-label="صفحه اصلی — پلتفرم مالی">
      {/* ── Ambient layered background ─────────────────────────────── */}
      <div className={s.bg} aria-hidden>
        {/* Dot grid pattern */}
        <svg className={s.grid} role="presentation" focusable="false">
          <defs>
            <pattern id="homeGrid" width="32" height="32" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="1" fill="currentColor" />
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

        {/* Geometric accent circles — فقط در بزرگ */}
        <div className={s.geomCircle1} aria-hidden />
        <div className={s.geomCircle2} aria-hidden />
      </div>

      {/* ── Text column ─────────────────────────────────────────────── */}
      <div className={s.content}>
        {/* Live badge */}
        <div className={s.badge}>
          <span className={s.badgeDot} aria-hidden />
          <span>پلتفرم مالی معتمد</span>
          <span className={s.badgeHighlight}>۱۴۰۵</span>
        </div>

        {/* Headline */}
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

        {/* CTAs */}
        <div className={s.ctas}>
          {isAuthor ? (
            <Link href="/dashboard" className={s.ctaPrimary}>
              <LayoutDashboard size={15} strokeWidth={1.75} />
              داشبورد من
            </Link>
          ) : (
            <Link href="/money-transfer" className={s.ctaPrimary}>
              <TrendingUp size={15} strokeWidth={1.75} />
              مشاهده نرخ‌ها
            </Link>
          )}
          <div className={s.ctasRow}>
            <Link href="/money-transfer?amount=100&from=AFN#contact" className={s.ctaAction}>
              <SendHorizonal size={15} strokeWidth={1.75} className={s.sendIcon} />
              ارسال حواله
            </Link>
            {!isAuthed && (
              <Link href="/apply-exchange" className={s.ctaSecondary}>
                <Building2 size={15} strokeWidth={1.5} />
                ثبت صرافی
              </Link>
            )}
            {isAuthed && !isAuthor && (
              <Link href="/archive" className={s.ctaSecondary}>
                <BarChart2 size={15} strokeWidth={1.5} />
                تحلیل‌ها
              </Link>
            )}
          </div>
        </div>

        {/* ── Mobile Mini Rate Card — فقط در موبایل نمایش داده می‌شود ── */}
        {heroRates.length > 0 && (
          <div className={s.mobileRateCard} aria-label="نرخ‌های زنده">
            {/* Header */}
            <div className={s.mobileRateHeader}>
              <div className={s.mobileRateTitle}>
                <span className={s.mobileRateDot} aria-hidden />
                نرخ‌های زنده
              </div>
              {usdToAfnFormatted && (
                <div className={s.mobileRateAfn}>
                  <span className={s.mobileRateAfnVal}>{usdToAfnFormatted}</span>
                  <span className={s.mobileRateAfnUnit}>AFN/USD</span>
                </div>
              )}
            </div>
            {/* Rate rows */}
            <div className={s.mobileRateRows}>
              {heroRates.slice(0, 3).map((rate) => {
                const trend = rate.changePercent >= 0 ? 'up' : 'down';
                return (
                  <div key={rate.symbol} className={s.mobileRateRow}>
                    <span className={s.mobileRateName}>
                      {SYMBOL_ROW_LABELS[rate.symbol] ?? rate.displayNameFa}
                    </span>
                    <span
                      className={`${s.mobileRateVal} ${trend === 'up' ? s.trendUp : s.trendDown}`}
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
                    <span
                      className={`${s.mobileRateChange} ${trend === 'up' ? s.trendUp : s.trendDown}`}
                    >
                      {formatChangePercent(rate.changePercent)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Mini stats bar — data-driven از سرور */}
        <ul className={s.statsBar} aria-label="آمار پلتفرم">
          <li className={s.statItem}>
            <span className={s.statVal}>
              {activeExchangeCount > 0
                ? formatCompactFa(activeExchangeCount)
                : STATS_FALLBACK[0]?.value}
            </span>
            <span className={s.statLabel}>صرافی فعال</span>
          </li>
          <li className={s.statItem}>
            <span className={s.statVal}>{totalRates > 0 ? FA_PLAIN.format(totalRates) : '۰'}</span>
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

      {/* ── Visual column: floating glass cards — فقط desktop ─────── */}
      {/* aria-hidden حذف شد: کارت‌ها شامل calculator تعاملی هستند که برای
          screen reader ارزش دارد (ورودی + لینک قابل focus). */}
      <div className={s.visual}>
        {/* Ambient orbs */}
        <div className={s.orbA} />
        <div className={s.orbB} />

        {/* Card 1: نرخ‌های زنده */}
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
            {heroRates.length > 0
              ? heroRates.map((rate) => {
                  const trend = rate.changePercent >= 0 ? ('up' as const) : ('down' as const);
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
              : [1, 2, 3].map((i) => (
                  <div key={i} className={`${s.rateRow} ${s.rateRowSkeleton}`} />
                ))}
          </div>
        </div>

        {/* Card 2: انتقال پول */}
        <div
          ref={card2.ref}
          className={`${s.glassCard} ${s.cardSecond}`}
          onMouseMove={card2.handleMove}
          onMouseLeave={card2.handleLeave}
          style={{ transition: 'transform 80ms ease-out' }}
        >
          <div className={s.cardInner}>
            <div className={s.cardLabel}>محاسبه حواله</div>
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
            {calcCurrency === 'AFN' ? (
              <>
                <div className={s.rateRow}>
                  <span className={s.rateName}>تبدیل به (تومان)</span>
                  <span className={`${s.rateVal} ${s.trendUp}`}>{resultTomanFormatted}</span>
                </div>
                <div className={s.rateRow}>
                  <span className={s.rateName}>تبدیل به (دلار)</span>
                  <span className={`${s.rateVal} ${s.resultTomanMuted}`}>{resultUsdFormatted}</span>
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
            <Link href={transferHref} className={s.cardCta}>
              <SendHorizonal size={11} strokeWidth={2} className={s.sendIcon} />
              ارسال حواله
            </Link>
          </div>
        </div>

        {/* Card 3: وضعیت سرویس */}
        <div className={`${s.glassCard} ${s.cardThird}`}>
          <div className={s.cardInner}>
            <div className={s.statusBadge}>
              <span className={s.statusDot} />
              سرویس فعال
            </div>
            <p className={s.cardNote}>
              آخرین به‌روزرسانی
              <br />
              <strong className={s.cardNoteStrong}>{freshnessLabel}</strong>
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
