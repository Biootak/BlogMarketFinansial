'use client';

import { formatPersianPhone, toAsciiDigits } from '@/lib/setup/format';
import type { SetupFormValues } from '@/lib/setup/schema';
import * as React from 'react';
import { Field } from './Field';
import { PasswordStrength } from './PasswordStrength';
import { RequirementList } from './RequirementList';
import { EyeGlyph, EyeOffGlyph, LockGlyph, PhoneGlyph } from './WizardIcons';

export interface StepCredentialsProps {
  values: Pick<SetupFormValues, 'password' | 'phoneNumber'>;
  errors: Partial<Record<keyof SetupFormValues, string>>;
  onChange: <K extends keyof SetupFormValues>(key: K, value: string) => void;
  onBlur: <K extends keyof SetupFormValues>(key: K) => void;
}

export function StepCredentials({ values, errors, onChange, onBlur }: StepCredentialsProps) {
  const [reveal, setReveal] = React.useState(false);

  const handlePhoneChange = React.useCallback(
    (raw: string) => {
      // Convert any Persian/Arabic digits to ASCII first.
      const ascii = toAsciiDigits(raw);
      // Strip everything except digits — we want to store the canonical
      // (unformatted) form in state so schema validation and server submission
      // both work against PERSIAN_PHONE_REGEX.
      const digitsOnly = ascii.replace(/[^\d]/g, '');

      // Normalize common prefixes to the canonical national form:
      //   Afghanistan-first: `+93 7XXXXXXXX` → `07XXXXXXXX` (10 digits)
      //   Iran (legacy):     `+98 9XXXXXXXXX` → `09XXXXXXXXX` (11 digits)
      // The regex accepts `+93|0093|93|0` + `7…` and `+98|0098|98|0` + `9…`.
      let canonical: string;
      if (digitsOnly.startsWith('0093')) {
        canonical = `0${digitsOnly.slice(4)}`;
      } else if (digitsOnly.startsWith('93') && digitsOnly.length > 10) {
        // `93…` could be `+93 7…` (Afghan) or a truncated Iranian `9…` —
        // a redundant zero (`+93 0 7…` → `9307…`) must be stripped too.
        const rest = digitsOnly[2] === '0' ? digitsOnly.slice(3) : digitsOnly.slice(2);
        canonical = `0${rest}`;
      } else if (digitsOnly.startsWith('0098')) {
        canonical = `0${digitsOnly.slice(4)}`;
      } else if (digitsOnly.startsWith('98') && digitsOnly.length > 10) {
        canonical = `0${digitsOnly.slice(2)}`;
      } else if (digitsOnly.startsWith('0')) {
        canonical = digitsOnly;
      } else if (digitsOnly.startsWith('9') || digitsOnly.startsWith('7')) {
        canonical = `0${digitsOnly}`;
      } else {
        canonical = digitsOnly;
      }

      // Hard-cap at 11 digits (0 + 10). Anything beyond is dropped silently
      // to avoid pushing the user into an unrecoverable invalid state.
      canonical = canonical.slice(0, 11);

      onChange('phoneNumber', canonical);
    },
    [onChange],
  );

  // Display only: show the formatted version (e.g. "0912 345 6789") while
  // keeping state canonical. This avoids the regex-busting whitespace bug
  // and keeps the server payload clean.
  const phoneDisplay = formatPersianPhone(values.phoneNumber);

  return (
    <div className="setup-step-grid">
      <div className="setup-step-grid__password">
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

        <div className="setup-step-grid__password-meta">
          <PasswordStrength password={values.password} />
          <RequirementList password={values.password} />
        </div>
      </div>

      <Field
        id="phoneNumber"
        name="phoneNumber"
        label="شماره موبایل"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        value={phoneDisplay}
        onChange={handlePhoneChange}
        onBlur={() => onBlur('phoneNumber')}
        required
        dir="ltr"
        error={errors.phoneNumber ?? null}
        help="مثال: ۰۷۰۱۲۳۴۵۶۷ (افغانستان) یا ۰۹۱۲۳۴۵۶۷۸۹ (ایران)"
        leading={
          <span className="setup-field__ico">
            <PhoneGlyph />
          </span>
        }
      />
    </div>
  );
}
