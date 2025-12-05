/**
 * Responsive Breakpoint System
 */

export const breakpoints = {
  mobile: { min: 0, max: 767 }, // < 768px
  tablet: { min: 768, max: 1023 }, // 768px - 1023px
  desktop: { min: 1024, max: 9999 }, // >= 1024px
} as const;

export type Breakpoint = keyof typeof breakpoints;

/**
 * Get current breakpoint based on window width
 */
export function getCurrentBreakpoint(): Breakpoint {
  if (typeof window === 'undefined') return 'desktop';

  const width = window.innerWidth;
  if (width < breakpoints.tablet.min) return 'mobile';
  if (width < breakpoints.desktop.min) return 'tablet';
  return 'desktop';
}

/**
 * Check if current viewport matches breakpoint
 */
export function isBreakpoint(breakpoint: Breakpoint): boolean {
  if (typeof window === 'undefined') return false;

  const width = window.innerWidth;
  const bp = breakpoints[breakpoint];
  return width >= bp.min && width <= bp.max;
}

/**
 * Check if viewport is mobile
 */
export function isMobile(): boolean {
  return isBreakpoint('mobile');
}

/**
 * Check if viewport is tablet
 */
export function isTablet(): boolean {
  return isBreakpoint('tablet');
}

/**
 * Check if viewport is desktop
 */
export function isDesktop(): boolean {
  return isBreakpoint('desktop');
}
