/**
 * Motion Primitives (CSS-driven, framer-motion-free)
 *
 * Replacement for the previous framer-motion-based primitives. Each export
 * is now a CSS class string (or class composition helper) instead of a
 * framer-motion `Variants` / `Transition` object. This removes the ~50 KiB
 * framer-motion runtime from the main bundle while preserving the same
 * visual behavior.
 *
 * - Centralized so we can tune timings in one place.
 * - Respects `prefers-reduced-motion` automatically via the global CSS rule
 *   in `globals.css` (sets animation-duration to 0.01ms).
 * - SSR-friendly — these are plain strings, no runtime needed.
 *
 * Keyframes & utility classes live in `src/app/globals.css` (search for
 * "Motion Primitives"). Easing curve is `cubic-bezier(0.22, 1, 0.36, 1)`,
 * the same stripe.com-inspired curve the previous implementation used.
 */

/* -------------------------------------------------------------------------- */
/*  Easing constants — kept as named exports for any code that still wants    */
/*  to reference them, but consumers should prefer the class strings below.   */
/* -------------------------------------------------------------------------- */

/** Stripe.com-style ease — cubic-bezier(0.22, 1, 0.36, 1). */
export const STRIPE_EASE = [0.22, 1, 0.36, 1] as const;

/** Slightly snappier variant for tactile UI. */
export const STRIPE_EASE_SOFT = [0.16, 1, 0.3, 1] as const;

/** Legacy spring config — kept for type compatibility; consumers can ignore. */
export const LINEAR_SPRING = { type: 'spring', stiffness: 500, damping: 35, mass: 0.8 } as const;
export const SOFT_SPRING = { type: 'spring', stiffness: 260, damping: 26, mass: 0.9 } as const;
export const QUICK_TWEEN = { duration: 0.18, ease: STRIPE_EASE_SOFT } as const;
export const DEFAULT_TWEEN = { duration: 0.24, ease: STRIPE_EASE } as const;

/* -------------------------------------------------------------------------- */
/*  Class strings (the actual replacement for framer-motion `Variants`)       */
/* -------------------------------------------------------------------------- */

/** Fade in + slight slide up — for cards, list items, section entrance. */
export const fadeInUp = 'anim-fade-in-up';

/** Fade in only — for cross-fade transitions. */
export const fadeIn = 'anim-fade-in';

/** Dropdown panel reveal — top-down, scale + fade. */
export const dropdownPanel = 'anim-fade-in-down';

/** Out animation for dropdowns. */
export const dropdownPanelExit = 'anim-fade-out-up';

/** Accordion panel for mobile menus (height auto). */
export const accordionPanel = 'anim-accordion-in';

/** Out animation for accordions. */
export const accordionPanelExit = 'anim-accordion-out';

/** Container variants for staggered children reveals. */
export const staggerContainer = 'stagger-children';

/** Item variants for staggered children reveals. */
export const staggerItem = '';

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Legacy helper — was used to read `prefers-reduced-motion` at runtime.
 * Now a no-op since the global CSS `@media (prefers-reduced-motion: reduce)`
 * rule in `globals.css` already clamps every animation to 0.01ms. Kept as
 * an export for backwards compatibility with the previous API.
 */
export function reducedMotionSafe<T>(base: T, _reduced?: T): T {
  return base;
}

/**
 * Hover/tap micro-interactions for nav items.
 * Returns a Tailwind class fragment that can be spread into a className.
 * In the framer-motion era this returned `whileHover` / `whileTap` config.
 * In the CSS-driven era, hover/tap is handled by Tailwind's `hover:` /
 * `active:` modifiers (see consumer files for the equivalent).
 */
export const navItemInteractions = {
  hover: 'hover:-translate-y-px',
  tap: 'active:scale-[0.97]',
  transition: 'transition-transform duration-[180ms] ease-[cubic-bezier(0.16,1,0.3,1)]',
} as const;
