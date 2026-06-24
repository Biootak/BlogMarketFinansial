'use client';

import type { SetupFormValues } from '@/lib/setup/schema';
import * as React from 'react';
import { Field } from './Field';
import { MailGlyph, UserGlyph } from './WizardIcons';

export interface StepIdentityProps {
  values: Pick<SetupFormValues, 'name' | 'email'>;
  errors: Partial<Record<keyof SetupFormValues, string>>;
  onChange: <K extends keyof SetupFormValues>(key: K, value: string) => void;
  onBlur: <K extends keyof SetupFormValues>(key: K) => void;
}

export function StepIdentity({ values, errors, onChange, onBlur }: StepIdentityProps) {
  return (
    <div className="setup-step-grid">
      <Field
        id="name"
        name="name"
        label="نام و نام خانوادگی"
        value={values.name}
        onChange={(v) => onChange('name', v)}
        onBlur={() => onBlur('name')}
        autoComplete="name"
        maxLength={80}
        required
        dir="rtl"
        autoFocus
        error={errors.name ?? null}
        help="نامی که در گزارش‌ها و ایمیل‌ها نمایش داده می‌شود."
        leading={
          <span className="setup-field__ico">
            <UserGlyph />
          </span>
        }
      />
      <Field
        id="email"
        name="email"
        label="ایمیل"
        type="email"
        inputMode="email"
        autoComplete="email"
        value={values.email}
        onChange={(v) => onChange('email', v.trim())}
        onBlur={() => onBlur('email')}
        maxLength={254}
        required
        dir="ltr"
        error={errors.email ?? null}
        help="برای بازیابی رمز عبور و ورود استفاده می‌شود."
        leading={
          <span className="setup-field__ico">
            <MailGlyph />
          </span>
        }
      />
    </div>
  );
}
