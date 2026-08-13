'use client';

import { forwardRef, useEffect, useId, useImperativeHandle, useRef, useState } from 'react';
import type React from 'react';

// 2026-06-23: production-grade OTP input.
//
// One visually-hidden 6-digit input (autocomplete=one-time-code,
// inputmode=numeric) backed by six visible monotonic-bold numeric cells.
// iOS' Strong Password Heuristics and Android's autofill both behave
// correctly with a single input; visually it looks like six cells.
//
// IME / paste: a 6-digit paste of any kind is accepted; partial pastes
// (e.g. 4 digits) are honoured. The hidden input keeps full keyboard
// accessibility for screen-reader users.
//
// 2026-08-12: each cell is individually clickable — the click moves the
// hidden input's caret to that digit, so the user can edit any position
// (not just the tail). The active cell (caret position) is highlighted
// with .auth-otp-cell--active so it's obvious where typing lands. The
// explicit "پاک کردن کد" button is gone — Backspace/Delete on the
// keyboard clears from the caret, which is the natural affordance.

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

// 6 رقم برای OTP ایمیل، 8 کاراکتر هگز برای کد پشتیبان 2FA
const CELLS = 6;
const BACKUP_CELLS = 8;
const VALID = /^\d{0,6}$/;
const VALID_BACKUP = /^[a-fA-F0-9]{0,8}$/;

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
  const [value, setValue] = useState<string>(() =>
    allowBackupCode && /^[a-fA-F0-9]{8}$/.test(initialValue)
      ? initialValue.toUpperCase()
      : initialValue.replace(/\D/g, '').slice(0, CELLS),
  );
  // محل caret در input مخفی — سلول فعال از روی همین مقدار مشخص می‌شود.
  const [caretPos, setCaretPos] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastSubmitRef = useRef<string>('');
  // 2026-06-24: A1 / F1 — replace hard-coded `id="otp-input"` with a
  // stable per-instance id so multiple OtpDialPads (or even one
  // mounted twice during a Suspense boundary) don't collide on
  // `<label htmlFor>`.
  const inputId = useId();
  const invalidMessageId = `${inputId}-invalid`;

  useEffect(() => {
    inputRef.current?.focus({ preventScroll: true });
  }, []);

  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus({ preventScroll: true }),
    clear: () => {
      setValue('');
      setCaretPos(0);
      lastSubmitRef.current = '';
      inputRef.current?.focus({ preventScroll: true });
    },
    getValue: () => value,
  }));

  const isBackup = mode === 'backup';
  const maxLen = isBackup ? BACKUP_CELLS : CELLS;
  const valid = isBackup ? VALID_BACKUP : VALID;

  const switchMode = () => {
    setMode((m) => (m === 'otp' ? 'backup' : 'otp'));
    setValue('');
    setCaretPos(0);
    lastSubmitRef.current = '';
    onChange?.('');
    inputRef.current?.focus({ preventScroll: true });
  };

  /** خواندن موقعیت caret از input — در focus/click/select/keyup صدا زده می‌شود. */
  const syncCaret = () => {
    const el = inputRef.current;
    if (!el) return;
    setCaretPos(el.selectionStart ?? el.value.length);
  };

  const handleChange = (raw: string) => {
    const next = isBackup
      ? raw
          .replace(/[^a-fA-F0-9]/g, '')
          .toUpperCase()
          .slice(0, BACKUP_CELLS)
      : raw.replace(/\D/g, '').slice(0, CELLS);
    if (!valid.test(next)) return;
    setValue(next);
    onChange?.(next);

    const targetLen = isBackup ? BACKUP_CELLS : CELLS;
    if (autoSubmit && next.length === targetLen && next !== lastSubmitRef.current) {
      lastSubmitRef.current = next;
      onComplete(next);
    }
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (event) => {
    if (event.key === 'Enter' && value.length === maxLen && !disabled) {
      event.preventDefault();
      lastSubmitRef.current = value;
      onComplete(value);
    }
  };

  /**
   * کلیک روی سلول i: caret را روی همان خانه می‌گذارد تا کاربر بتواند
   * هر رقم را مستقیم ویرایش کند (نه فقط آخرین خانه).
   */
  const focusCell = (index: number) => {
    const el = inputRef.current;
    if (!el || disabled) return;
    const pos = Math.min(index, value.length);
    el.focus({ preventScroll: true });
    try {
      el.setSelectionRange(pos, pos);
    } catch {
      // ignore — بعضی مرورگرها روی input مخفی setSelectionRange را رد می‌کنند
    }
    setCaretPos(pos);
  };

  const cells: string[] = Array.from({ length: maxLen });
  for (let i = 0; i < maxLen; i++) cells[i] = value[i] ?? '';

  return (
    <div
      className={`auth-otp-shell${isBackup ? ' auth-otp-shell--backup' : ''}`}
      aria-label={isBackup ? 'کد پشتیبان ۸ کاراکتری را وارد کنید' : 'کد ۶ رقمی را وارد کنید'}
    >
      <div
        className={`auth-otp-grid${isBackup ? ' auth-otp-grid--backup' : ''}`}
        aria-hidden="true"
        onClick={(e) => {
          // کلیک روی خود گرید (بین سلول‌ها) → caret به انتهای مقدار فعلی
          if (e.target === e.currentTarget) {
            const el = inputRef.current;
            if (!el || disabled) return;
            el.focus({ preventScroll: true });
            const pos = value.length;
            try {
              el.setSelectionRange(pos, pos);
            } catch {
              // ignore
            }
            setCaretPos(pos);
          }
        }}
      >
        {cells.map((char, i) => {
          const cls = [
            'auth-otp-cell',
            char && 'auth-otp-cell--filled',
            invalid && char && 'auth-otp-cell--invalid',
            i === caretPos && 'auth-otp-cell--active',
          ]
            .filter(Boolean)
            .join(' ');
          return (
            <div
              key={i}
              className={cls}
              role="presentation"
              onClick={() => focusCell(i)}
              onMouseDown={(e) => e.preventDefault()}
            >
              <span className="block text-center" dir="ltr">
                {char || '–'}
              </span>
            </div>
          );
        })}
      </div>
      <input
        ref={inputRef}
        id={inputId}
        type="text"
        inputMode={isBackup ? 'text' : 'numeric'}
        autoComplete={isBackup ? 'off' : 'one-time-code'}
        pattern={isBackup ? '[A-F0-9]{8}' : '\\d{6}'}
        maxLength={maxLen}
        dir="ltr"
        disabled={disabled}
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onSelect={syncCaret}
        onClick={syncCaret}
        onKeyUp={syncCaret}
        onFocus={() => syncCaret()}
        aria-describedby={
          invalid && value.length > 0
            ? [describedBy, invalidMessageId].filter(Boolean).join(' ')
            : describedBy
        }
        aria-invalid={invalid || undefined}
        className="auth-otp-input"
      />
      {/* F2 / A3: screen-reader announcement for invalid state. */}
      <p
        id={invalidMessageId}
        role={invalid && value.length > 0 ? 'alert' : undefined}
        className="sr-only"
      >
        {invalid && value.length > 0 ? 'کد وارد شده نادرست است. لطفاً دوباره وارد کنید' : ''}
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
