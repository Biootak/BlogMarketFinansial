'use client';

import type { StepDef } from '@/lib/setup/steps';
import { STEP_GLYPHS } from './WizardIcons';

/**
 * StepHeader — compact contextual header rendered above each step's form.
 *
 * Sits below the wizard's global title and above the form fields. Shows:
 *   - The step's eyebrow badge (مرحله ۲ · ۹۰ ثانیه)
 *   - The step's title (e.g. "دسترسی")
 *   - The step's one-sentence summary
 *
 * Kept separate from SetupWizard so it can animate independently when the
 * step key changes (already wrapped in a `key`-driven re-render there).
 */

export interface StepHeaderProps {
  step: StepDef;
  /** Progress 0–1 — used for a tiny inline bar so the user knows they're moving. */
  progress: number;
}

export function StepHeader({ step, progress }: StepHeaderProps) {
  const Glyph = STEP_GLYPHS[step.glyph as keyof typeof STEP_GLYPHS];

  return (
    <header className="setup-step-header" aria-labelledby={`step-${step.id}-title`}>
      <div className="setup-step-header__row">
        <span className="setup-step-header__badge" aria-hidden="true">
          <Glyph className="setup-step-header__badge-glyph" />
          <span>{step.eyebrow}</span>
        </span>
        <h2 id={`step-${step.id}-title`} className="setup-step-header__title">
          {step.title}
        </h2>
      </div>
      <p className="setup-step-header__summary">{step.summary}</p>
      <div
        className="setup-step-header__bar"
        role="progressbar"
        tabIndex={0}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
        aria-label="پیشرفت کلی"
      >
        <span
          className="setup-step-header__bar-fill"
          style={{ inlineSize: `${Math.max(0, Math.min(1, progress)) * 100}%` }}
        />
      </div>
    </header>
  );
}
