/**
 * RTL (Right-to-Left) Support Utilities
 */

export interface RTLConfig {
  direction: 'rtl' | 'ltr';
  locale: string;
}

/**
 * Convert physical CSS properties to logical properties
 */
export function toLogicalProperty(property: string, value: string): Record<string, string> {
  const logicalMap: Record<string, string> = {
    'margin-left': 'margin-inline-start',
    'margin-right': 'margin-inline-end',
    'padding-left': 'padding-inline-start',
    'padding-right': 'padding-inline-end',
    left: 'inset-inline-start',
    right: 'inset-inline-end',
    'border-left': 'border-inline-start',
    'border-right': 'border-inline-end',
    'text-align-left': 'text-align: start',
    'text-align-right': 'text-align: end',
  };

  const logicalProperty = logicalMap[property] || property;
  return { [logicalProperty]: value };
}

/**
 * Get RTL-aware Tailwind classes
 */
export const rtlClasses = {
  // Spacing
  marginStart: 'ms-',
  marginEnd: 'me-',
  paddingStart: 'ps-',
  paddingEnd: 'pe-',

  // Positioning
  start: 'start-',
  end: 'end-',
  insetStart: 'inset-inline-start-',
  insetEnd: 'inset-inline-end-',

  // Text alignment
  textStart: 'text-start',
  textEnd: 'text-end',

  // Borders
  borderStart: 'border-s-',
  borderEnd: 'border-e-',
  roundedStart: 'rounded-s-',
  roundedEnd: 'rounded-e-',
} as const;

/**
 * Replace physical classes with logical ones
 */
export function convertToLogicalClasses(className: string): string {
  const replacements: Record<string, string> = {
    // Margins
    'ml-': 'ms-',
    'mr-': 'me-',
    '-ml-': '-ms-',
    '-mr-': '-me-',

    // Padding
    'pl-': 'ps-',
    'pr-': 'pe-',

    // Positioning
    'left-': 'start-',
    'right-': 'end-',

    // Text alignment
    'text-left': 'text-start',
    'text-right': 'text-end',

    // Borders
    'border-l-': 'border-s-',
    'border-r-': 'border-e-',
    'rounded-l-': 'rounded-s-',
    'rounded-r-': 'rounded-e-',
  };

  let result = className;
  for (const [physical, logical] of Object.entries(replacements)) {
    result = result.replace(new RegExp(physical, 'g'), logical);
  }

  return result;
}

/**
 * Reverse animation direction for RTL
 */
export function reverseAnimation(animation: string): string {
  const reversals: Record<string, string> = {
    'slide-in-from-left': 'slide-in-from-right',
    'slide-in-from-right': 'slide-in-from-left',
    'slide-out-to-left': 'slide-out-to-right',
    'slide-out-to-right': 'slide-out-to-left',
  };

  return reversals[animation] || animation;
}

/**
 * Get transform direction for RTL
 */
export function getTransformDirection(direction: 'left' | 'right', isRTL: boolean): string {
  if (!isRTL) return direction;
  return direction === 'left' ? 'right' : 'left';
}

/**
 * Check if current direction is RTL
 */
export function isRTL(): boolean {
  if (typeof document === 'undefined') return false;
  return document.documentElement.dir === 'rtl';
}

/**
 * Get icon rotation for RTL
 */
export function getIconRotation(icon: 'arrow' | 'chevron', isRTL: boolean): string {
  if (!isRTL) return '';
  return 'rotate-180';
}

/**
 * Convert space-x to gap (RTL-friendly)
 */
export function spaceXToGap(className: string): string {
  return className.replace(/space-x-(\d+)/g, 'gap-x-$1');
}

/**
 * Ensure RTL compatibility in className
 */
export function ensureRTLCompatibility(className: string): string {
  let result = className;

  // Convert space-x to gap
  result = spaceXToGap(result);

  // Convert physical to logical
  result = convertToLogicalClasses(result);

  return result;
}
