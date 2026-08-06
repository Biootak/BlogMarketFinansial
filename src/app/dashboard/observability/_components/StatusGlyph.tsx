import type { ToneKey } from './format';
import s from './obs.module.css';

interface StatusGlyphProps {
  tone: ToneKey;
  /** وقتی true است هالهٔ نازک دور نشانه می‌آید — برای ردیف بحرانی. */
  emphasis?: boolean;
}

/**
 * نشانهٔ وضعیت — **شکل** متفاوت برای هر تُن، نه فقط رنگ متفاوت.
 *
 * قانون WCAG: رنگ هرگز تنها حامل معنا نباشد. پس دایره=سالم، مثلث=هشدار،
 * لوزی=خطا، مربع=اطلاع، حلقهٔ توخالی=بی‌ترافیک. کاربر کوررنگ هم ردیف قطع را
 * از ردیف سالم تشخیص می‌دهد.
 */
export function StatusGlyph({ tone, emphasis = false }: StatusGlyphProps) {
  return (
    <svg
      className={s.glyph}
      data-tone={tone}
      data-emphasis={emphasis}
      viewBox="0 0 12 12"
      aria-hidden="true"
      focusable="false"
    >
      {tone === 'ok' ? <circle cx="6" cy="6" r="3.2" /> : null}
      {tone === 'warn' ? <path d="M6 2.1 10.2 9.6 1.8 9.6Z" /> : null}
      {tone === 'bad' ? <path d="M6 1.6 10.4 6 6 10.4 1.6 6Z" /> : null}
      {tone === 'info' ? <rect x="3" y="3" width="6" height="6" rx="1.4" /> : null}
      {tone === 'idle' ? (
        <circle className={s.glyphHollow} cx="6" cy="6" r="3" vectorEffect="non-scaling-stroke" />
      ) : null}
    </svg>
  );
}
