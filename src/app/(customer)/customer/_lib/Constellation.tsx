/**
 * Constellation — پترن نقطه‌ای ambient برای پس‌زمینه
 * ---------------------------------------------------------------------------
 * یک grid از نقاط کوچک SVG که حس «نقشهٔ ستاره‌ای» (star map) می‌دهد.
 * از CSS mask استفاده می‌کند تا در لبه‌ها fade شود — تمرکز چشم در مرکز.
 *
 * - 16×8 grid از نقاط
 * - سایز نقطه‌ها متنوع (varying density) برای حس طبیعی‌تر
 * - بدون انیمیشن (می‌توان به pulseGlow داد ولی فقط روی hero)
 * - استفاده در hero، modal، و هر جایی که نیاز به ambient depth داریم
 *
 * نکته‌های performance:
 *   - Server Component — 'use client' حذف شد (pure SVG, no hooks)
 *   - DEFAULT_DOTS یک‌بار در module-level محاسبه می‌شود (default props ثابت)
 *
 * استفاده:
 *   <Constellation className={s.lattice} />
 */

interface Props {
  className?: string;
  /** تعداد ستون‌ها (پیش‌فرض 16) */
  cols?: number;
  /** تعداد ردیف‌ها (پیش‌فرض 8) */
  rows?: number;
  /** فاصله بین نقاط بر حسب px (پیش‌فرض 28) */
  spacing?: number;
  /** radius هر نقطه (پیش‌فرض 1) */
  r?: number;
  /** رنگ نقطه‌ها (پیش‌فرض: currentColor) */
  color?: string;
}

/** محاسبه dots برای props دلخواه */
function buildDots(cols: number, rows: number, spacing: number, r: number) {
  const dots: Array<{ x: number; y: number; size: number; opacity: number }> = [];
  for (let row = 0; row <= rows; row++) {
    for (let col = 0; col <= cols; col++) {
      const x = col * spacing + spacing / 2;
      const y = row * spacing + spacing / 2;
      const seed = (row * 7 + col * 13) % 11;
      const sizeMul = seed > 8 ? 1.6 : seed > 5 ? 1.2 : 1;
      const opacity = seed > 7 ? 0.85 : seed > 4 ? 0.55 : 0.3;
      if (seed % 3 === 0) continue;
      dots.push({ x, y, size: r * sizeMul, opacity });
    }
  }
  return dots;
}

// Default configuration — یک‌بار محاسبه می‌شود
const DEFAULT_COLS = 16;
const DEFAULT_ROWS = 8;
const DEFAULT_SPACING = 28;
const DEFAULT_R = 1;
const DEFAULT_DOTS = buildDots(DEFAULT_COLS, DEFAULT_ROWS, DEFAULT_SPACING, DEFAULT_R);
const DEFAULT_WIDTH = DEFAULT_COLS * DEFAULT_SPACING + DEFAULT_SPACING;
const DEFAULT_HEIGHT = DEFAULT_ROWS * DEFAULT_SPACING + DEFAULT_SPACING;

export function Constellation({
  className,
  cols = DEFAULT_COLS,
  rows = DEFAULT_ROWS,
  spacing = DEFAULT_SPACING,
  r = DEFAULT_R,
  color = 'currentColor',
}: Props) {
  // اگر props پیش‌فرض باشند از cache استفاده می‌کنیم
  const isDefault =
    cols === DEFAULT_COLS && rows === DEFAULT_ROWS && spacing === DEFAULT_SPACING && r === DEFAULT_R;

  const dots = isDefault ? DEFAULT_DOTS : buildDots(cols, rows, spacing, r);
  const width = isDefault ? DEFAULT_WIDTH : cols * spacing + spacing;
  const height = isDefault ? DEFAULT_HEIGHT : rows * spacing + spacing;

  return (
    <svg
      className={className}
      width="100%"
      height="100%"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
    >
      {dots.map((dot, i) => (
        <circle key={i} cx={dot.x} cy={dot.y} r={dot.size} fill={color} opacity={dot.opacity} />
      ))}
    </svg>
  );
}
