'use client';

import { forwardRef, useEffect, useId, useImperativeHandle, useRef, useState } from 'react';
import type React from 'react';

// 2026-08-14: بازنویسی کامل — از input مخفی ۱px + سلول‌های نمایشی به الگوی
// استاندارد OTP (Stripe / GOV.UK / بانک‌ها): هر خانه یک `<input>` واقعی با
// maxLength=1. باگ‌های نسخه قبلی (جابجایی caret روی موبایل، حذف رقم اشتباه،
// مشکل صفر) از اساس حذف شدند چون دیگر state جداگانه‌ای برای caret نداریم —
// خود مرورگر caret را در خود input نگه می‌دارد.
//
// رفتار:
//   - تایپ رقم → advance خودکار به خانه بعد (auto-advance)
//   - Backspace روی خانه خالی → پرش به خانه قبلی (حذف زنجیره‌ای)
//   - چسباندن (paste) کد کامل یا قسمتی → پخش روی خانه‌ها از جای caret
//   - ورود ۶ رقم کامل (یا ۸ کاراکتر کد پشتیبان) → auto-submit
//   - autocomplete=one-time-code روی خانه اول → iOS/Android autofill
//   - هر خانه `aria-label` مستقل دارد؛ پیام خطا فقط برای screen-reader
//
// API کامپوننت (props + ref handle) بدون تغییر — والدین سالم می‌مانند.

export type OtpDialPadHandle = {
  focus: () => void;
  clear: () => void;
  getValue: () => string;
};

interface OtpDialPadProps {
  onComplete: (code: string) => void;
  onChange?: (code: string) => void;
  invalid?: boolean;
  initialValue?: string;
  describedBy?: string;
  disabled?: boolean;
  autoSubmit?: boolean;
  /** حالت 2FA: کد پشتیبان ۸ کاراکتری هگز (مثل 17B024DB) هم پذیرفته می‌شود */
  allowBackupCode?: boolean;
}

const CELLS = 6;
const BACKUP_CELLS = 8;

