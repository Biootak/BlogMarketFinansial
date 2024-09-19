/** @type {import('tailwindcss').Config} */

// Custom color with css variable color in __theme_color.scss
function customColors(cssVar) {
  return ({ opacityVariable, opacityValue }) => {
    if (opacityValue !== undefined) {
      return `rgba(var(${cssVar}), ${opacityValue})`;
    }
    if (opacityVariable !== undefined) {
      return `rgba(var(${cssVar}), var(${opacityVariable}, 1))`;
    }
    return `rgb(var(${cssVar}))`;
  };
}

module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class', // or 'media' or 'class',
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: '1rem',
        '2xl': '128px',
      },
    },

    extend: {
      colors: {
        primary: {
          50: customColors('--c-primary-50'),
          100: customColors('--c-primary-100'),
          200: customColors('--c-primary-200'),
          300: customColors('--c-primary-300'),
          400: customColors('--c-primary-400'),
          500: customColors('--c-primary-500'),
          6000: customColors('--c-primary-600'),
          700: customColors('--c-primary-700'),
          800: customColors('--c-primary-800'),
          900: customColors('--c-primary-900'),
        },
        secondary: {
          50: customColors('--c-secondary-50'),
          100: customColors('--c-secondary-100'),
          200: customColors('--c-secondary-200'),
          300: customColors('--c-secondary-300'),
          400: customColors('--c-secondary-400'),
          500: customColors('--c-secondary-500'),
          6000: customColors('--c-secondary-600'),
          700: customColors('--c-secondary-700'),
          800: customColors('--c-secondary-800'),
          900: customColors('--c-secondary-900'),
        },
        neutral: {
          50: customColors('--c-neutral-50'),
          100: customColors('--c-neutral-100'),
          200: customColors('--c-neutral-200'),
          300: customColors('--c-neutral-300'),
          400: customColors('--c-neutral-400'),
          500: customColors('--c-neutral-500'),
          6000: customColors('--c-neutral-600'),
          700: customColors('--c-neutral-700'),
          800: customColors('--c-neutral-800'),
          900: customColors('--c-neutral-900'),
        },
        success: {
          50: customColors('--c-success-50'),
          100: customColors('--c-success-100'),
          200: customColors('--c-success-200'),
          300: customColors('--c-success-300'),
          400: customColors('--c-success-400'),
          500: customColors('--c-success-500'),
          600: customColors('--c-success-600'),
          700: customColors('--c-success-700'),
          800: customColors('--c-success-800'),
          900: customColors('--c-success-900'),
        },
        destructive: {
          50: customColors('--c-destructive-50'),
          100: customColors('--c-destructive-100'),
          200: customColors('--c-destructive-200'),
          300: customColors('--c-destructive-300'),
          400: customColors('--c-destructive-400'),
          500: customColors('--c-destructive-500'),
          600: customColors('--c-destructive-600'),
          700: customColors('--c-destructive-700'),
          800: customColors('--c-destructive-800'),
          900: customColors('--c-destructive-900'),
        },
        info: {
          50: customColors('--c-info-50'),
          100: customColors('--c-info-100'),
          200: customColors('--c-info-200'),
          300: customColors('--c-info-300'),
          400: customColors('--c-info-400'),
          500: customColors('--c-info-500'),
          600: customColors('--c-info-600'),
          700: customColors('--c-info-700'),
          800: customColors('--c-info-800'),
          900: customColors('--c-info-900'),
        },
        warning: {
          50: customColors('--c-warning-50'),
          100: customColors('--c-warning-100'),
          200: customColors('--c-warning-200'),
          300: customColors('--c-warning-300'),
          400: customColors('--c-warning-400'),
          500: customColors('--c-warning-500'),
          600: customColors('--c-warning-600'),
          700: customColors('--c-warning-700'),
          800: customColors('--c-warning-800'),
          900: customColors('--c-warning-900'),
        },
        accent: {
          50: customColors('--c-accent-50'),
          100: customColors('--c-accent-100'),
          200: customColors('--c-accent-200'),
          300: customColors('--c-accent-300'),
          400: customColors('--c-accent-400'),
          500: customColors('--c-accent-500'),
          600: customColors('--c-accent-600'),
          700: customColors('--c-accent-700'),
          800: customColors('--c-accent-800'),
          900: customColors('--c-accent-900'),
        },
      },
    },
  },
  variants: {
    extend: {
      animation: {
        'spin-slow': 'spin 3s linear infinite',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
    require('@tailwindcss/forms'),
    require('@tailwindcss/aspect-ratio'),
  ],
  rtl: true,
};
