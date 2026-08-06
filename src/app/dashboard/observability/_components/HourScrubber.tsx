'use client';

import { ChevronLeft, ChevronRight, Crosshair } from 'lucide-react';

import { bucketLabel, faNum } from './format';
import { useObs } from './ObsProvider';
import s from './obs.module.css';

/**
 * مکان‌نمای زمانی سراسری.
 *
 * قبلاً `stepHour` و `resetHour` در ObsProvider تعریف شده بودند ولی هیچ‌جا
 * استفاده نمی‌شدند؛ یعنی مکان‌نما فقط با موس روی نمودار جابه‌جا می‌شد و با
 * کیبورد هیچ راه مستقیمی نداشت. این کنترل همان قابلیت را به سطح نوار فرمان
 * می‌آورد: دو دکمهٔ گام، ریلِ موقعیت، و بازگشت به ساعت جاری.
 *
 * RTL: کل مسیر `dir=rtl` است و محور زمان در همهٔ نمودارهای این صفحه از
 * inline-start (قدیمی‌ترین) به inline-end (هم‌اکنون) می‌رود. پس «قدیمی‌تر»
 * به‌سمت راست است و آیکونش ChevronRight؛ «تازه‌تر» به‌سمت چپ و ChevronLeft.
 * موقعیت ریل هم با inset-inline-start ست می‌شود، نه left، تا اگر زیرشاخه‌ای
 * روزی ltr شد خودش برگردد.
 */
export function HourScrubber() {
  const { data, hour, windowHours, isLiveHour, stepHour, resetHour } = useObs();

  const last = Math.max(0, windowHours - 1);
  const position = last > 0 ? (hour / last) * 100 : 100;
  const label = data ? bucketLabel(data.generatedAt, hour, windowHours) : 'بدون خوانش';
  const ago = last - hour;

  return (
    <div className={s.scrub}>
      <span className={s.scrubKey}>
        <Crosshair size={14} strokeWidth={1.5} aria-hidden="true" />
        مکان‌نمای ساعت
      </span>

      <div className={s.scrubCtl}>
        <button
          type="button"
          className={s.scrubBtn}
          onClick={() => stepHour(-1)}
          disabled={hour <= 0}
          aria-label="یک ساعت قدیمی‌تر"
        >
          <ChevronRight size={16} strokeWidth={1.75} aria-hidden="true" />
        </button>

        <span className={s.scrubTrack} aria-hidden="true">
          <span className={s.scrubFill} style={{ inlineSize: `${position}%` }} />
          <span className={s.scrubHead} style={{ insetInlineStart: `${position}%` }} />
        </span>

        <button
          type="button"
          className={s.scrubBtn}
          onClick={() => stepHour(1)}
          disabled={isLiveHour}
          aria-label="یک ساعت تازه‌تر"
        >
          <ChevronLeft size={16} strokeWidth={1.75} aria-hidden="true" />
        </button>
      </div>

      <output className={s.scrubOut} aria-live="polite">
        <b>{label}</b>
        <span>{ago === 0 ? 'ساعت جاری' : `${faNum(ago)} ساعت پیش`}</span>
      </output>

      <button
        type="button"
        className={s.scrubNow}
        onClick={resetHour}
        disabled={isLiveHour}
        data-live={isLiveHour}
      >
        {isLiveHour ? 'قفل روی هم‌اکنون' : 'بازگشت به هم‌اکنون'}
      </button>
    </div>
  );
}
