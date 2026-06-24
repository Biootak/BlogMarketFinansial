'use client';

import { maskEmail, maskPhone } from '@/lib/setup/format';
import type { SetupFormValues } from '@/lib/setup/schema';
import { evaluatePassword } from '@/lib/setup/strength';
import * as React from 'react';
import { BadgeGlyph, CheckGlyph, MailGlyph, PhoneGlyph } from './WizardIcons';

export interface StepReviewProps {
  values: SetupFormValues;
  onEditStep: (step: 'identity' | 'credentials' | 'profile') => void;
}

interface ReviewRow {
  label: string;
  value: string;
  step: 'identity' | 'credentials' | 'profile';
  mask?: (v: string) => string;
  glyph: React.ReactNode;
  /** When true, render the value in a multi-line block. */
  multiline?: boolean;
}

export function StepReview({ values, onEditStep }: StepReviewProps) {
  const strength = React.useMemo(() => evaluatePassword(values.password), [values.password]);

  const rows: ReviewRow[] = [
    {
      label: 'نام',
      value: values.name,
      step: 'identity',
      glyph: <BadgeGlyph />,
    },
    {
      label: 'ایمیل',
      value: maskEmail(values.email),
      step: 'identity',
      mask: (v) => v,
      glyph: <MailGlyph />,
    },
    {
      label: 'شماره تماس',
      value: maskPhone(values.phoneNumber),
      step: 'credentials',
      glyph: <PhoneGlyph />,
    },
    {
      label: 'عنوان شغلی',
      value: values.jobName,
      step: 'profile',
      glyph: <BadgeGlyph />,
    },
    {
      label: 'نام شرکت',
      value: values.company,
      step: 'profile',
      glyph: <BadgeGlyph />,
    },
    {
      label: 'بیوگرافی',
      value: values.bio,
      step: 'profile',
      multiline: true,
      glyph: <BadgeGlyph />,
    },
  ];

  return (
    <div className="setup-review">
      <div
        className="setup-review__strength"
        data-tone={strength.tone}
        aria-label="قدرت نهایی رمز عبور"
      >
        <CheckGlyph className="setup-review__strength-glyph" />
        <div className="setup-review__strength-copy">
          <span className="setup-review__strength-label">
            رمز عبور {strength.label.toLowerCase()} انتخاب شد
          </span>
          <span className="setup-review__strength-meta">
            {strength.bits} بیت آنتروپی — الگوریتم bcrypt با ضریب ۱۲
          </span>
        </div>
      </div>

      <ul className="setup-review__list">
        {rows.map((row) => (
          <li key={row.label} className="setup-review__item">
            <span className="setup-review__glyph" aria-hidden="true">
              {row.glyph}
            </span>
            <div className="setup-review__body">
              <span className="setup-review__label">{row.label}</span>
              <span
                className={
                  row.multiline
                    ? 'setup-review__value setup-review__value--block'
                    : 'setup-review__value'
                }
              >
                {row.value}
              </span>
            </div>
            <button
              type="button"
              onClick={() => onEditStep(row.step)}
              className="setup-review__edit"
              aria-label={`ویرایش ${row.label}`}
            >
              ویرایش
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