const OtpDialPad = forwardRef<OtpDialPadHandle, OtpDialPadProps>(function OtpDialPad(
  {
    onComplete,
    onChange,
    invalid = false,
    initialValue = '',
    describedBy,
    disabled = false,
    autoSubmit = true,
    allowBackupCode = false,
  },
  ref,
) {
  // حالت ورود: پیش‌فرض کد ۶ رقمی TOTP است؛ کد پشتیبان ۸ کاراکتری هگز فقط
  // وقتی کاربر خودش به آن حالت برود (کلید «ورود با کد پشتیبان»).
  const [mode, setMode] = useState<'otp' | 'backup'>(() =>
    allowBackupCode && /^[a-fA-F0-9]{8}$/.test(initialValue) ? 'backup' : 'otp',
  );
  // digits همیشه آرایه ۸تایی است؛ در حالت otp فقط ۶ خانه اول استفاده می‌شود.
  const [digits, setDigits] = useState<string[]>(() => {
    const src =
      allowBackupCode && /^[a-fA-F0-9]{8}$/.test(initialValue)
        ? initialValue.toUpperCase()
        : initialValue.replace(/\D/g, '').slice(0, CELLS);
    return Array.from({ length: BACKUP_CELLS }, (_, i) => src[i] ?? '');
  });
  const cellRefs = useRef<Array<HTMLInputElement | null>>([]);
  const lastSubmitRef = useRef('');
  const invalidMessageId = useId();

  const isBackup = mode === 'backup';
  const maxLen = isBackup ? BACKUP_CELLS : CELLS;
  const code = digits.slice(0, maxLen).join('');

  const focusCell = (index: number) => {
    const idx = Math.max(0, Math.min(index, maxLen - 1));
    cellRefs.current[idx]?.focus({ preventScroll: true });
  };

  const focusFirstEmpty = () => {
    const empty = digits.findIndex((d) => d === '');
    focusCell(empty === -1 ? maxLen - 1 : empty);
  };

  // فوکوس اولیه: اولین خانه خالی (یا آخرین خانه اگر کامل است)
  useEffect(() => {
    focusFirstEmpty();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useImperativeHandle(ref, () => ({
    focus: focusFirstEmpty,
    clear: () => {
      setDigits(Array(BACKUP_CELLS).fill(''));
      lastSubmitRef.current = '';
      onChange?.('');
      focusFirstEmpty();
    },
    getValue: () => code,
  }));

  const switchMode = () => {
    setMode((m) => (m === 'otp' ? 'backup' : 'otp'));
    setDigits(Array(BACKUP_CELLS).fill(''));
    lastSubmitRef.current = '';
    onChange?.('');
    focusFirstEmpty();
  };

  /** پخش یک رشته (paste/autofill) روی خانه‌ها از position دلخواه. */
  const distribute = (raw: string, startIdx: number) => {
    const cleaned = (
      isBackup ? raw.replace(/[^a-fA-F0-9]/g, '').toUpperCase() : raw.replace(/\D/g, '')
    ).slice(0, maxLen);
    if (!cleaned) return;
    const next = [...digits];
    for (let k = 0; k < cleaned.length && startIdx + k < maxLen; k++) {
      next[startIdx + k] = cleaned[k];
    }
    setDigits(next);
    onChange?.(next.join(''));
    const end = Math.min(startIdx + cleaned.length, maxLen);
    if (end < maxLen) {
      focusCell(end);
    } else {
      const full = next.join('');
      if (autoSubmit && full.length === maxLen && full !== lastSubmitRef.current) {
        lastSubmitRef.current = full;
        onComplete(full);
      }
    }
  };

  /** نوشتن/پاک‌کردن یک خانه؛ اگر خانه آخر پر شد → auto-submit. */
  const setDigitAt = (index: number, char: string) => {
    const clean = isBackup ? char.toUpperCase() : char;
    if (clean !== '' && !(isBackup ? /^[a-fA-F0-9]$/.test(clean) : /^\d$/.test(clean))) {
      return;
    }
    const next = [...digits];
    next[index] = clean;
    setDigits(next);
    const full = next.slice(0, maxLen).join('');
    onChange?.(full);
    if (clean === '') return;
    if (index < maxLen - 1) {
      focusCell(index + 1);
    } else if (autoSubmit && full.length === maxLen && full !== lastSubmitRef.current) {
      lastSubmitRef.current = full;
      onComplete(full);
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
      if (digits[index]) return; // حذف پیش‌فرض خود مرورگر کافی است
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
    if (event.key === 'Enter' && code.length === maxLen) {
      event.preventDefault();
      lastSubmitRef.current = code;
      onComplete(code);
    }
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLInputElement>, index: number) => {
    event.preventDefault();
    distribute(event.clipboardData.getData('text'), index);
  };

  const gridLabel = isBackup ? 'کد پشتیبان ۸ کاراکتری' : 'کد ۶ رقمی';

  return (
    <div
      className={`auth-otp-shell${isBackup ? ' auth-otp-shell--backup' : ''}`}
      aria-label={gridLabel}
    >
      <div
        className={`auth-otp-grid${isBackup ? ' auth-otp-grid--backup' : ''}`}
        role="group"
        aria-label={gridLabel}
      >
        {Array.from({ length: maxLen }).map((_, i) => {
          const cls = [
            'auth-otp-input',
            digits[i] && 'auth-otp-input--filled',
            invalid && digits[i] && 'auth-otp-input--invalid',
          ]
            .filter(Boolean)
            .join(' ');
          return (
            <input
              key={i}
              ref={(el) => {
                cellRefs.current[i] = el;
              }}
              type="text"
              inputMode={isBackup ? 'text' : 'numeric'}
              autoComplete={i === 0 && !isBackup ? 'one-time-code' : 'off'}
              maxLength={1}
              dir="ltr"
              disabled={disabled}
              value={digits[i]}
              onChange={(e) => handleChange(e, i)}
              onKeyDown={(e) => handleKeyDown(e, i)}
              onPaste={(e) => handlePaste(e, i)}
              className={cls}
              aria-label={isBackup ? `کاراکتر ${i + 1} از ${maxLen}` : `رقم ${i + 1} از ${maxLen}`}
              aria-invalid={invalid && digits[i] ? true : undefined}
              aria-describedby={i === 0 ? describedBy : undefined}
            />
          );
        })}
      </div>
      {/* F2 / A3: screen-reader announcement for invalid state. */}
      <p
        id={invalidMessageId}
        role={invalid && code.length > 0 ? 'alert' : undefined}
        className="sr-only"
      >
        {invalid && code.length > 0 ? 'کد وارد شده نادرست است. لطفاً دوباره وارد کنید' : ''}
      </p>
      <div className="auth-otp-toolbar">
        {allowBackupCode && (
          <button
            type="button"
            className="auth-link-row auth-link-row--inline"
            onClick={switchMode}
            disabled={disabled}
          >
            {isBackup ? 'بازگشت به کد ۶ رقمی' : 'ورود با کد پشتیبان'}
          </button>
        )}
      </div>
    </div>
  );
});

export default OtpDialPad;
