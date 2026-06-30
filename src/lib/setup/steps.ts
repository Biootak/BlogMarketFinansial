import type { StepId } from './schema';

/**
 * Wizard step definitions — the UI iterates this single array to render the
 * stepper, breadcrumbs, and to map each step to its fields (see
 * `STEP_FIELDS` in `./schema`). Add or reorder steps here only.
 *
 * `intro` is a no-field welcome step. It carries no schema fields and is
 * skipped by `validateStep()`.
 */
export interface StepDef {
  id: StepId;
  index: number;
  title: string;
  /** Short eyebrow shown in the step pill. */
  eyebrow: string;
  /** One-sentence value statement for the step header. */
  summary: string;
  /** Approximate time in seconds to complete the step. Used by the progress bar ETA. */
  etaSeconds: number;
  /** Glyph key into `STEP_GLYPHS` from `WizardIcons`. */
  glyph: string;
}

export const STEPS: ReadonlyArray<StepDef> = [
  {
    id: 'intro',
    index: 0,
    title: 'خوش‌آمدید',
    eyebrow: 'شروع',
    summary: 'پیش از شروع، نگاهی به مراحل بیندازید.',
    etaSeconds: 30,
    glyph: 'sparkles',
  },
  {
    id: 'identity',
    index: 1,
    title: 'هویت',
    eyebrow: 'مرحله ۱',
    summary: 'نام و ایمیلی که به‌عنوان مالک ثبت می‌شود.',
    etaSeconds: 60,
    glyph: 'user',
  },
  {
    id: 'credentials',
    index: 2,
    title: 'دسترسی',
    eyebrow: 'مرحله ۲',
    summary: 'رمز عبور قدرتمند و شماره تماس برای بازیابی.',
    etaSeconds: 90,
    glyph: 'shield',
  },
  {
    id: 'profile',
    index: 3,
    title: 'پروفایل',
    eyebrow: 'مرحله ۳',
    summary: 'نقش، شرکت و معرفی کوتاه برای گزارش‌ها.',
    etaSeconds: 90,
    glyph: 'sparkles',
  },
  {
    id: 'review',
    index: 4,
    title: 'بازبینی',
    eyebrow: 'مرحله ۴',
    summary: 'تأیید نهایی و ایجاد حساب مالک.',
    etaSeconds: 30,
    glyph: 'check',
  },
];

export function nextStep(current: StepId): StepId | null {
  const idx = STEPS.findIndex((s) => s.id === current);
  if (idx === -1 || idx === STEPS.length - 1) return null;
  return STEPS[idx + 1].id;
}

export function previousStep(current: StepId): StepId | null {
  const idx = STEPS.findIndex((s) => s.id === current);
  if (idx <= 0) return null;
  return STEPS[idx - 1].id;
}

export function stepIndex(id: StepId): number {
  return STEPS.findIndex((s) => s.id === id);
}

/** Total estimated time in seconds across all steps. */
export function totalEtaSeconds(): number {
  return STEPS.reduce((acc, step) => acc + step.etaSeconds, 0);
}

/** Remaining estimated time in seconds from the given step. */
export function remainingEtaSeconds(from: StepId): number {
  const idx = stepIndex(from);
  if (idx === -1) return 0;
  return STEPS.slice(idx).reduce((acc, step) => acc + step.etaSeconds, 0);
}
