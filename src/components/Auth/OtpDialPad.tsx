'use client';

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { Delete } from 'lucide-react';
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
}

const CELLS = 6;
const VALID = /^\d{0,6}$/;

const OtpDialPad = forwardRef<OtpDialPadHandle, OtpDialPadProps>(
  function OtpDialPad(
    {
      onComplete,
      onChange,
      invalid = false,
      initialValue = '',
      describedBy,
      disabled = false,
      autoSubmit = true,
    },
    ref,
  ) {
    const [value, setValue] = useState<string>(() =>
      initialValue.replace(/\D/g, '').slice(0, CELLS),
    );
    const inputRef = useRef<HTMLInputElement>(null);
    const lastSubmitRef = useRef<string>('');

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

    const handleChange = (raw: string) => {
      const next = raw.replace(/\D/g, '').slice(0, CELLS);
      if (!VALID.test(next)) return;
      setValue(next);
      onChange?.(next);

      if (
        autoSubmit &&
        next.length === CELLS &&
        next !== lastSubmitRef.current
      ) {
        lastSubmitRef.current = next;
        onComplete(next);
      }
    };

    const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (event) => {
      if (event.key === 'Enter' && value.length === CELLS && !disabled) {
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

    const cells: string[] = Array.from({ length: CELLS });
    for (let i = 0; i < CELLS; i++) cells[i] = value[i] ?? '';

    return (
      <div
        className="auth-otp-shell"
        aria-label="کد ۶ رقمی را وارد کنید"
      >
        <div
          className="auth-otp-grid"
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
          id="otp-input"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d{6}"
          maxLength={CELLS}
          dir="ltr"
          disabled={disabled}
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          className="auth-otp-input"
        />
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
        </div>
      </div>
    );
  },
);

export default OtpDialPad;
