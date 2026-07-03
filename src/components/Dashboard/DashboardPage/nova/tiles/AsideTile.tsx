'use client';

/**
 * AsideTile — NOVA closing tile: quote of the day + system health.
 *
 * Pairs an editorial "quote of the day" with the reused live `SystemHealth`
 * rail (neutralised via `.nova-embed`). The publishing calendar already lives
 * in ChartTile's calendar tab, so it isn't duplicated here.
 */

import SystemHealth from '@/components/Dashboard/DashboardPage/overview/SystemHealth';
import { Spotlight } from '@/components/Dashboard/primitives';
import { useMemo } from 'react';
import { HiOutlineSparkles } from 'react-icons/hi2';

const QUOTES: ReadonlyArray<{ text: string; author: string }> = [
  { text: 'بازار، آینه‌ای است که فقط صبوران را به‌درستی نشان می‌دهد.', author: 'وارن بافت' },
  { text: 'موفقیت در تحلیل، ترکیبی از دانش، صبر و شهامت است.', author: 'بنجامین گراهام' },
  { text: 'داده، نفت جدید است؛ اما تنها زمانی که پالایش شود.', author: 'کلود شانون' },
  { text: 'هر پست، فرصتی است برای گفتن یک داستان تازه.', author: 'تیم محتوا' },
  { text: 'در بازار، تنها چیزی که ثابت می‌ماند، تغییر است.', author: 'جسی لیورمور' },
];

export default function AsideTile() {
  const quote = useMemo(() => {
    const dayIndex = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
    return QUOTES[dayIndex % QUOTES.length] ?? QUOTES[0];
  }, []);

  const todayFa = useMemo(
    () =>
      new Intl.DateTimeFormat('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' }).format(
        new Date(),
      ),
    [],
  );

  return (
    <section className="nova-tile nova-tile--aside" data-tone="amber" aria-label="سخن روز و سلامت سیستم">
      <Spotlight tone="amber" size={300} />

      <blockquote className="nova-quote">
        <span className="nova-quote__mark" aria-hidden>
          &ldquo;
        </span>
        <p className="nova-quote__text" dir="rtl">
          {quote.text}
        </p>
        <footer className="nova-quote__foot">
          <span className="nova-quote__author">
            <HiOutlineSparkles className="w-3.5 h-3.5" aria-hidden />
            {quote.author}
          </span>
          <span dir="ltr" className="nova-quote__date tabular-nums">
            {todayFa}
          </span>
        </footer>
      </blockquote>

      <div className="nova-embed nova-aside__health">
        <SystemHealth />
      </div>
    </section>
  );
}
