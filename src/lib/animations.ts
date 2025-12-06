/**
 * Unified animation configurations for consistent animations across the project
 * Using Framer Motion for complex animations only
 * 
 * IMPORTANT: For simple animations, prefer CSS transitions and Tailwind utilities:
 * - Hover effects: Use `hover:scale-105`, `hover:-translate-y-1`, etc.
 * - Fade in/out: Use `opacity-0`, `opacity-100` with `transition-opacity`
 * - Scale: Use `scale-95`, `scale-105` with `transition-transform`
 * - Translate: Use `translate-x-*`, `translate-y-*` with `transition-transform`
 * - Combined: Use `transition-all duration-300`
 * 
 * Only use Framer Motion for:
 * - Complex sequences with multiple steps
 * - Stagger animations (children animating in sequence)
 * - Spring physics animations
 * - AnimatePresence (mount/unmount animations)
 * - Gesture-based animations (drag, swipe)
 */

import type { Transition, Variants } from 'framer-motion';

// ============================================
// TRANSITIONS - For Complex Animations Only
// ============================================
export const transitions = {
  // Spring physics - Use for natural, bouncy animations
  spring: {
    type: 'spring',
    stiffness: 300,
    damping: 25,
  } as Transition,

  // Gentle spring - Use for subtle, smooth animations
  springGentle: {
    type: 'spring',
    stiffness: 200,
    damping: 20,
  } as Transition,

  // Bouncy effect - Use for playful feedback animations
  bouncy: {
    duration: 0.3,
    ease: [0.68, -0.55, 0.265, 1.55],
  } as Transition,

  // Snappy - Use for quick feedback animations
  snappy: {
    duration: 0.2,
    ease: [0.4, 0, 0.2, 1],
  } as Transition,
};

// ============================================
// STAGGER ANIMATIONS - Complex sequences only
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
    transition: transitions.snappy,
  },
};

// ============================================
// TAP ANIMATIONS - For interactive feedback
// ============================================
export const tapScale = {
  scale: 0.95,
  transition: transitions.snappy,
};

export const tapScaleSmall = {
  scale: 0.98,
  transition: transitions.snappy,
};

// ============================================
// UTILITY FUNCTIONS - For complex animations
// ============================================

/**
 * Create a stagger container with custom delay
 * Use for animating lists or grids where items appear in sequence
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

// ============================================
// CSS ANIMATION GUIDE
// ============================================
/**
 * PREFER CSS OVER FRAMER MOTION FOR SIMPLE ANIMATIONS
 * 
 * Examples of CSS-based animations (add to your component className):
 * 
 * 1. Hover Scale:
 *    className="hover:scale-105 transition-transform duration-300"
 * 
 * 2. Hover Translate:
 *    className="hover:-translate-y-1 transition-transform duration-300"
 * 
 * 3. Fade In:
 *    className="opacity-0 animate-in fade-in duration-300"
 * 
 * 4. Combined Effects:
 *    className="hover:scale-105 hover:-translate-y-1 transition-all duration-300"
 * 
 * 5. Active State:
 *    className="active:scale-95 transition-transform duration-200"
 * 
 * 6. Loading Pulse:
 *    className="animate-pulse"
 * 
 * 7. Loading Spin:
 *    className="animate-spin"
 * 
 * Benefits of CSS animations:
 * - Smaller bundle size (no Framer Motion import)
 * - Better performance (GPU accelerated)
 * - Simpler code (no motion components)
 * - Works without JavaScript
 */
