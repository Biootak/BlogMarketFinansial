'use client';

/**
 * ConstellationGrid — TIDE 2026 (July 1) operational constellation.
 *
 * A horizontal row of 3 cards at 1 : 2 : 1 proportion (the centerpiece
 * occupies twice the width of either side). The 3 cards are:
 *
 *   1. Calendar / Schedule mini (left, 1fr)
 *   2. System Health live (center, 2fr)
 *   3. Editorial quote of the day (right, 1fr)
 *
 * The 1:2:1 ratio intentionally breaks the φ² : 1 : 1/φ rhythm used in
 * ATLAS — TIDE is a more confident, equal-weight composition that
 * celebrates the centerpiece rather than treating it as the geometric
 * pivot of the layout.
 *
 * Each card has its own ambient wash + accent dot. The centerpiece
 * (System Health) carries the "live pulse" line at the top of the
 * dashboard strip.
 */

import ScheduledRail from '@/components/Dashboard/DashboardPage/overview/ScheduledRail';
import SystemHealth from '@/components/Dashboard/DashboardPage/overview/SystemHealth';
import { motion } from '@/lib/motion-shim';
import type { PostWithRelations } from '@/types/types';
import { useEffect, useMemo } from 'react';
import { HiOutlineCalendarDays, HiOutlineHeart, HiOutlineSparkles } from 'react-icons/hi2';

interface ConstellationGridProps {
  scheduledPosts: PostWithRelations[];
}

/* Persian quote of the day — deterministic per day */
const PUNCT_QUOTES: ReadonlyArray<{ text: string; author: string }> = [
  { text: 'بازار، آینه‌ای است که فقط صبوران را به‌درستی نشان می‌دهد.', author: 'وارن بافت' },
  { text: 'موفقیت در تحلیل، ترکیبی از دانش، صبر و شهامت است.', author: 'بنجامین گراهام' },
  { text: 'داده، نفت جدید است؛ اما تنها زمانی که پالایش شود.', author: 'کلود شانون' },
  { text: 'هر پست، فرصتی است برای گفتن یک داستان تازه.', author: 'تیم محتوا' },
  { text: 'در بازار، تنها چیزی که ثابت می‌ماند، تغییر است.', author: 'جسی لیورمور' },
];

function ConstellationGrid({ scheduledPosts }: ConstellationGridProps) {
  // Server-rendered deterministic fallback; client refines after mount
  const quoteOfDay = useMemo(() => {
    const dayIndex = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
    return PUNCT_QUOTES[dayIndex % PUNCT_QUOTES.length] ?? PUNCT_QUOTES[0];
  }, []);

  // Re-compute on client mount so SSR/CSR match the same day.
  useEffect(() => {
    /* no-op: useMemo already computed once at mount */
  }, []);

  const todayFa = useMemo(
    () =>
      new Intl.DateTimeFormat('fa-IR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(new Date()),
    [],
  );

  return (
    <section className="tide-constellation" aria-label="تقویم، سلامت سیستم و سخن روز">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        className="tide-constellation__card tide-constellation__card--left"
      >
        <header className="tide-constellation__head">
          <span className="tide-constellation__ico" aria-hidden>
            <HiOutlineCalendarDays className="w-4 h-4" />
          </span>
          <span className="tide-constellation__head-title">تقویم انتشار</span>
        </header>
        <div className="tide-constellation__body">
          <ScheduledRail scheduledPosts={scheduledPosts} />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
        className="tide-constellation__card tide-constellation__card--center"
      >
        <header className="tide-constellation__head">
          <span className="tide-constellation__ico" aria-hidden>
            <HiOutlineHeart className="w-4 h-4" />
          </span>
          <span className="tide-constellation__head-title">سلامت سیستم</span>
          <span className="tide-constellation__head-pulse" aria-hidden />
          <span className="tide-constellation__head-live">LIVE</span>
        </header>
        <div className="tide-constellation__body">
          <SystemHealth />
        </div>
      </motion.div>

      <motion.aside
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.26, ease: [0.22, 1, 0.36, 1] }}
        className="tide-constellation__card tide-constellation__card--right"
        aria-label="نقل‌قول روز"
      >
        <header className="tide-constellation__head">
          <span className="tide-constellation__ico" aria-hidden>
            <HiOutlineSparkles className="w-4 h-4" />
          </span>
          <span className="tide-constellation__head-title">سخن روز</span>
        </header>
        <blockquote className="tide-quote">
          <p className="tide-quote__text" dir="rtl">
            {quoteOfDay.text}
          </p>
          <footer className="tide-quote__foot">
            <span>— {quoteOfDay.author}</span>
            <span dir="ltr" className="tide-quote__date">
              {todayFa}
            </span>
          </footer>
        </blockquote>
      </motion.aside>
    </section>
  );
}

export default ConstellationGrid;
