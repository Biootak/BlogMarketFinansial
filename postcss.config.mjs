/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    // 2026-06-25: Tailwind v4's built-in minify conflicts with Next.js 16's
    // cssnano-simple on `@property` at-rules and OKLCH tokens. Disable
    // Tailwind minification so Next.js handles (or skips) CSS optimization.
    "@tailwindcss/postcss": {
      optimize: { minify: false },
    },
  },
};

export default config;
