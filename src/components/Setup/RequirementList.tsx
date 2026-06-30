'use client';

import { toPersianDigits } from '@/lib/setup/format';
import * as React from 'react';
import { CheckGlyph } from './WizardIcons';

/**
 * RequirementList — visible password-requirement checklist.
 *
 * Each rule is a single row with a state-driven tick. The list lives next to
 * the password field so the user never has to guess why their password is
 * being rejected.
 *
 * `requirements` is a pure function over the password string. We deliberately
 * avoid duplicating regexes from `schema.ts` — the schema is the source of
 * truth and these are wrappers that share the same regex via `testPassword`.
 */

export type PasswordPredicate = (password: string) => boolean;

export interface Requirement {
  id: string;
  label: string;
  test: PasswordPredicate;
  hint?: string;
}

const PRED_HAS_LOWER: PasswordPredicate = (p) => /[a-z]/.test(p);
const PRED_HAS_UPPER: PasswordPredicate = (p) => /[A-Z]/.test(p);
const PRED_HAS_DIGIT: PasswordPredicate = (p) => /[0-9]/.test(p);
const PRED_HAS_SPECIAL: PasswordPredicate = (p) => /[^A-Za-z0-9]/.test(p);
const PRED_MIN_LENGTH: PasswordPredicate = (p) => p.length >= 12;

export const DEFAULT_REQUIREMENTS: ReadonlyArray<Requirement> = [
  { id: 'length', label: 'حداقل ۱۲ کاراکتر', test: PRED_MIN_LENGTH },
  { id: 'lower', label: 'شامل حروف کوچک (a-z)', test: PRED_HAS_LOWER },
  { id: 'upper', label: 'شامل حروف بزرگ (A-Z)', test: PRED_HAS_UPPER },
  { id: 'digit', label: 'شامل عدد (۰-۹)', test: PRED_HAS_DIGIT },
  { id: 'special', label: 'شامل کاراکتر خاص (!@#…)', test: PRED_HAS_SPECIAL },
];

export interface RequirementListProps {
  password: string;
  requirements?: ReadonlyArray<Requirement>;
  /** Hide the list while the password field is empty (default: true). */
  hideWhenEmpty?: boolean;
}

export function RequirementList({
  password,
  requirements = DEFAULT_REQUIREMENTS,
  hideWhenEmpty = true,
}: RequirementListProps) {
  const isEmpty = password.length === 0;
  if (hideWhenEmpty && isEmpty) return null;

  const passed = requirements.filter((req) => req.test(password)).length;
  const total = requirements.length;
  const allPass = passed === total;

  return (
    <section
      className="setup-req"
      aria-label="نیازمندی‌های رمز عبور"
      data-all-pass={allPass ? 'true' : 'false'}
    >
      <header className="setup-req__head">
        <span className="setup-req__eyebrow">نیازمندی‌های رمز عبور</span>
        <span className="setup-req__counter" aria-live="polite">
          <strong>{toPersianDigits(passed)}</strong>
          <span className="setup-req__counter-sep"> / </span>
          <span>{toPersianDigits(total)}</span>
        </span>
      </header>
      <ul className="setup-req__list">
        {requirements.map((req) => {
          const ok = req.test(password);
          return (
            <li
              key={req.id}
              className="setup-req__item"
              data-passed={ok ? 'true' : 'false'}
              aria-live="polite"
            >
              <span className="setup-req__indicator" aria-hidden="true">
                <CheckGlyph className="setup-req__check" />
              </span>
              <span className="setup-req__label">{req.label}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
