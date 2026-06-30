/**
 * design-tokens.ts
 *
 * Single source of truth for typography and spacing across the project.
 * Every page, component and form should import class fragments from here
 * instead of writing raw Tailwind classes. This makes a redesign a
 * one-file change rather than a 200-file change.
 *
 * Scales follow the Linear × Vercel × Stripe feel:
 *  - tight, refined type ramp (no 56px hero text on a blog card)
 *  - 4px base unit, but only specific steps reach components
 *  - responsive variants are pre-baked (mobile / sm / lg)
 *
 * 2026-06-14: initial cut. Adopting these tokens is a multi-file
 * migration; new code MUST use them, legacy code is updated
 * opportunistically.
 */
import { cn } from './utils';

// ============================================================================
// TYPOGRAPHY
// ============================================================================

/**
 * Headings — pre-baked responsive scales.
 * Use as: <h1 className={heading.h1}>...</h1>
 *
 * The h1 is reserved for true page titles (one per page).
 * Cards should use headingCard.
 */
export const heading = {
  // Page title — used in DashboardPageHeader, hero sections, single post.
  h1: 'text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50',
  // Section title — used in SectionMagazine*, SectionLargeSlider etc.
  h2: 'text-lg sm:text-xl lg:text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50',
  // Sub-section / card group title.
  h3: 'text-base sm:text-lg lg:text-xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50',
  // Card title (post list, magazine cards).
  h4: 'text-sm sm:text-base font-semibold tracking-tight text-neutral-900 dark:text-neutral-100',
  // Eyebrow / overline — uppercase, tight tracking.
  h5: 'text-xs sm:text-sm font-semibold uppercase tracking-[0.08em] text-neutral-500 dark:text-neutral-400',
  // Strong inline label.
  h6: 'text-xs font-semibold tracking-tight text-neutral-900 dark:text-neutral-100',
} as const;

/**
 * Body text — pre-baked semantic names. Each variant picks the closest
 * type ramp step and the matching text color.
 */
export const text = {
  // Default body, 14px.
  body: 'text-base leading-relaxed text-neutral-700 dark:text-neutral-300',
  // Slightly smaller secondary.
  bodySm: 'text-sm leading-relaxed text-neutral-600 dark:text-neutral-400',
  // Muted meta (timestamps, counts).
  meta: 'text-xs leading-normal text-neutral-500 dark:text-neutral-400',
  // Lead paragraph.
  lead: 'text-base sm:text-lg leading-relaxed text-neutral-700 dark:text-neutral-300',
  // Inline link.
  link: 'text-primary-600 dark:text-primary-400 hover:underline underline-offset-2',
  // Code / monospace.
  code: 'font-mono text-xs text-neutral-800 dark:text-neutral-200',
  // Number (tabular).
  num: 'tabular-nums text-xs font-medium text-neutral-900 dark:text-neutral-100',
} as const;

/**
 * Form labels and helper text — used by FormField wrappers everywhere.
 */
export const form = {
  label: 'text-sm font-medium text-neutral-700 dark:text-neutral-300',
  helper: 'text-xs text-neutral-500 dark:text-neutral-400 mt-1.5',
  error: 'text-xs font-medium text-rose-600 dark:text-rose-400 mt-1.5',
  required: "after:content-['*'] after:ms-1 after:text-rose-500",
  // Standard heights — keep all inputs aligned.
  inputHeight: 'h-10 sm:h-11',
  // The space-y used between FormField siblings.
  fieldGap: 'space-y-5',
  // Section spacing inside a dialog / form.
  sectionGap: 'space-y-6',
} as const;

/**
 * Table cells — used by DashboardTable.
 */
export const table = {
  headerCell:
    'px-5 py-3 text-start text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-300',
  cell: 'px-5 py-4 text-sm text-neutral-700 dark:text-neutral-300',
  cellMuted: 'px-5 py-4 text-sm text-neutral-500 dark:text-neutral-400',
  row: 'group transition-colors hover:bg-neutral-50/60 dark:hover:bg-neutral-800/40',
} as const;

// ============================================================================
// SPACING
// ============================================================================

/**
 * Vertical rhythm between major page sections.
 * `space-y-section` applies a consistent top margin between sections,
 * `space-y-stack` is the gap between items in a stack (lists, cards).
 */
export const space = {
  // Between sections of a page.
  section: 'space-y-12 sm:space-y-16 lg:space-y-20',
  // Between cards in a grid.
  stackLg: 'space-y-6 sm:space-y-8',
  // Between list items.
  stackMd: 'space-y-3 sm:space-y-4',
  // Tight inline list.
  stackSm: 'space-y-1.5',
  // Horizontal flex gap — small.
  gapXs: 'gap-1.5 sm:gap-2',
  gapSm: 'gap-2 sm:gap-3',
  gapMd: 'gap-3 sm:gap-4',
  gapLg: 'gap-4 sm:gap-6',
} as const;

/**
 * Page-level padding around the main content. Used on the public site
 * and dashboard alike so spacing feels consistent across contexts.
 */
export const pagePad = {
  // Public marketing pages.
  marketing: 'px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-20',
  // Dashboard pages.
  dashboard: 'p-4 sm:p-6 lg:p-8',
  // Single post / article reader.
  reader: 'px-4 py-8 sm:px-6 sm:py-10 lg:px-0 lg:py-14',
} as const;

/**
 * Card surface padding — used in every Card* / PostItem / widget.
 */
export const cardPad = {
  // Compact list / sidebar.
  compact: 'p-3 sm:p-4',
  // Standard card.
  default: 'p-4 sm:p-5',
  // Feature / hero card.
  feature: 'p-5 sm:p-6',
  // Hero in modal or large dashboard widget.
  hero: 'p-6 sm:p-8',
} as const;

// ============================================================================
// RADIUS / SHAPE
// ============================================================================

/**
 * Border-radius scale — picked from the 5 most-used sizes in the project.
 * Anything else should pick one of these.
 */
export const radius = {
  // Pills, chips, badges.
  pill: 'rounded-full',
  // Buttons, inputs.
  sm: 'rounded-lg',
  // Standard card.
  md: 'rounded-xl',
  // Feature card, modal.
  lg: 'rounded-2xl',
  // Hero, large surfaces.
  xl: 'rounded-3xl',
} as const;

// ============================================================================
// COMPOSITE PATTERNS
// ============================================================================

/**
 * Standard "card" surface. Use this for every elevated card so the
 * shadow / border / background all match across the project.
 */
export const surfaceCard = cn(
  'bg-white/70 dark:bg-neutral-900/70',
  'border border-neutral-200/60 dark:border-neutral-800/60',
  'backdrop-blur-sm',
  'shadow-sm shadow-neutral-900/[0.04] dark:shadow-neutral-950/40',
  'transition-all duration-200',
  radius.md,
);

/**
 * Section heading block — eyebrow + title + optional description.
 * Used in every home section so visual rhythm is identical.
 */
export const sectionHeading = {
  wrapper: 'flex flex-col gap-1.5 sm:gap-2',
  eyebrow: heading.h5,
  title: heading.h2,
  description: 'text-sm sm:text-base text-neutral-500 dark:text-neutral-400 max-w-2xl',
} as const;

/**
 * Small button group / chip row used in filters and tag lists.
 */
export const chipRow = cn('flex flex-wrap items-center gap-1.5 sm:gap-2');
