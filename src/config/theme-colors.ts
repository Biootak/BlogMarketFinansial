/**
 * Theme Colors Configuration
 * 
 * این فایل مرکزی برای مدیریت رنگ‌های پروژه است.
 * برای تغییر رنگ‌ها، فقط این فایل را ویرایش کنید.
 * 
 * Theme Colors Central Configuration
 * 
 * This file is the central configuration for managing project colors.
 * To change colors, just edit this file.
 */

export const themeColors = {
  // رنگ‌های اصلی (Primary Colors)
  primary: {
    50: '239, 246, 255',
    100: '219, 234, 254',
    200: '191, 219, 254',
    300: '147, 197, 253',
    400: '96, 165, 250',
    500: '59, 130, 246',
    600: '37, 99, 235',
    700: '29, 78, 216',
    800: '30, 64, 175',
    900: '30, 58, 138',
  },

  // رنگ‌های ثانویه (Secondary Colors) - برای gradient
  gradient: {
    // رنگ اول gradient (برای استفاده در from)
    from: {
      50: '250, 232, 255',   // purple-50
      100: '243, 232, 255',  // purple-100
      200: '233, 213, 255',  // purple-200
      300: '216, 180, 254',  // purple-300
      400: '192, 132, 252',  // purple-400
      500: '168, 85, 247',   // purple-500
      600: '147, 51, 234',   // purple-600
      700: '126, 34, 206',   // purple-700
      800: '107, 33, 168',   // purple-800
      900: '88, 28, 135',    // purple-900
    },
    // رنگ دوم gradient (برای استفاده در to)
    to: {
      50: '253, 244, 255',   // pink-50
      100: '250, 232, 255',  // pink-100
      200: '252, 231, 243',  // pink-200
      300: '249, 168, 212',  // pink-300
      400: '244, 114, 182',  // pink-400
      500: '236, 72, 153',   // pink-500
      600: '219, 39, 119',   // pink-600
      700: '190, 24, 93',    // pink-700
      800: '157, 23, 77',    // pink-800
      900: '131, 24, 67',    // pink-900
    },
  },

  // رنگ‌های Accent (برای highlights و badges)
  accent: {
    50: '255, 251, 235',
    100: '254, 243, 199',
    200: '253, 230, 138',
    300: '252, 211, 77',
    400: '251, 191, 36',
    500: '245, 158, 11',
    600: '217, 119, 6',
    700: '180, 83, 9',
    800: '146, 64, 14',
    900: '120, 53, 15',
  },
} as const;

/**
 * Utility function برای ایجاد gradient classes
 */
export const getGradientClasses = (from: keyof typeof themeColors.gradient.from = '500', to: keyof typeof themeColors.gradient.to = '500') => {
  return `from-[rgb(${themeColors.gradient.from[from]})] to-[rgb(${themeColors.gradient.to[to]})]`;
};

/**
 * Helper برای استفاده در Tailwind classes
 */
export const gradientClasses = {
  primary: getGradientClasses('500', '500'),
  light: getGradientClasses('400', '400'),
  dark: getGradientClasses('600', '600'),
} as const;


