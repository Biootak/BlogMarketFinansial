/**
 * Theme Utility Classes
 * 
 * کلاس‌های کمکی برای استفاده یکپارچه از رنگ‌های پروژه
 * 
 * Utility classes for consistent use of project colors
 */

/**
 * کلاس‌های gradient برای استفاده در کامپوننت‌ها
 * برای تغییر رنگ‌ها، فقط CSS Variables را در globals.css تغییر دهید
 */
export const gradientClasses = {
  // Gradient اصلی (primary-400 to primary-600) - آبی
  primary: 'bg-gradient-to-r from-primary-400 to-primary-600',
  primaryHover: 'hover:from-primary-500 hover:to-primary-700',
  
  // Gradient روشن‌تر
  light: 'bg-gradient-to-r from-primary-300 to-primary-500',
  lightHover: 'hover:from-primary-400 hover:to-primary-600',
  
  // Gradient تیره‌تر
  dark: 'bg-gradient-to-r from-primary-500 to-primary-700',
  darkHover: 'hover:from-primary-600 hover:to-primary-800',
  
  // برای dark mode
  darkMode: 'dark:from-primary-500 dark:via-primary-600 dark:to-primary-500',
} as const;

/**
 * کلاس‌های border برای استفاده با gradient
 */
export const borderClasses = {
  gradient: 'border-primary-200 dark:border-primary-800',
  gradientHover: 'hover:border-primary-300 dark:hover:border-primary-700',
  gradientLight: 'border-primary-300/50 dark:border-primary-700/50',
} as const;

/**
 * کلاس‌های text برای استفاده با gradient
 */
export const textClasses = {
  gradient: 'text-primary-600 dark:text-primary-400',
  gradientHover: 'hover:text-primary-600 dark:hover:text-primary-400',
  gradientActive: 'text-primary-600 dark:text-primary-400',
} as const;

/**
 * کلاس‌های shadow برای استفاده با gradient
 */
export const shadowClasses = {
  gradient: 'shadow-primary-500/50',
  gradientHover: 'hover:shadow-primary-500/50',
  gradientLight: 'shadow-primary-300/50',
} as const;

/**
 * کلاس‌های background برای استفاده با primary colors
 */
export const bgClasses = {
  gradientLight: 'bg-primary-50 dark:bg-primary-900/20',
  gradientHover: 'hover:bg-primary-50 dark:hover:bg-primary-900/20',
} as const;

/**
 * ترکیب تمام کلاس‌های gradient برای استفاده راحت
 */
export const themeGradient = {
  button: `${gradientClasses.primary} ${gradientClasses.primaryHover} text-white`,
  badge: `${gradientClasses.primary} text-white`,
  border: `${borderClasses.gradient} ${borderClasses.gradientHover}`,
  text: `${textClasses.gradient} ${textClasses.gradientHover}`,
  card: `${borderClasses.gradient} ${borderClasses.gradientHover}`,
} as const;

