'use client';

import { formatPersianPhone, toAsciiDigits } from '@/lib/setup/format';
import type { SetupFormValues } from '@/lib/setup/schema';
import * as React from 'react';
import { Field } from './Field';
import { PasswordStrength } from './PasswordStrength';
import { EyeGlyph, EyeOffGlyph, LockGlyph, PhoneGlyph } from './WizardIcons';

export interface StepCredentialsProps {
  values: Pick<SetupFormValues, 'password' | 'phoneNumber'>;
  errors: Partial<Record<keyof SetupFormValues, string>>;
  onChange: <K extends keyof SetupFormValues>(key: K, value: string) => void;
  onBlur: <K extends keyof SetupFormValues>(key: K) => void;
}

export function StepCredentials({ values, errors, onChange, onBlur }: StepCredentialsProps) {
  const [reveal, setReveal] = React.useState(false);

  const handlePhoneChange = (raw: string) => {
    const ascii = toAsciiDigits(raw);
    onChange('phoneNumber', formatPersianPhone(ascii));
  };

  return (
    <div className="setup-step-grid">
      <Field
        id="password"
        name="password"
        label="رمز عبور"
        type={reveal ? 'text' : 'password'}
        autoComplete="new-password"
        value={values.password}
        onChange={(v) => onChange('password', v)}
        onBlur={() => onBlur('password')}
        required
        dir="ltr"
        error={errors.password ?? null}
        help="حداقل ۱۲ کاراکتر، شامل حروف بزرگ، کوچک، عدد و کاراکتر خاص (!@#…)"
        autoFocus
        maxLength={128}
        leading={
          <span className="setup-field__ico">
            <LockGlyph />
          </span>
        }
        trailing={
          <button
            type="button"
            onClick={() => setReveal((r) => !r)}
            className="setup-field__action"
            aria-label={reveal ? 'پنهان‌کردن رمز عبور' : 'نمایش رمز عبور'}
            aria-pressed={reveal}
          >
            {reveal ? <EyeOffGlyph /> : <EyeGlyph />}
          </button>
        }
      />

      <PasswordStrength password={values.password} />

      <Field
        id="phoneNumber"
        name="phoneNumber"
        label="شماره موبایل"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        value={values.phoneNumber}
        onChange={handlePhoneChange}
        onBlur={() => onBlur('phoneNumber')}
        required
        dir="ltr"
        error={errors.phoneNumber ?? null}
        help="برای اطلاع‌رسانی‌های حساس امنیتی"
        leading={
          <span className="setup-field__ico">
            <PhoneGlyph />
          </span>
        }
      />
    </div>
  );
}
