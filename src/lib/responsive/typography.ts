/**
 * Responsive Typography System
 */

export interface TypographyScale {
  mobile: { base: string; h1: string; h2: string; h3: string; h4: string };
  tablet: { base: string; h1: string; h2: string; h3: string; h4: string };
  desktop: { base: string; h1: string; h2: string; h3: string; h4: string };
}

export const typographyScale: TypographyScale = {
  mobile: {
    base: '16px', // 1rem
    h1: '28px', // 1.75rem
    h2: '24px', // 1.5rem
    h3: '20px', // 1.25rem
    h4: '18px', // 1.125rem
  },
  tablet: {
    base: '16px',
    h1: '36px', // 2.25rem
    h2: '28px', // 1.75rem
    h3: '24px', // 1.5rem
    h4: '20px', // 1.25rem
  },
  desktop: {
    base: '16px',
    h1: '48px', // 3rem
    h2: '36px', // 2.25rem
    h3: '28px', // 1.75rem
    h4: '24px', // 1.5rem
  },
};

/**
 * Get responsive font size classes
 */
export function getResponsiveFontSize(level: 'h1' | 'h2' | 'h3' | 'h4' | 'base'): string {
  const sizeMap = {
    h1: 'text-[28px] md:text-[36px] lg:text-[48px]',
    h2: 'text-[24px] md:text-[28px] lg:text-[36px]',
    h3: 'text-[20px] md:text-[24px] lg:text-[28px]',
    h4: 'text-[18px] md:text-[20px] lg:text-[24px]',
    base: 'text-base', // 16px at all breakpoints
  };

  return sizeMap[level];
}

/**
 * Get line height for text
 */
export function getLineHeight(level: 'h1' | 'h2' | 'h3' | 'h4' | 'base'): string {
  const lineHeightMap = {
    h1: 'leading-tight', // 1.25
    h2: 'leading-tight',
    h3: 'leading-snug', // 1.375
    h4: 'leading-snug',
    base: 'leading-relaxed', // 1.625
  };

  return lineHeightMap[level];
}

/**
 * Get max width for readable text
 */
export function getReadableWidth(): string {
  return 'max-w-prose'; // ~65ch (approximately 75 characters)
}

/**
 * Check if text exceeds readable length
 */
export function isTextTooLong(text: string, maxChars = 75): boolean {
  return text.length > maxChars;
}

/**
 * Get font weight classes
 */
export function getFontWeight(weight: 'light' | 'normal' | 'medium' | 'semibold' | 'bold'): string {
  const weightMap = {
    light: 'font-light', // 300
    normal: 'font-normal', // 400
    medium: 'font-medium', // 500
    semibold: 'font-semibold', // 600
    bold: 'font-bold', // 700
  };

  return weightMap[weight];
}
