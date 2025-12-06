/**
 * Spacing System Utilities
 * Consistent spacing values across the application
 */

export const spacing = {
  section: {
    mobile: 'py-6', // 1.5rem vertical
    tablet: 'py-8', // 2rem vertical
    desktop: 'py-12', // 3rem vertical
  },
  container: {
    mobile: 'px-4', // 1rem horizontal
    tablet: 'px-6', // 1.5rem horizontal
    desktop: 'px-8', // 2rem horizontal
  },
  grid: {
    mobile: 'gap-4', // 1rem
    tablet: 'gap-6', // 1.5rem
    desktop: 'gap-6', // 1.5rem
  },
  stack: {
    tight: 'space-y-2', // 0.5rem
    normal: 'space-y-4', // 1rem
    loose: 'space-y-6', // 1.5rem
  },
} as const;

/**
 * Get responsive spacing classes
 */
export function getResponsiveSpacing(type: 'section' | 'container' | 'grid'): string {
  const values = spacing[type];
  return `${values.mobile} md:${values.tablet} lg:${values.desktop}`;
}

/**
 * Get container padding classes
 */
export function getContainerPadding(): string {
  return 'px-4 md:px-6 lg:px-8';
}

/**
 * Get section spacing classes
 */
export function getSectionSpacing(): string {
  return 'py-6 md:py-8 lg:py-12';
}

/**
 * Get grid gap classes
 */
export function getGridGap(): string {
  return 'gap-4 md:gap-6';
}
