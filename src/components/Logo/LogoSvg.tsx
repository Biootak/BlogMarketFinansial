type LogoSvgProps = {
  className?: string;
  /**
   * Optional title for screen readers. Renders as an SVG <title> node so
   * the logo stays accessible when used as the only branding element.
   */
  title?: string;
};

/**
 * Inline SVG logo — Atelier 2026.
 *
 * Design:
 *   • Hexagonal base (financial / geometric) with a hairline stroke that
 *     uses `currentColor` — so the same SVG inherits the surrounding
 *     text color in light AND dark mode without any JS or media query.
 *   • A small chart line in the middle: a stylized upward trend, the
 *     single emerald accent that ties the logo to the rest of the
 *     design system (Atelier `--at-accent`).
 *   • All strokes use `vector-effect="non-scaling-stroke"` so the logo
 *     stays crisp at any size.
 *
 * Why SVG (not PNG):
 *   • One file, both themes — `currentColor` does the switching.
 *   • ~1 KB versus 3 KB per PNG (×2 themes = 6 KB of PNG).
 *   • Scales perfectly to retina / 4K / print.
 *   • Inline = no extra HTTP request, no layout shift.
 *
 * Custom uploads (admin override) still flow through the `logoUrl` prop
 * on `<Logo />`; this component is the default and the fallback.
 */
const LogoSvg = ({ className, title = 'لوگوی financial market' }: LogoSvgProps) => {
  return (
    <svg
      width="40"
      height="40"
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label={title}
    >
      <title>{title}</title>

      {/* Hexagonal base — hairline stroke inherits text color */}
      <path
        d="M20 4.5L33.5 12V28L20 35.5L6.5 28V12L20 4.5Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        opacity="0.85"
      />

      {/* Inner ring — softer, for depth */}
      <path
        d="M20 9.5L29 14.5V25.5L20 30.5L11 25.5V14.5L20 9.5Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.8"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        opacity="0.35"
      />

      {/* Chart line — emerald accent (single color, theme-independent) */}
      <path
        d="M12 25L17 19.5L22 22L28 14.5"
        fill="none"
        stroke="var(--at-accent, #059669)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />

      {/* Accent dot at the latest data point — signals "live" */}
      <circle cx="28" cy="14.5" r="1.8" fill="var(--at-accent, #059669)" />
    </svg>
  );
};

export default LogoSvg;
