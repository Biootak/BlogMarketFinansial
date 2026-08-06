'use client';

import { bucketLabel, faNum, faPercent } from './format';
import { useObs } from './ObsProvider';
import s from './obs.module.css';

interface ScopeReadoutProps {
  /** column = ستون باریک کنار نمودار · row = نوار افقی زیر نمودار. */
  layout?: 'column' | 'row';
}

/**
 * خوانشِ ساعتِ انتخاب‌شده — **یک** پیاده‌سازی برای همهٔ نمودارها.
 *
 * قبلاً همین چهار عدد هم در RidgeChart و هم در DayStrip جدا محاسبه و جدا
 * استایل می‌شد؛ دو نسخه یعنی دو فرصت برای اختلاف. حالا هر نموداری که
 * مکان‌نمای ساعت را تغییر می‌دهد، همین کامپوننت را کنارش می‌گذارد.
 *
 * «نسبت به اوج» عمداً اضافه شده: عددِ خام یک ساعت بی‌مقیاس است، ولی نسبتش با
 * شلوغ‌ترین ساعت شبانه‌روز فوراً می‌گوید این ساعت عادی است یا استثنا.
 */
export function ScopeReadout({ layout = 'column' }: ScopeReadoutProps) {
  const { data, hour, windowHours, isLiveHour } = useObs();
  if (!data) return null;

  const { hourly, hourlyErrors, generatedAt } = data;
  const total = hourly.reduce((sum, value) => sum + value, 0);
  const peak = Math.max(1, ...hourly);

  const selected = hourly[hour] ?? 0;
  const errors = hourlyErrors[hour] ?? 0;
  const rate = selected > 0 ? (errors / selected) * 100 : 0;

  return (
    <div className={s.scope} data-layout={layout} aria-live="polite">
      <p className={s.scopeHour}>
        <span>{bucketLabel(generatedAt, hour, windowHours)}</span>
        {isLiveHour ? <span className={s.scopeLive}>جاری</span> : null}
      </p>

      <p className={s.scopeMain}>
        {faNum(selected)}
        <span className={s.scopeUnit}>رویداد</span>
      </p>

      <ul className={s.scopeFacts}>
        <li data-tone={errors > 0 ? 'bad' : 'ok'}>
          <span>خطا</span>
          <b>{faNum(errors)}</b>
        </li>
        <li data-tone={rate > 2 ? 'warn' : 'idle'}>
          <span>نرخ خطا</span>
          <b>{faPercent(rate)}</b>
        </li>
        <li data-tone="idle">
          <span>سهم شبانه‌روز</span>
          <b>{faPercent(total > 0 ? (selected / total) * 100 : 0)}</b>
        </li>
        <li data-tone="idle">
          <span>نسبت به اوج</span>
          <b>{faPercent((selected / peak) * 100)}</b>
        </li>
      </ul>
    </div>
  );
}
