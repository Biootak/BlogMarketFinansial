import type { ToneKey } from './format';
import s from './obs.module.css';

interface MeterBarProps {
  /** ۰..۱۰۰ */
  value: number;
  /** نشانگر هدف/آستانه روی همان ریل (۰..۱۰۰) — اختیاری. */
  target?: number;
  tone?: ToneKey;
  /** ضخامت بیشتر برای ریل‌های شاخص، نازک برای ریزمعیارها. */
  weight?: 'hair' | 'bold';
}

/**
 * ریلِ مویی مشترک — تنها راه نمایش «بزرگی نسبی» در این مسیر.
 *
 * عدد خالی بدون مقیاس چیزی نمی‌گوید، و کارتِ عددِ بزرگ فضای بی‌دلیل می‌خورد.
 * پس هر عدد این صفحه یک ریل هم‌کنارش دارد. عرض با inline-size ست می‌شود
 * (logical) و فقط transform/opacity انیمیت می‌شود.
 */
export function MeterBar({ value, target, tone, weight = 'hair' }: MeterBarProps) {
  const safe = Math.max(0, Math.min(100, value));

  return (
    <span className={s.meter} data-tone={tone} data-weight={weight} aria-hidden="true">
      <span className={s.meterFill} style={{ inlineSize: `${safe}%` }} />
      {typeof target === 'number' ? (
        <span
          className={s.meterTarget}
          style={{ insetInlineStart: `${Math.max(0, Math.min(100, target))}%` }}
        />
      ) : null}
    </span>
  );
}
