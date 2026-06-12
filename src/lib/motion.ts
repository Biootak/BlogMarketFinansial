/**
 * Motion Primitives (stripe.com-inspired)
 *
 * Reusable animation variants, transitions, and helpers built on top of
 * framer-motion. Inspired by the smooth, snappy motion language used on
 * stripe.com and linear.app.
 *
 * - Centralized so we can tweak timings in one place.
 * - Respects `prefers-reduced-motion` automatically via `useReducedMotion`.
 * - Optimized for SSR — components that import this stay small.
 */

import type { Transition, Variants } from 'framer-motion';

/* -------------------------------------------------------------------------- */
/*  Curves & Durations                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Stripe.com uses a custom ease that feels both natural and snappy.
 * This is a cubic-bezier approximation of that curve.
 */
export const STRIPE_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/** Slightly bouncier variant for tactile UI elements (buttons, hovers). */
export const STRIPE_EASE_SOFT: [number, number, number, number] = [0.16, 1, 0.3, 1];

/** Linear.app uses similar curves with a touch of spring physics. */
export const LINEAR_SPRING: Transition = {
  type: 'spring',
  stiffness: 500,
  damping: 35,
  mass: 0.8,
};

/** Soft spring for larger panels / dropdowns. */
export const SOFT_SPRING: Transition = {
  type: 'spring',
  stiffness: 260,
  damping: 26,
  mass: 0.9,
};

/** Quick tween for micro-interactions (icons, dots). */
export const QUICK_TWEEN: Transition = {
  duration: 0.18,
  ease: STRIPE_EASE_SOFT,
};

/** Standard tween for menus / dropdowns. */
export const DEFAULT_TWEEN: Transition = {
  duration: 0.24,
  ease: STRIPE_EASE,
};

/* -------------------------------------------------------------------------- */
/*  Variants                                                                  */
/* -------------------------------------------------------------------------- */

/** Fade in + slight slide up. Use for cards, list items. */
export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.32, ease: STRIPE_EASE } },
  exit: { opacity: 0, y: 4, transition: { duration: 0.18, ease: STRIPE_EASE } },
};

/** Fade in only. */
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.24, ease: STRIPE_EASE } },
  exit: { opacity: 0, transition: { duration: 0.16, ease: STRIPE_EASE } },
};

/**
 * Dropdown panel reveal — like stripe.com's product menus.
 * Origin top → bottom, scale from 0.96, opacity 0 → 1.
 */
export const dropdownPanel: Variants = {
  hidden: { opacity: 0, y: -6, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.22, ease: STRIPE_EASE_SOFT },
  },
  exit: {
    opacity: 0,
    y: -4,
    scale: 0.98,
    transition: { duration: 0.16, ease: STRIPE_EASE },
  },
};

/**
 * Accordion panel for mobile menus.
 */
export const accordionPanel: Variants = {
  hidden: { height: 0, opacity: 0 },
  visible: {
    height: 'auto',
    opacity: 1,
    transition: { duration: 0.28, ease: STRIPE_EASE },
  },
  exit: {
    height: 0,
    opacity: 0,
    transition: { duration: 0.2, ease: STRIPE_EASE },
  },
};

/**
 * Container variants for staggered children reveals.
 * Use with `staggerItem` on each child.
 */
export const staggerContainer: Variants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.02,
    },
  },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.22, ease: STRIPE_EASE } },
};

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Returns a `transition` object that respects the user's reduced-motion
 * preference. Components that consume this should still be valid React
 * server-component-friendly when used with framer-motion's motion proxies.
 *
 * @example
 *   const t = reducedMotionSafe(DEFAULT_TWEEN);
 *   <motion.div transition={t} />
 */
export function reducedMotionSafe(
  base: Transition | undefined,
  reduced: Transition = { duration: 0 },
): Transition {
  // We cannot read `prefers-reduced-motion` on the server, so this helper
  // is intended to be called inside a client component after mount.
  if (typeof window === 'undefined') return base ?? { duration: 0.2 };
  const prefersReducedMotion = window.matchMedia?.(
    '(prefers-reduced-motion: reduce)',
  ).matches;
  return prefersReducedMotion ? reduced : (base ?? { duration: 0.2 });
}

/**
 * Hover/tap micro-interactions for nav items.
 * Returns a `whileHover` / `whileTap` config for framer-motion.
 */
export const navItemInteractions = {
  whileHover: { y: -1 },
  whileTap: { scale: 0.97 },
  transition: QUICK_TWEEN,
} as const;
