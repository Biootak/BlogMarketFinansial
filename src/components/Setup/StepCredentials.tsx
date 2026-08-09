'use client';

import { toAsciiDigits } from '@/lib/setup/format';
import type { SetupFormValues } from '@/lib/setup/schema';
import { generateStrongPassword } from '@/lib/setup/strength';
import { parsePhoneNumber, type CountryCode } from 'libphonenumber-js';
import * as React from 'react';
import { Field } from './Field';
import { PasswordStrength } from './PasswordStrength';
import { RequirementList } from './RequirementList';
import { ChevronDownGlyph, EyeGlyph, EyeOffGlyph, LockGlyph, WandGlyph } from './WizardIcons';

/**
 * StepCredentials — access step: strong password + mobile number.
 *
 * The phone field carries a compact country-code selector. The number is
 * stored as E.164 (e.g. +93701234567) so every country is validated by the
 * same libphonenumber mechanism the rest of the app uses, and the display
 * is formatted per-country (070 123 4567 / 912 345 6789) as you type.
 */

export interface StepCredentialsProps {
  values: Pick<SetupFormValues, 'password' | 'phoneNumber'>;
  errors: Partial<Record<keyof SetupFormValues, string>>;
  onChange: <K extends keyof SetupFormValues>(key: K, value: string) => void;
  onBlur: <K extends keyof SetupFormValues>(key: K) => void;
}

/** Curated dial-code list — AF first (the platform's primary market). */
const COUNTRY_OPTIONS: ReadonlyArray<{ code: CountryCode; name: string; dial: string }> = [
  { code: 'AF', name: 'افغانستان', dial: '+93' },
  { code: 'IR', name: 'ایران', dial: '+98' },
  { code: 'US', name: 'ایالات متحده', dial: '+1' },
  { code: 'GB', name: 'بریتانیا', dial: '+44' },
  { code: 'DE', name: 'آلمان', dial: '+49' },
  { code: 'FR', name: 'فرانسه', dial: '+33' },
  { code: 'TR', name: 'ترکیه', dial: '+90' },
  { code: 'AE', name: 'امارات', dial: '+971' },
  { code: 'SA', name: 'عربستان سعودی', dial: '+966' },
  { code: 'PK', name: 'پاکستان', dial: '+92' },
  { code: 'IN', name: 'هند', dial: '+91' },
  { code: 'CN', name: 'چین', dial: '+86' },
  { code: 'RU', name: 'روسیه', dial: '+7' },
  { code: 'CA', name: 'کانادا', dial: '+1' },
  { code: 'AU', name: 'استرالیا', dial: '+61' },
];

const DIAL_BY_COUNTRY = Object.fromEntries(
  COUNTRY_OPTIONS.map((c) => [c.code, c.dial]),
) as Record<CountryCode, string>;

export function StepCredentials({ values, errors, onChange, onBlur }: StepCredentialsProps) {
  const [reveal, setReveal] = React.useState(false);
  const [country, setCountry] = React.useState<CountryCode>('AF');

  const handleGenerate = React.useCallback(() => {
    const generated = generateStrongPassword();
    onChange('password', generated);
    // Reveal the generated password so the user can read / copy it.
    setReveal(true);
  }, [onChange]);

  /**
   * Keep the stored value as E.164 while typing. Digits without a `+` are
   * parsed against the selected country; an explicit `+…` is kept as-is so
   * any international number works. libphonenumber returns its best-effort
   * E.164 even for partial input, which keeps the schema honest after blur.
   */
  const handlePhoneChange = React.useCallback(
    (raw: string) => {
      const ascii = toAsciiDigits(raw);
      const cleaned = ascii.replace(/[^\d+]/g, '');
      if (!cleaned) {
        onChange('phoneNumber', '');
        return;
      }
      try {
        const parsed = cleaned.startsWith('+')
          ? parsePhoneNumber(cleaned)
          : parsePhoneNumber(cleaned, country);
        onChange('phoneNumber', (parsed?.number ?? cleaned).slice(0, 16));
      } catch {
        onChange('phoneNumber', cleaned.slice(0, 16));
      }
    },
    [country, onChange],
  );

  /** Switch country: keep the typed digits, rebuild the E.164 prefix. */
  const handleCountryChange = React.useCallback(
    (code: CountryCode) => {
      setCountry(code);
      const ascii = toAsciiDigits(values.phoneNumber);
      let national = ascii.replace(/[^\d]/g, '');
      if (values.phoneNumber.startsWith('+')) {
        try {
          const parsed = parsePhoneNumber(values.phoneNumber);
          national = parsed ? parsed.nationalNumber : national;
        } catch {
          // keep raw digits
        }
      }
      onChange('phoneNumber', national ? `${DIAL_BY_COUNTRY[code]}${national}` : '');
    },
    [onChange, values.phoneNumber],
  );

  // Display only: format per-country (070 123 4567, 912 345 6789, …).
  const phoneDisplay = React.useMemo(() => {
    const v = values.phoneNumber;
    if (!v) return '';
    try {
      const parsed = parsePhoneNumber(v, country);
      if (!parsed) return v;
      return parsed.formatNational();
    } catch {
      return v;
    }
  }, [country, values.phoneNumber]);

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
            <>
              <button
                type="button"
                onClick={handleGenerate}
                className="setup-field__action setup-field__action--generate"
                aria-label="تولید رمز قوی"
                title="تولید رمز قوی"
              >
                <WandGlyph />
              </button>
              <button
                type="button"
                onClick={() => setReveal((r) => !r)}
                className="setup-field__action"
                aria-label={reveal ? 'پنهان‌کردن رمز عبور' : 'نمایش رمز عبور'}
                aria-pressed={reveal}
              >
                {reveal ? <EyeOffGlyph /> : <EyeGlyph />}
              </button>
            </>
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
        wrapperClassName="setup-field--country"
        error={errors.phoneNumber ?? null}
        help="پیش‌شماره کشور را انتخاب و شماره را وارد کنید — شماره مجازی پذیرفته نمی‌شود"
        leading={
          <span className="setup-field__leading setup-field__leading--country">
            <select
              className="setup-field__country"
              value={country}
              onChange={(e) => handleCountryChange(e.target.value as CountryCode)}
              aria-label="پیش‌شماره کشور"
              title={COUNTRY_OPTIONS.find((c) => c.code === country)?.name}
            >
              {COUNTRY_OPTIONS.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.dial}
                </option>
              ))}
            </select>
            <ChevronDownGlyph className="setup-field__country-caret" />
          </span>
        }
      />
    </div>
  );
}
