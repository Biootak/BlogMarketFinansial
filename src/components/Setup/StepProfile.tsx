'use client';

import type { SetupFormValues } from '@/lib/setup/schema';
import * as React from 'react';
import { Field, TextAreaField } from './Field';
import { BadgeGlyph, BuildingGlyph, QuoteGlyph } from './WizardIcons';

export interface StepProfileProps {
  values: Pick<SetupFormValues, 'jobName' | 'company' | 'bio'>;
  errors: Partial<Record<keyof SetupFormValues, string>>;
  onChange: <K extends keyof SetupFormValues>(key: K, value: string) => void;
  onBlur: <K extends keyof SetupFormValues>(key: K) => void;
}

export function StepProfile({ values, errors, onChange, onBlur }: StepProfileProps) {
  return (
    <div className="setup-step-grid">
      <div className="setup-step-grid__pair">
        <Field
          id="jobName"
          name="jobName"
          label="عنوان شغلی"
          autoComplete="organization-title"
          value={values.jobName}
          onChange={(v) => onChange('jobName', v)}
          onBlur={() => onBlur('jobName')}
          maxLength={80}
          required
          dir="rtl"
          autoFocus
          error={errors.jobName ?? null}
          help="مثال: مدیرعامل، سردبیر، تحلیل‌گر ارشد"
          leading={
            <span className="setup-field__ico">
              <BadgeGlyph />
            </span>
          }
        />
        <Field
          id="company"
          name="company"
          label="نام شرکت"
          autoComplete="organization"
          value={values.company}
          onChange={(v) => onChange('company', v)}
          onBlur={() => onBlur('company')}
          maxLength={120}
          required
          dir="rtl"
          error={errors.company ?? null}
          help="نام رسمی که در گزارش‌های برند استفاده می‌شود"
          leading={
            <span className="setup-field__ico">
              <BuildingGlyph />
            </span>
          }
        />
      </div>

      <TextAreaField
        id="bio"
        name="bio"
        label="بیوگرافی"
        value={values.bio}
        onChange={(v) => onChange('bio', v)}
        onBlur={() => onBlur('bio')}
        rows={4}
        required
        maxLength={600}
        dir="rtl"
        showCounter
        error={errors.bio ?? null}
        help="چند جمله درباره‌ی نقش شما و تمرکز اصلی این نشریه"
        leading={
          <span className="setup-field__ico setup-field__ico--top">
            <QuoteGlyph />
          </span>
        }
      />
    </div>
  );
}
