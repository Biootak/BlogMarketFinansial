/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    // 2026-08-04: Enable CSS minification in production via lightningcss
    // (stable, bundled with @tailwindcss/postcss — NOT the alpha version
    // embedded in the Turbopack binary). This stable lightningcss correctly
    // handles @property at-rules, oklch(), and color-mix() tokens in
    // globals.css/tokens.css without panicking. Dev keeps minify off for
    // faster HMR; production gets ~20-40% smaller CSS (raw) and ~5-15%
    // smaller after gzip. Previously minify was always false, shipping
    // unminified ~850KB-1.2MB CSS to every visitor.
    '@tailwindcss/postcss': {
      optimize: { minify: process.env.NODE_ENV === 'production' },
    },
  },
};

export default config;
