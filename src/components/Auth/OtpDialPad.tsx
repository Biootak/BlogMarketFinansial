'use client';

import { Delete } from 'lucide-react';
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
    lastSubmitRef.current = '';
    onChange?.('');
    inputRef.current?.focus({ preventScroll: true });
  };

  const handleChange = (raw: string) => {
    const next = isBackup
      ? raw.replace(/[^a-fA-F0-9]/g, '').toUpperCase().slice(0, BACKUP_CELLS)
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

  const handleClear = () => {
    setValue('');
    lastSubmitRef.current = '';
    onChange?.('');
    inputRef.current?.focus({ preventScroll: true });
  };

  const cells: string[] = Array.from({ length: maxLen });
  for (let i = 0; i < maxLen; i++) cells[i] = value[i] ?? '';

  return (
    <div
      className={`auth-otp-shell${isBackup ? ' auth-otp-shell--backup' : ''}`}
      aria-label={
        isBackup ? 'کد پشتیبان ۸ کاراکتری را وارد کنید' : 'کد ۶ رقمی را وارد کنید'
      }
    >
      <div
        className={`auth-otp-grid${isBackup ? ' auth-otp-grid--backup' : ''}`}
        aria-hidden="true"
      >
        {cells.map((char, i) => {
          const cls = [
            'auth-otp-cell',
            char && 'auth-otp-cell--filled',
            invalid && char && 'auth-otp-cell--invalid',
          ]
            .filter(Boolean)
            .join(' ');
          return (
            <div key={i} className={cls}>
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
        <button
          type="button"
          className="auth-link-row auth-link-row--inline"
          onClick={handleClear}
          disabled={disabled || value.length === 0}
        >
          <Delete aria-hidden="true" />
          پاک کردن کد
        </button>
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
