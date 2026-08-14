'use client';

import { forwardRef, useImperativeHandle, useRef } from 'react';
import type React from 'react';

import styles from './CellCodeInput.module.css';

export type CellCodeInputHandle = { focus: () => void };

interface CellCodeInputProps {
  /** مقدار فعلی کد (فقط ارقام) — controlled از والد. */
  value: string;
  onChange: (code: string) => void;
  /** وقتی آخرین خانه پر شد (کد کامل). */
  onComplete?: (code: string) => void;
  length?: number;
  disabled?: boolean;
  /** true → خانه‌های پر استایل خطا بگیرند. */
  invalid?: boolean;
  /** روی خانه اول اعمال می‌شود (autofill مرورگر). */
  autoComplete?: string;
  inputMode?: 'numeric' | 'text';
  /** aria-label گروه + خانه‌ها. */
  ariaLabel?: string;
  /** id خانه اول — برای label htmlFor. */
  id?: string;
  /** کلاس‌های استایل — والد با توکن‌های خودش. */
  className?: string;
  cellClassName?: string;
  filledClassName?: string;
  invalidClassName?: string;
}

/**
 * ورودی کد سلولی مشترک (2026-08-14) — همان الگوی OtpDialPad که قبلاً فقط
 * در احراز هویت بود: هر خانه یک input واقعی با maxLength=1، auto-advance،
 * backspace-to-previous، پخش paste/autofill و auto-submit هنگام کامل شدن.
 * این کامپوننت فقط رفتار + ساختار می‌دهد؛ ظاهر را والد با توکن‌های خودش
 * (className/cellClassName/filledClassName/invalidClassName) می‌سازد.
 */
const CellCodeInput = forwardRef<CellCodeInputHandle, CellCodeInputProps>(function CellCodeInput(
  {
    value,
    onChange,
    onComplete,
    length = 6,
    disabled = false,
    invalid = false,
    autoComplete = 'one-time-code',
    inputMode = 'numeric',
    ariaLabel,
    id,
    className,
    cellClassName,
    filledClassName,
    invalidClassName,
  },
  ref,
) {
  const cellRefs = useRef<Array<HTMLInputElement | null>>([]);

  const digits = Array.from({ length }, (_, i) => value[i] ?? '');

  const focusCell = (index: number) => {
    const idx = Math.max(0, Math.min(index, length - 1));
    cellRefs.current[idx]?.focus({ preventScroll: true });
  };

  const focusFirstEmpty = () => {
    const empty = digits.findIndex((d) => d === '');
    focusCell(empty === -1 ? length - 1 : empty);
  };

  useImperativeHandle(ref, () => ({ focus: focusFirstEmpty }));

  /** پخش یک رشته (paste/autofill) روی خانه‌ها از جای دلخواه. */
  const distribute = (raw: string, startIdx: number) => {
    const cleaned = raw.replace(/\D/g, '').slice(0, length);
    if (!cleaned) return;
    const next = [...digits];
    for (let k = 0; k < cleaned.length && startIdx + k < length; k++) {
      next[startIdx + k] = cleaned[k];
    }
    const code = next.join('');
    onChange(code);
    const end = Math.min(startIdx + cleaned.length, length);
    if (end < length) {
      focusCell(end);
    } else if (onComplete && code.length === length) {
      onComplete(code);
    }
  };

  /** نوشتن/پاک‌کردن یک خانه؛ اگر خانه آخر پر شد → auto-submit. */
  const setDigitAt = (index: number, char: string) => {
    const clean = char.replace(/\D/g, '');
    if (clean !== '' && clean.length !== 1) return;
    const next = [...digits];
    next[index] = clean;
    const code = next.join('');
    onChange(code);
    if (clean === '') return;
    if (index < length - 1) {
      focusCell(index + 1);
    } else if (onComplete && code.length === length) {
      onComplete(code);
    }
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const raw = event.target.value;
    // طول >۱ یعنی autofill مرورگر (کد کامل را یکجا در خانه اول می‌گذارد)
    if (raw.length > 1) {
      distribute(raw, index);
      return;
    }
    setDigitAt(index, raw);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (disabled) return;
    if (event.key === 'Backspace') {
      if (digits[index]) return; // حذف پیش‌فرض مرورگر کافی است
      event.preventDefault();
      focusCell(index - 1);
      return;
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      focusCell(index + 1);
      return;
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      focusCell(index - 1);
      return;
    }
    if (event.key === 'Enter' && value.length === length) {
      event.preventDefault();
      onComplete?.(value);
    }
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLInputElement>, index: number) => {
    event.preventDefault();
    distribute(event.clipboardData.getData('text'), index);
  };

  return (
    <fieldset
      className={`${styles.grid}${className ? ` ${className}` : ''}`}
      aria-label={ariaLabel}
      style={{ gridTemplateColumns: `repeat(${length}, minmax(0, 1fr))` }}
    >
      {digits.map((char, i) => {
        const cls = [
          styles.cell,
          cellClassName,
          char && filledClassName,
          invalid && char && invalidClassName,
        ]
          .filter(Boolean)
          .join(' ');
        return (
          <input
            // biome-ignore lint/suspicious/noArrayIndexKey: لیست ثابت و بدون جابه‌جایی
            key={i}
            ref={(el) => {
              cellRefs.current[i] = el;
            }}
            id={i === 0 ? id : undefined}
            type="text"
            inputMode={inputMode}
            autoComplete={i === 0 ? autoComplete : 'off'}
            maxLength={1}
            dir="ltr"
            disabled={disabled}
            value={char}
            onChange={(e) => handleChange(e, i)}
            onKeyDown={(e) => handleKeyDown(e, i)}
            onPaste={(e) => handlePaste(e, i)}
            onFocus={(e) => e.target.select()}
            className={cls}
            aria-label={ariaLabel ? `${ariaLabel} — خانه ${i + 1} از ${length}` : undefined}
            aria-invalid={invalid && char ? true : undefined}
          />
        );
      })}
    </fieldset>
  );
});

export default CellCodeInput;
