'use client';

import { RotateCcw, TriangleAlert } from 'lucide-react';

import o from './_components/obs.module.css';
import s from './observability.module.css';

/**
 * مرز خطای مسیر.
 *
 * صادق است: نمی‌گوید «مشکلی پیش آمد»، می‌گوید دقیقاً چه چیزی از کار افتاده و
 * چه چیزی هنوز کار می‌کند. متن خطای خام را هم نشان می‌دهد چون مخاطب این صفحه
 * ادمین است، نه کاربر نهایی.
 */
export default function ObservabilityError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className={s.skeleton} role="alert">
      <div className={o.empty}>
        <TriangleAlert size={20} strokeWidth={1.5} className={o.emptyIcon} aria-hidden="true" />
        <p className={o.emptyTitle}>خواندن وضعیت سامانه شکست خورد</p>
        <p className={o.emptyHint}>
          پوستهٔ داشبورد سالم است و بقیهٔ بخش‌ها کار می‌کنند؛ فقط این مسیر نتوانست snapshot را
          بسازد. معمولاً یعنی اتصال دیتابیس یا نشست، نه خرابی سامانه.
        </p>
        {error.digest ? (
          <p className={o.emptyHint}>
            شناسهٔ رخداد: <bdi className={o.mono}>{error.digest}</bdi>
          </p>
        ) : null}
        <button type="button" className={o.ghostButton} onClick={reset}>
          <RotateCcw size={14} strokeWidth={1.8} aria-hidden="true" />
          تلاش دوباره
        </button>
      </div>
    </div>
  );
}
