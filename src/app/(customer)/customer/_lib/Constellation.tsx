'use client';

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
 * استفاده:
 *   <Constellation className={s.lattice} />
 *
 * نکته: این کامپوننت pure SVG است — هیچ کتابخانهٔ سنگینی اضافه نمی‌کند.
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

export function Constellation({
  className,
  cols = 16,
  rows = 8,
  spacing = 28,
  r = 1,
  color = 'currentColor',
}: Props) {
  const width = cols * spacing + spacing;
  const height = rows * spacing + spacing;
  const dots: Array<{ x: number; y: number; size: number; opacity: number }> = [];

  // Generate grid with pseudo-random variation برای حس natural
  for (let row = 0; row <= rows; row++) {
    for (let col = 0; col <= cols; col++) {
      const x = col * spacing + spacing / 2;
      const y = row * spacing + spacing / 2;

      // pseudo-random modulation برای natural density
      const seed = (row * 7 + col * 13) % 11;
      const sizeMul = seed > 8 ? 1.6 : seed > 5 ? 1.2 : 1;
      const opacity = seed > 7 ? 0.85 : seed > 4 ? 0.55 : 0.3;

      // Sparse: skip ~30% of dots برای natural distribution
      if (seed % 3 === 0) continue;

      dots.push({ x, y, size: r * sizeMul, opacity });
    }
  }

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
        <circle
          key={i}
          cx={dot.x}
          cy={dot.y}
          r={dot.size}
          fill={color}
          opacity={dot.opacity}
        />
      ))}
    </svg>
  );
}
