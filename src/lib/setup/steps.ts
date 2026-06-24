import type { StepId } from './schema';

/**
 * Wizard step definitions — the UI iterates this single array to render the
 * stepper, breadcrumbs, and to map each step to its fields (see
 * `STEP_FIELDS` in `./schema`). Add or reorder steps here only.
 */
export interface StepDef {
  id: StepId;
  index: number;
  title: string;
  subtitle: string;
  glyph: string; // SVG path id from /_components/icons/sprite
}

export const STEPS: ReadonlyArray<StepDef> = [
  {
    id: 'identity',
    index: 1,
    title: 'هویت',
    subtitle: 'نام و ایمیل مدیر اصلی',
    glyph: 'user',
  },
  {
    id: 'credentials',
    index: 2,
    title: 'دسترسی',
    subtitle: 'رمز عبور و شماره تماس',
    glyph: 'shield',
  },
  {
    id: 'profile',
    index: 3,
    title: 'پروفایل',
    subtitle: 'نقش، شرکت و بیوگرافی',
    glyph: 'sparkles',
  },
  {
    id: 'review',
    index: 4,
    title: 'بازبینی',
    subtitle: 'تأیید و ایجاد حساب',
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
