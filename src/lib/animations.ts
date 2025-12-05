/**
 * Unified animation configurations for consistent animations across the project
 * Using Framer Motion
 */

import type { Transition, Variants } from 'framer-motion';

// ============================================
// EASING FUNCTIONS
// ============================================
export const easings = {
  // Smooth and natural easing
  smooth: [0.22, 1, 0.36, 1] as const,
  // Quick and snappy
  snappy: [0.4, 0, 0.2, 1] as const,
  // Bouncy effect
  bouncy: [0.68, -0.55, 0.265, 1.55] as const,
  // Linear
  linear: [0, 0, 1, 1] as const,
  // Ease in out
  easeInOut: [0.4, 0, 0.2, 1] as const,
};

// ============================================
// DURATIONS (in seconds)
// ============================================
export const durations = {
  instant: 0.1,
  fast: 0.2,
  normal: 0.3,
  slow: 0.5,
  slower: 0.7,
};

// ============================================
// TRANSITIONS
// ============================================
export const transitions = {
  // Default smooth transition
  smooth: {
    duration: durations.normal,
    ease: easings.smooth,
  } as Transition,

  // Fast and snappy
  snappy: {
    duration: durations.fast,
    ease: easings.snappy,
  } as Transition,

  // Bouncy effect
  bouncy: {
    duration: durations.normal,
    ease: easings.bouncy,
  } as Transition,

  // Spring physics
  spring: {
    type: 'spring',
    stiffness: 300,
    damping: 25,
  } as Transition,

  // Gentle spring
  springGentle: {
    type: 'spring',
    stiffness: 200,
    damping: 20,
  } as Transition,
};

// ============================================
// FADE ANIMATIONS
// ============================================
export const fadeVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: transitions.smooth,
  },
  exit: { 
    opacity: 0,
    transition: transitions.fast,
  },
};

export const fadeUpVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: transitions.smooth,
  },
  exit: { 
    opacity: 0, 
    y: -20,
    transition: transitions.fast,
  },
};

export const fadeDownVariants: Variants = {
  hidden: { opacity: 0, y: -20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: transitions.smooth,
  },
  exit: { 
    opacity: 0, 
    y: 20,
    transition: transitions.fast,
  },
};

// ============================================
// SCALE ANIMATIONS
// ============================================
export const scaleVariants: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: transitions.smooth,
  },
  exit: { 
    opacity: 0, 
    scale: 0.9,
    transition: transitions.fast,
  },
};

export const scaleBounceVariants: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: transitions.bouncy,
  },
  exit: { 
    opacity: 0, 
    scale: 0.8,
    transition: transitions.fast,
  },
};

// ============================================
// SLIDE ANIMATIONS
// ============================================
export const slideRightVariants: Variants = {
  hidden: { opacity: 0, x: -30 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: transitions.smooth,
  },
  exit: { 
    opacity: 0, 
    x: 30,
    transition: transitions.fast,
  },
};

export const slideLeftVariants: Variants = {
  hidden: { opacity: 0, x: 30 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: transitions.smooth,
  },
  exit: { 
    opacity: 0, 
    x: -30,
    transition: transitions.fast,
  },
};

// ============================================
// STAGGER ANIMATIONS
// ============================================
export const staggerContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

export const staggerItemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: transitions.smooth,
  },
};

// ============================================
// HOVER & TAP ANIMATIONS
// ============================================
export const hoverScale = {
  scale: 1.05,
  transition: transitions.snappy,
};

export const hoverScaleSmall = {
  scale: 1.02,
  transition: transitions.snappy,
};

export const tapScale = {
  scale: 0.95,
  transition: transitions.fast,
};

export const tapScaleSmall = {
  scale: 0.98,
  transition: transitions.fast,
};

// ============================================
// ROTATION ANIMATIONS
// ============================================
export const rotateVariants: Variants = {
  initial: { rotate: 0 },
  animate: { 
    rotate: 360,
    transition: {
      duration: 1,
      ease: 'linear',
      repeat: Number.POSITIVE_INFINITY,
    },
  },
};

// ============================================
// PULSE ANIMATIONS
// ============================================
export const pulseVariants: Variants = {
  initial: { scale: 1 },
  animate: { 
    scale: [1, 1.05, 1],
    transition: {
      duration: 2,
      ease: easings.smooth,
      repeat: Number.POSITIVE_INFINITY,
    },
  },
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Create a stagger container with custom delay
 */
export const createStaggerContainer = (staggerDelay = 0.1, delayChildren = 0.1): Variants => ({
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: staggerDelay,
      delayChildren,
    },
  },
});

/**
 * Create a custom fade up animation with custom distance
 */
export const createFadeUp = (distance = 20): Variants => ({
  hidden: { opacity: 0, y: distance },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: transitions.smooth,
  },
});

/**
 * Create a custom scale animation
 */
export const createScale = (from = 0.9, to = 1): Variants => ({
  hidden: { opacity: 0, scale: from },
  visible: { 
    opacity: 1, 
    scale: to,
    transition: transitions.smooth,
  },
});
