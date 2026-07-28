'use client';

/**
 * Sparkline — نمودار کوچک SVG (area + line) برای نمایش trend
 * ---------------------------------------------------------------------------
 * یک area chart ساده که از data points ساخته می‌شود. خط + fill gradient
 * اختیاری. نقطهٔ آخر highlight می‌شود.
 *
 * استفاده:
 *   <Sparkline data={[10, 15, 13, 18, 22, 19, 25]} height={48} />
 *
 * نکات:
 *   - Pure SVG — بدون کتابخانه chart
 *   - Path ساخته می‌شود از data normalized به 0..1
 *   - Area path از خط + baseline ساخته می‌شود
 *   - استایل از CSS variable `--ds-brand-500` (یا از prop) استفاده می‌کند
 *   - ID gradient منحصر به React.useId() است تا در صفحه‌های چندتایی
 *     collision نداشته باشد
 */

import { useId } from 'react';

interface Props {
  /** داده‌ها (هر مقدار عددی) — باید حداقل ۲ نقطه داشته باشد */
  data: number[];
  /** ارتفاع نمودار (پیش‌فرض 48) */
  height?: number;
  /** stroke color (پیش‌فرض: currentColor) */
  stroke?: string;
  /** area fill — اگر ندهی، فقط خط نمایش داده می‌شود */
  fill?: boolean;
  /** نمایش نقطهٔ آخر (پیش‌فرض: true) */
  showEndDot?: boolean;
  className?: string;
  /** ARIA label برای screen reader (پیش‌فرض: "نمودار روند") */
  ariaLabel?: string;
  /** عرض — اگر ندهی 100% می‌شود (با preserveAspectRatio="none") */
  width?: number | string;
}

export function Sparkline({
  data,
  height = 48,
  stroke = 'currentColor',
  fill = true,
  showEndDot = true,
  className,
  ariaLabel = 'نمودار روند',
  width = '100%',
}: Props) {
  const gradientId = useId();
  const fillUrl = `url(#${gradientId})`;

  if (!data || data.length < 2) {
    return (
      <svg
        className={className}
        width={width}
        height={height}
        viewBox={`0 0 100 ${height}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={ariaLabel}
      />
    );
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1; // avoid divide-by-zero

  // Padding کوچک داخلی (برای نقطهٔ آخر)
  const padY = 4;
  const usableHeight = height - padY * 2;

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = padY + (1 - (v - min) / range) * usableHeight;
    return { x, y };
  });

  // Build line path
  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(' ');

  // Build area path (line + bottom corners)
  const areaPath = `${linePath} L100 ${height} L0 ${height} Z`;

  const lastPoint = points[points.length - 1];
  const isUp = data[data.length - 1] >= data[0];

  return (
    <svg
      className={className}
      width={width}
      height={height}
      viewBox={`0 0 100 ${height}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={ariaLabel}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.25" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      {fill && <path d={areaPath} fill={fillUrl} />}
      <path
        d={linePath}
        fill="none"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      {showEndDot && (
        <circle
          cx={lastPoint.x}
          cy={lastPoint.y}
          r="2.5"
          fill={stroke}
          stroke="var(--ds-surface)"
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
          opacity={isUp ? 1 : 0.8}
        />
      )}
    </svg>
  );
}
