'use client';

/**
 * CompactRateBridge
 * ----------------------------------------------------------------------------
 * پنل کامپکت چرخشی نرخ‌های حواله (RateList) — بالای کارت اصلی اسلایدر.
 *
 * ویژگی‌ها:
 *  - نمایش نرخ خرید و فروش به صورت جداگانه (سبز/قرمز)
 *  - چرخش خودکار بین آیتم‌ها (هر ۳ ثانیه)
 *  - Morph animation روی اعداد
 *  - کلیک → لینک به فرم ثبت سفارش با پارامتر currency
 *  - ریسپانسیو کامل
 * ----------------------------------------------------------------------------
 */

import { useVisibilityAwareInterval } from '@/hooks/useVisibilityAwareInterval';
import { AnimatePresence, motion } from '@/lib/motion-shim';
import { parseRateItem } from '@/lib/rateItem';
import type { RateItem } from '@/types/types';
import {
  ArrowLeftRight,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';

interface CompactRateBridgeProps {
  rates: RateItem[];
  /** اگه true، auto-rotate از بیرون pause می‌شه (مثلاً با hover از parent) */
  externalPaused?: boolean;
  /** callback وقتی hover state داخلی عوض می‌شه (برای اطلاع parent) */
  onHoverChange?: (isPaused: boolean) => void;
  title?: string;
  autoRotate?: boolean;
  rotateInterval?: number;
  /** لینک پایه برای ثبت سفارش */
  orderLinkBase?: string;
}

export default function CompactRateBridge({
  rates,
  externalPaused = false,
  onHoverChange,
  title = 'نرخ حواله',
  autoRotate = true,
  rotateInterval = 6000,
  orderLinkBase = '/money-transfer',
}: CompactRateBridgeProps) {
  const [internalIndex, setInternalIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // isPaused ترکیبی: pause داخلی (hover) + pause خارجی (از parent)
  const effectivePaused = isPaused || externalPaused;
  const activeIndex = internalIndex;

  // همه rate ها رو از اول parse کن (memoize)
  const parsedRates = useMemo(() => rates.map(parseRateItem), [rates]);

  // Auto-rotate — با تب مخفی pause می‌شود (قبلاً در background tabs
  // هر ۶ ثانیه re-render می‌کرد؛ خواهر خودش RateListsTicker همین کار را دارد).
  const rotationEnabled = autoRotate && !effectivePaused && rates.length > 1;
  useVisibilityAwareInterval(
    () => {
      setInternalIndex((i) => (i + 1) % rates.length);
    },
    rotationEnabled ? rotateInterval : 0,
  );

  // Morph tick حذف شد — تغییرات بسیار کوچک (±۰.۲۵٪) عملاً قابل دیدن نبود
  // و هر ۳ ثانیه re-render کل bridge رو trigger می‌کرد
  // الان عدد base نمایش داده می‌شه (بدون morph)

  // propagate hover state به parent
  useEffect(() => {
    if (!onHoverChange) return;
    onHoverChange(isPaused);
  }, [isPaused, onHoverChange]);

  // track mouse داخل wrapper — باید قبل از early return باشد (Rules of Hooks)
  const mouseCountRef = useRef(0);

  if (!rates || rates.length === 0) return null;

  const current = parsedRates[activeIndex] || parsedRates[0];

  const buyBase = current?.buyNum ?? 0;
  const buyDisplay = buyBase;
  const buySuffix = current?.buySuffix ?? '';

  const sellBase = current?.sellNum ?? 0;
  const sellDisplay = sellBase;
  const sellSuffix = current?.sellSuffix ?? '';

  const orderHref = `${orderLinkBase}?currency=${encodeURIComponent(current?.title || '')}&type=INTERNATIONAL_TRANSFER#contact`;

  const goPrev = () => {
    setIsPaused(true);
    setInternalIndex((i) => (i - 1 + rates.length) % rates.length);
  };

  const goNextBridge = () => {
    setIsPaused(true);
    setInternalIndex((i) => (i + 1) % rates.length);
  };

  const handleMouseEnter = () => {
    mouseCountRef.current += 1;
    setIsPaused(true);
  };
  const handleMouseLeave = () => {
    mouseCountRef.current = Math.max(0, mouseCountRef.current - 1);
    if (mouseCountRef.current === 0) {
      setIsPaused(false);
    }
  };

  return (
    <div
      className="group/bridge inline-flex items-stretch backdrop-blur-xl bg-black/45 border border-white/20 rounded-2xl shadow-2xl overflow-hidden"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Title block */}
      <div className="flex flex-col items-start justify-center gap-0.5 px-2.5 sm:px-3 py-1.5 sm:py-2 border-l border-white/10 min-w-0 sm:min-w-[100px]">
        <div className="flex items-center gap-1">
          <span className="relative flex h-1.5 w-1.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
          </span>
          <span className="text-[9px] sm:text-[10px] uppercase tracking-wider text-white/60 font-bold">
            {title}
          </span>
        </div>
        <span className="text-[10px] sm:text-[11px] font-bold text-white/90 flex items-center gap-1">
          <ArrowLeftRight className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
          <span className="tabular-nums">
            {String(activeIndex + 1).padStart(2, '۰')}/{String(rates.length).padStart(2, '۰')}
          </span>
        </span>
      </div>

      {/* Prev/Next Navigation Buttons (فقط sm+) */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          goPrev();
        }}
        onMouseDown={(e) => e.stopPropagation()}
        // target-size: w-8 (32px → ~24px actual با rem scale) — حداقل لمسی 24px
        className="hidden sm:flex w-8 items-center justify-center text-white/60 hover:text-white hover:bg-white/5 transition-colors cursor-pointer border-l border-white/10"
        aria-label="نرخ قبلی"
      >
        <ChevronRight className="w-3 h-3" />
      </button>

      {/* Rotating Buy/Sell — با Link برای ثبت سفارش */}
      <Link
        href={orderHref}
        onClick={(e) => e.stopPropagation()}
        className="relative flex-1 min-w-0 sm:min-w-[260px] sm:max-w-[320px] overflow-hidden cursor-pointer hover:bg-white/5 transition-colors"
        // WCAG 2.5.3 label-in-name: the accessible name is derived from the
        // visible content (title + خرید + فروش + ثبت) — no aria-label override,
        // so the name always matches what sighted users see.
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={`${activeIndex}-${current?.title}`}
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -12, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
            className="flex flex-col items-stretch gap-0.5 px-2.5 sm:px-3 py-1.5 sm:py-2"
          >
            {/* Currency Title */}
            <span className="text-[10px] sm:text-[11px] font-bold text-white line-clamp-1 max-w-full mb-0.5">
              {current?.title}
            </span>

            {/* Buy + Sell row */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* خرید (سبز) */}
              {current?.buy && (
                <div className="flex items-baseline gap-1 flex-1 min-w-0">
                  <span className="flex items-center gap-0.5 text-[9px] sm:text-[10px] font-bold text-emerald-300 shrink-0">
                    <TrendingUp className="w-2.5 h-2.5" />
                    خرید
                  </span>
                  <span className="text-[12px] sm:text-[13px] font-bold text-emerald-200 tabular-nums">
                    {buyDisplay > 0 ? buyDisplay.toLocaleString('fa-IR') : current?.buy}
                  </span>
                  {buySuffix && (
                    <span className="text-[9px] sm:text-[10px] text-emerald-200/70 shrink-0">
                      {buySuffix}
                    </span>
                  )}
                </div>
              )}

              {/* فروش (قرمز) — فقط اگه جدا باشه */}
              {current?.sell ? (
                <div className="flex items-baseline gap-1 flex-1 min-w-0 border-r border-white/10 pr-2 sm:pr-3">
                  <span className="flex items-center gap-0.5 text-[9px] sm:text-[10px] font-bold text-rose-300 shrink-0">
                    <TrendingDown className="w-2.5 h-2.5" />
                    فروش
                  </span>
                  <span className="text-[12px] sm:text-[13px] font-bold text-rose-200 tabular-nums">
                    {sellDisplay > 0 ? sellDisplay.toLocaleString('fa-IR') : current?.sell}
                  </span>
                  {sellSuffix && (
                    <span className="text-[9px] sm:text-[10px] text-rose-200/70 shrink-0">
                      {sellSuffix}
                    </span>
                  )}
                </div>
              ) : null}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Click hint overlay (در hover) */}
        <div className="absolute inset-0 flex items-center justify-end px-2 opacity-0 hover:opacity-100 transition-opacity bg-gradient-to-l from-emerald-500/15 to-transparent pointer-events-none">
          <span className="flex items-center gap-1 text-[9px] sm:text-[10px] font-bold text-white bg-emerald-500/90 backdrop-blur-sm px-1.5 py-0.5 rounded-md shadow-lg">
            <ShoppingCart className="w-2.5 h-2.5" />
            ثبت
          </span>
        </div>
      </Link>

      {/* Next Button (فقط sm+) */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          goNextBridge();
        }}
        onMouseDown={(e) => e.stopPropagation()}
        // target-size: w-8 (32px → ~24px actual با rem scale) — حداقل لمسی 24px
        className="hidden sm:flex w-8 items-center justify-center text-white/60 hover:text-white hover:bg-white/5 transition-colors cursor-pointer border-l border-white/10"
        aria-label="نرخ بعدی"
      >
        <ChevronLeft className="w-3 h-3" />
      </button>

      {/* Pause/Play toggle (فقط sm+) */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsPaused((p) => !p);
        }}
        onMouseDown={(e) => e.stopPropagation()}
        className="hidden sm:flex w-7 items-center justify-center border-l border-white/10 text-white/60 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
        aria-label={isPaused ? 'ادامه چرخش' : 'توقف چرخش'}
      >
        {isPaused ? (
          <Play className="w-3 h-3 [transform:scaleX(-1)]" fill="currentColor" />
        ) : (
          <Pause className="w-3 h-3" fill="currentColor" />
        )}
      </button>
    </div>
  );
}
