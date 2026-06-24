'use client';

import { toPersianDigits } from '@/lib/setup/format';
import { type StrengthResult, evaluatePassword } from '@/lib/setup/strength';
import * as React from 'react';

/**
 * PasswordStrength — 4-segment entropy meter.
 *
 * - Segments fill in lock-step with the score (0–4)
 * - Tone shifts drive the meter colour via CSS data attributes
 * - The bit-count and label below are read by screen readers via
 *   `aria-live="polite"` so users hear feedback as they type
 *
 * No animations beyond CSS transitions on the segment widths.
 */

export interface PasswordStrengthProps {
  password: string;
  /** Minimal class hooks for the surrounding container. */
  className?: string;
  /** Hide the descriptive subtitle (used when space is tight). */
  compact?: boolean;
}

export function PasswordStrength({ password, className, compact = false }: PasswordStrengthProps) {
  const result: StrengthResult = React.useMemo(() => evaluatePassword(password), [password]);
  const tone = result.tone;

  return (
    <div
      className={['setup-strength', className].filter(Boolean).join(' ')}
      data-tone={tone}
      aria-live="polite"
      aria-atomic="true"
    >
      <div
        className="setup-strength__bar"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={4}
        aria-valuenow={result.score}
        aria-label="قدرت رمز عبور"
      >
        {[0, 1, 2, 3].map((segment) => (
          <span
            key={segment}
            className="setup-strength__seg"
            data-on={segment < result.score ? 'true' : 'false'}
          />
        ))}
      </div>

      <div className="setup-strength__caption">
        <span className="setup-strength__label">{result.label}</span>
        {!compact && password ? (
          <span className="setup-strength__desc">— {result.description}</span>
        ) : null}
        {password ? (
          <span className="setup-strength__bits" aria-hidden="true">
            {toPersianDigits(result.bits)} بیت آنتروپی
          </span>
        ) : null}
      </div>
    </div>
  );
}
