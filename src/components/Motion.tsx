'use client';

import { motion, useReducedMotion } from '@/lib/motion-shim';
import type { ComponentProps } from 'react';

// Re-export motion components with reduced motion support
export const MotionDiv = motion.div;

// Hook to check if user prefers reduced motion
export { useReducedMotion };

// Utility to get animation props based on reduced motion preference
export const getMotionProps = (
  props: ComponentProps<typeof motion.div>,
  reducedMotion: boolean | null,
) => {
  if (reducedMotion) {
    return {
      ...props,
      animate: undefined,
      initial: undefined,
      exit: undefined,
      transition: { duration: 0 },
      whileHover: undefined,
      whileTap: undefined,
    };
  }
  return props;
};
