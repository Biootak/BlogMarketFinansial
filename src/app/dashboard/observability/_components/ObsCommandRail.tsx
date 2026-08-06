'use client';

import { ObsSubNav } from './ObsSubNav';
import { ObsToolbar } from './ObsToolbar';
import { HourScrubber } from './HourScrubber';
import s from './obs.module.css';

/**
 * نوار فرمان — سه سازِ هم‌خانواده در یک قاب چسبان:
 *   کجا هستم (ObsSubNav) · داده چقدر تازه است (ObsToolbar) · کدام ساعت را
 *   نگاه می‌کنم (HourScrubber).
 *
 * چرا یکی شد: قبلاً ناوبری و وضعیت دو بلوک جدا بودند و مکان‌نمای ساعت اصلاً
 * کنترل سراسری نداشت (فقط با کلیک روی نمودار جابه‌جا می‌شد). حالا هر سه در یک
 * نوار جمع‌اند، پس زمینهٔ خواندن همهٔ boardها همیشه پیش چشم است.
 *
 * شیشه فقط همین‌جا مجاز است: blur کم، شفافیت کم، مرز مویی.
 */
export function ObsCommandRail() {
  return (
    <div className={s.rail}>
      <div className={s.railTop}>
        <ObsSubNav />
        <ObsToolbar />
      </div>
      <HourScrubber />
    </div>
  );
}
