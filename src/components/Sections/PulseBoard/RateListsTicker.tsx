'use client';

/**
 * RateListsTicker — نوار چرخشی نرخ‌های بازار از RateList
 * ----------------------------------------------------------------------------
 * - یک آیتم RateList در یک زمان، با چرخش خودکار هر ۴ ثانیه
 * - نمایش عنوان منبع (مثل «سارای شاهزاده»، «نرخ تهران») به‌عنوان eyebrow
 * - buy/sell pill های جداگانه (سبز/قرمز) — در صورت جفت بودن
 * - marquee ثانویه‌ی بسیار نازک در زیر، که عناوین لیست‌های فعال را نشون می‌ده
 * - pause on hover/hold، کنترل prev/next، pause/play
 * - LiveClock + تاریخ شمسی در lead
 * - prefers-reduced-motion → swap فوری
 * - RTL-native با `start`/`end`، `dir="ltr"` + `unicode-bidi: isolate` فقط برای ارقام
 * ----------------------------------------------------------------------------
 */

import LiveClock from '@/components/Sections/effects/LiveClock';
import Ticker from '@/components/Ticker';
import { AnimatePresence, motion } from '@/lib/motion-shim';
import { type ParsedRateItem, groupRateItems, parseRateItem } from '@/lib/rateItem';
import { cn, formatNumber, toPersianNumber } from '@/lib/utils';
import type { RateListData } from '@/types/types';
import {
  Activity,
  ArrowLeftRight,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import Link from 'next/link';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';

interface RateListsTickerProps {
  /** فقط لیست‌های فعال. */
  rateLists: RateListData[];
  className?: string;
  /** فاصله‌ی چرخش خودکار (ms). پیش‌فرض ۶۰۰۰ms — آرام‌تر برای خوانایی. */
  rotateInterval?: number;
  /** حداکثر تعداد آیتم برای چرخش. پیش‌فرض ۶۰ برای جلوگیری از بار بیش از حد. */
  maxItems?: number;
  /** callback برای اطلاع parent از hover (مثل CompactRateBridge) */
  onHoverChange?: (isPaused: boolean) => void;
}

/* ============================================================================
   Accent map — بر اساس کلیدواژه‌های رایج عنوان لیست.
   سارای شاهزاده → emerald، نرخ تهران → cyan، صرافی ملی → amber، پیش‌فرض → primary
   ============================================================================ */
const ACCENT_RULES: Array<{ keywords: RegExp; color: string; label: string }> = [
  { keywords: /سارا|شاهزاده|sara|shahzadeh/i, color: '#10b981', label: 'صرافی' },
  { keywords: /تهران|tehran/i, color: '#06b6d4', label: 'بازار آزاد' },
  { keywords: /ملی|melli|بانک مرکزی|cbi/i, color: '#f59e0b', label: 'رسمی' },
  { keywords: /طلا|سکه|gold|coin/i, color: '#f59e0b', label: 'طلا' },
  { keywords: /دلار|usd|افغان|afghani/i, color: '#22d3ee', label: 'ارز' },
  { keywords: /کریپتو|ارز.*دیجیتال|crypto|bitcoin|بیت.?کوین/i, color: '#a78bfa', label: 'کریپتو' },
];

const DEFAULT_ACCENT = { color: '#5b6cff', label: 'بازار' };

function getAccentForTitle(title: string): { color: string; label: string } {
  for (const rule of ACCENT_RULES) {
    if (rule.keywords.test(title)) return { color: rule.color, label: rule.label };
  }
  return DEFAULT_ACCENT;
}

function fmtJalaliShort(d: Date | string): string {
  return new Intl.DateTimeFormat('fa-IR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(d));
}

function RateListsTicker({
  rateLists,
  className,
  rotateInterval = 6000,
  maxItems = 60,
  onHoverChange,
}: RateListsTickerProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [jalaliDate, setJalaliDate] = useState('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 2026-06-28: avoid calling new Date() during SSR; populate the date only
  // after client mount so Next.js 16's "current time" guard isn't triggered.
  useEffect(() => {
    setJalaliDate(toPersianNumber(fmtJalaliShort(new Date())));
  }, []);

  /* ---------- Group all rate items from all active lists ---------- */
  const grouped = useMemo(() => {
    const active = (rateLists ?? []).filter((l) => l?.isActive);
    const result = groupRateItems(
      active.map((l) => ({ id: l.id, title: l.title, rates: l.rates })),
    );
    return {
      flat: result.flat.slice(0, maxItems),
      lists: result.byList,
    };
  }, [rateLists, maxItems]);

  const items = grouped.flat;
  const listCount = grouped.lists.length;

  /* ---------- Auto-rotate logic ---------- */
  // Pause rotation when the tab is hidden to avoid wasted CPU/renders.
  useEffect(() => {
    if (items.length <= 1) return;

    const start = () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(() => {
        setActiveIndex((i) => (i + 1) % items.length);
      }, rotateInterval);
    };
    const stop = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    if (!isHovered) start();

    const handleVisibility = () => {
      if (document.hidden) {
        stop();
      } else if (!isHovered) {
        start();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      stop();
    };
  }, [isHovered, items.length, rotateInterval]);

  /* ---------- Propagate hover state to parent (debounce-safe) ---------- */
  useEffect(() => {
    onHoverChange?.(isHovered);
  }, [isHovered, onHoverChange]);

  const goPrev = useCallback(() => {
    setActiveIndex((i) => (i - 1 + items.length) % items.length);
  }, [items.length]);
  const goNext = useCallback(() => {
    setActiveIndex((i) => (i + 1) % items.length);
  }, [items.length]);

  /* ---------- Empty state — هیچ لیست فعالی نیست ---------- */
  if (items.length === 0) return null;

  const current = items[activeIndex] ?? items[0];
  const accent = getAccentForTitle(current.sourceListTitle);
  const orderHref = `/money-transfer?currency=${encodeURIComponent(current.title)}&type=INTERNATIONAL_TRANSFER#contact`;

  return (
    <section
      dir="rtl"
      aria-label="نرخ‌های زنده بازار"
      className={cn(
        'relative overflow-hidden rounded-2xl sm:rounded-3xl',
        'border border-[color:var(--hairline)]',
        'bg-white/80 dark:bg-neutral-900/65 backdrop-blur-xl',
        'shadow-[0_1px_0_0_rgba(255,255,255,0.6)_inset,0_8px_24px_-16px_rgba(20,23,32,0.10)]',
        'dark:shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset,0_8px_24px_-12px_rgba(0,0,0,0.4)]',
        className,
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Aurora background — خیلی subtle، فقط برای حس پریمیوم */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-0"
        style={{
          background: `radial-gradient(ellipse 60% 80% at 0% 50%, ${accent.color}14, transparent 60%)`,
        }}
      />

      {/* Hairline top */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          background: `linear-gradient(90deg, transparent, ${accent.color}55 30%, ${accent.color}55 70%, transparent)`,
        }}
      />

      {/* ================================================================== */}
      {/*  ROW 1 — Lead + Cycling RateItem                                   */}
      {/* ================================================================== */}
      <div className="relative z-10 flex items-stretch gap-0">
        {/* ── Lead block ───────────────────────────────────────────────── */}
        <div
          className={cn(
            'shrink-0 flex items-center gap-2.5 sm:gap-3',
            'px-3.5 sm:px-4 py-2.5 sm:py-3',
            'border-l border-[color:var(--hairline)]',
          )}
        >
          {/* Live pulse */}
          <span
            className="relative inline-flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-xl shrink-0"
            style={{ backgroundColor: `${accent.color}1f`, color: accent.color }}
            aria-hidden
          >
            <Activity className="h-3.5 w-3.5 sm:h-4 sm:w-4" strokeWidth={2.25} />
            <span
              className="absolute -top-0.5 -end-0.5 inline-flex h-2 w-2 rounded-full anim-ping-soft"
              style={{ backgroundColor: accent.color }}
            />
          </span>
          <div className="min-w-0 flex flex-col justify-center">
            <span
              className="text-[10.5px] sm:text-[11.5px] font-bold leading-tight flex items-center gap-1.5"
              style={{ color: accent.color }}
            >
              نرخ لحظه‌ای بازار
            </span>
            <span className="text-[9.5px] sm:text-[10.5px] text-neutral-500 dark:text-neutral-400 font-vazirmatn tabular-nums leading-tight mt-0.5">
              <LiveClock showIcon={false} timeZone="Asia/Tehran" />
              <span className="mx-1 text-neutral-300 dark:text-neutral-600">·</span>
              <span>{jalaliDate || '—'}</span>
            </span>
          </div>
        </div>

        {/* ── Vertical divider ─────────────────────────────────────────── */}
        <div
          aria-hidden
          className="w-px self-stretch my-2"
          style={{
            background:
              'linear-gradient(180deg, transparent, var(--hairline) 18%, var(--hairline) 82%, transparent)',
          }}
        />

        {/* ── Cycling RateItem ─────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 flex items-center justify-between gap-2 sm:gap-3 px-3.5 sm:px-4 py-2.5 sm:py-3">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={`${activeIndex}-${current.title}`}
              initial={{ opacity: 0, y: 8, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.985 }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              className="flex-1 min-w-0 flex items-center gap-3 sm:gap-5"
            >
              {/* Eyebrow: source list */}
              <div className="hidden sm:flex shrink-0 flex-col min-w-0 max-w-[120px]">
                <span
                  className="text-[9.5px] uppercase tracking-[0.18em] font-bold"
                  style={{ color: accent.color }}
                >
                  {accent.label}
                </span>
                <span
                  className="mt-0.5 text-[12px] font-semibold text-neutral-800 dark:text-neutral-200 truncate"
                  title={current.sourceListTitle}
                >
                  {current.sourceListTitle}
                </span>
              </div>

              {/* Currency title */}
              <div className="min-w-0 flex-1 sm:flex-initial">
                <div className="flex items-center gap-1.5">
                  <span
                    className="inline-block h-1.5 w-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: accent.color, boxShadow: `0 0 8px ${accent.color}` }}
                    aria-hidden
                  />
                  <span className="text-[14px] sm:text-[15px] font-bold text-neutral-900 dark:text-white truncate">
                    {current.title}
                  </span>
                </div>
                {(current.buySuffix || current.sellSuffix) && (
                  <span className="block text-[10px] sm:text-[10.5px] text-neutral-500 dark:text-neutral-400 mt-0.5 font-vazirmatn">
                    {current.buySuffix || current.sellSuffix}
                  </span>
                )}
              </div>

              {/* Buy / Sell pills */}
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                {current.isPair && current.sell ? (
                  <>
                    <RatePill
                      kind="buy"
                      value={current.buyNum}
                      raw={current.buy}
                      suffix={current.buySuffix}
                    />
                    <RatePill
                      kind="sell"
                      value={current.sellNum}
                      raw={current.sell}
                      suffix={current.sellSuffix}
                    />
                  </>
                ) : (
                  <RatePill
                    kind="single"
                    value={current.buyNum}
                    raw={current.buy}
                    suffix={current.buySuffix}
                  />
                )}
              </div>

              {/* Order link */}
              <Link
                href={orderHref}
                className={cn(
                  'hidden md:inline-flex shrink-0 items-center gap-1.5',
                  'h-8 px-3 rounded-full text-[11.5px] font-semibold',
                  'transition-all duration-300',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
                )}
                style={{
                  backgroundColor: `${accent.color}1a`,
                  color: accent.color,
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = `${accent.color}2a`;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = `${accent.color}1a`;
                }}
                aria-label={`سفارش ${current.title}`}
              >
                <Wallet className="h-3 w-3" strokeWidth={2.5} aria-hidden />
                <span>سفارش</span>
                <ArrowLeftRight className="h-3 w-3" strokeWidth={2.5} aria-hidden />
              </Link>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* ── Vertical divider ─────────────────────────────────────────── */}
        <div
          aria-hidden
          className="w-px self-stretch my-2"
          style={{
            background:
              'linear-gradient(180deg, transparent, var(--hairline) 18%, var(--hairline) 82%, transparent)',
          }}
        />

        {/* ── Controls + counter ───────────────────────────────────────── */}
        <div className="shrink-0 flex items-center gap-0.5 sm:gap-1 px-2 sm:px-3 py-2.5 sm:py-3">
          <span className="hidden sm:inline-flex items-center gap-1 text-[10.5px] font-semibold text-neutral-500 dark:text-neutral-400 font-vazirmatn tabular-nums px-1.5">
            <span style={{ color: accent.color }}>
              {toPersianNumber(String(activeIndex + 1).padStart(2, '۰'))}
            </span>
            <span className="text-neutral-300 dark:text-neutral-600">/</span>
            <span>{toPersianNumber(String(items.length).padStart(2, '۰'))}</span>
          </span>

          <button
            type="button"
            onClick={goNext}
            className={cn(
              'inline-flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg',
              'text-neutral-500 dark:text-neutral-400',
              'hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white',
              'transition-colors duration-200',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50',
              'cursor-pointer',
            )}
            aria-label="نرخ بعدی"
          >
            <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
          </button>

          <button
            type="button"
            onClick={goPrev}
            className={cn(
              'inline-flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg',
              'text-neutral-500 dark:text-neutral-400',
              'hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white',
              'transition-colors duration-200',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50',
              'cursor-pointer',
            )}
            aria-label="نرخ قبلی"
          >
            <ChevronRight className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
          </button>

          <button
            type="button"
            onClick={() => setIsHovered((p) => !p)}
            className={cn(
              'inline-flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg',
              isHovered
                ? 'text-neutral-900 dark:text-white bg-neutral-100 dark:bg-neutral-800'
                : 'text-neutral-500 dark:text-neutral-400',
              'hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white',
              'transition-colors duration-200',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50',
              'cursor-pointer',
            )}
            aria-label={isHovered ? 'ادامه چرخش' : 'توقف چرخش'}
          >
            {isHovered ? (
              <Play className="h-3 w-3" fill="currentColor" aria-hidden />
            ) : (
              <Pause className="h-3 w-3" fill="currentColor" aria-hidden />
            )}
          </button>
        </div>
      </div>

      {/* ================================================================== */}
      {/*  ROW 2 — Marquee of active list titles (context)                   */}
      {/* ================================================================== */}
      {listCount > 1 && (
        <div
          className={cn(
            'relative z-10 flex items-center gap-2 sm:gap-3',
            'border-t border-[color:var(--hairline)]',
            'h-7 sm:h-8',
            'px-3.5 sm:px-4',
            'bg-neutral-50/40 dark:bg-neutral-950/30',
          )}
        >
          <span
            className="shrink-0 inline-flex items-center gap-1 text-[9.5px] uppercase tracking-[0.18em] font-bold"
            style={{ color: accent.color }}
          >
            <Sparkles className="h-2.5 w-2.5" strokeWidth={2.5} aria-hidden />
            <span className="hidden sm:inline">{toPersianNumber(listCount)} لیست فعال</span>
            <span className="sm:hidden">لیست‌ها</span>
          </span>
          <div className="flex-1 min-w-0">
            <Ticker speed={-25} repeat={2} pauseOnHover>
              {grouped.lists.map((l) => {
                const a = getAccentForTitle(l.title);
                return (
                  <span key={l.id} className="inline-flex items-center gap-1.5 px-2.5 shrink-0">
                    <span
                      className="inline-block h-1 w-1 rounded-full"
                      style={{ backgroundColor: a.color }}
                      aria-hidden
                    />
                    <span className="text-[10.5px] sm:text-[11px] font-medium text-neutral-700 dark:text-neutral-300 whitespace-nowrap tabular-nums">
                      {l.title}
                    </span>
                    <span className="text-neutral-300 dark:text-neutral-700" aria-hidden>
                      ·
                    </span>
                  </span>
                );
              })}
            </Ticker>
          </div>
        </div>
      )}
    </section>
  );
}

/* ============================================================================
   RatePill — یک pill برای نمایش عدد خرید یا فروش
   ============================================================================ */
function RatePill({
  kind,
  value,
  raw,
  suffix,
}: {
  kind: 'buy' | 'sell' | 'single';
  value: number;
  raw: string | null;
  suffix: string;
}) {
  const isBuy = kind === 'buy' || kind === 'single';
  const Icon = isBuy ? TrendingUp : TrendingDown;
  const label = kind === 'buy' ? 'خرید' : kind === 'sell' ? 'فروش' : 'نرخ';
  const color = isBuy ? '#10b981' : '#f43f5e';
  const text = value > 0 ? toPersianNumber(formatNumber(value)) : (raw ?? '—');

  return (
    <div
      className={cn(
        'inline-flex items-baseline gap-1 sm:gap-1.5',
        'h-7 sm:h-8 px-2 sm:px-2.5 rounded-lg',
        'border',
        'font-vazirmatn tabular-nums',
      )}
      style={{
        backgroundColor: `${color}10`,
        borderColor: `${color}30`,
        color: color,
      }}
    >
      <span className="inline-flex items-center gap-0.5 text-[9px] sm:text-[10px] font-bold opacity-90">
        <Icon className="h-2.5 w-2.5" strokeWidth={2.5} aria-hidden />
        <span className="hidden xs:inline sm:inline">{label}</span>
      </span>
      {suffix && (
        <span className="text-[9px] sm:text-[10px] opacity-60 leading-none">{suffix}</span>
      )}
      <span
        className="text-[12px] sm:text-[14px] font-bold leading-none"
        dir="ltr"
        style={{ unicodeBidi: 'isolate' }}
      >
        {text}
      </span>
    </div>
  );
}

export default memo(RateListsTicker);
