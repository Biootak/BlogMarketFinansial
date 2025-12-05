/**
 * CSS Animation Utilities
 * Ensures all animations use GPU-accelerated properties
 */

/**
 * GPU-accelerated animation properties
 * Only use transform and opacity for best performance
 */
export const gpuProperties = ['transform', 'opacity'] as const;

/**
 * Check if animation uses GPU-accelerated properties
 */
export function isGPUAccelerated(property: string): boolean {
  return gpuProperties.includes(property as any);
}

/**
 * Get safe animation classes (GPU-accelerated only)
 */
export function getSafeAnimationClasses(): Record<string, string> {
  return {
    // Fade animations
    fadeIn: 'animate-in fade-in',
    fadeOut: 'animate-out fade-out',

    // Slide animations (using transform)
    slideInFromRight: 'animate-in slide-in-from-right',
    slideInFromLeft: 'animate-in slide-in-from-left',
    slideInFromTop: 'animate-in slide-in-from-top',
    slideInFromBottom: 'animate-in slide-in-from-bottom',

    // Scale animations (using transform)
    scaleIn: 'animate-in zoom-in',
    scaleOut: 'animate-out zoom-out',

    // Combined animations
    fadeSlideIn: 'animate-in fade-in slide-in-from-bottom',
  };
}

/**
 * Create GPU-accelerated animation style
 */
export function createGPUAnimation(config: {
  property: 'transform' | 'opacity';
  from: string;
  to: string;
  duration?: number;
  easing?: string;
}): React.CSSProperties {
  const { property, from, to, duration = 300, easing = 'ease-out' } = config;

  return {
    [property]: from,
    transition: `${property} ${duration}ms ${easing}`,
    willChange: property,
  };
}

/**
 * Check if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Get animation duration based on user preference
 */
export function getAnimationDuration(defaultDuration: number): number {
  return prefersReducedMotion() ? 0 : defaultDuration;
}

/**
 * Apply transform-gpu class for better performance
 */
export function getTransformGPUClass(): string {
  return 'transform-gpu';
}
