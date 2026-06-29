/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    // 2026-06-28: Tailwind v4's built-in minify (lightningcss) handles
    // OKLCH tokens correctly. Keep Next.js cssnano disabled; Tailwind will
    // minify the CSS during the PostCSS pass.
    "@tailwindcss/postcss": {
      optimize: { minify: true },
    },
  },
};

export default config;
