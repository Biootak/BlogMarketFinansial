'use client';

import s from './obs.module.css';

interface SparklineProps {
  /** مقادیر خام — نرمال‌سازی داخل خود کامپوننت انجام می‌شود. */
  values: number[];
  /** نقاطی که باید «داغ» علامت بخورند (مثلاً ساعت‌های دارای خطا). */
  marks?: number[];
  /** ارتفاع منطقی viewBox — عرض همیشه ۱۰۰ و کشیده می‌شود. */
  height?: number;
  className?: string;
}

const VIEW_W = 100;

/**
 * ریزنمودار مشترک — یک polyline، بدون کتابخانه، بدون گره DOM اضافه.
 *
 * قبلاً هر ریزنمودار با ۲۴ `<span>` ساخته می‌شد؛ یعنی ۲۴ گره × تعداد ردیف.
 * این نسخه هر ریزنمودار را به یک المنت SVG تبدیل می‌کند (سبک‌تر برای INP روی
 * موبایل میان‌رده) و ضخامت خط با vector-effect ثابت می‌ماند.
 *
 * RTL: مختصات چپ‌به‌راست رسم می‌شود (قدیمی‌ترین در x=0) و در `dir=rtl` فقط با
 * یک scaleX(-1) آینه می‌شود؛ هیچ متنی داخل SVG نیست پس چیزی برعکس خوانده
 * نمی‌شود و جهت با بقیهٔ محورهای صفحه یکی می‌ماند.
 */
export function Sparkline({ values, marks, height = 24, className }: SparklineProps) {
  if (values.length === 0) return null;

  const max = Math.max(1, ...values);
  const step = values.length > 1 ? VIEW_W / (values.length - 1) : VIEW_W;
  const top = 1.5;
  const usable = height - top * 2;

  const coords = values.map((value, index) => {
    const x = Math.round(index * step * 100) / 100;
    const y = Math.round((height - top - (Math.max(0, value) / max) * usable) * 100) / 100;
    return { x, y };
  });

  const line = coords.map((point) => `${point.x},${point.y}`).join(' ');
  const hot = (marks ?? []).filter((index) => index >= 0 && index < coords.length);

  return (
    <svg
      className={className ? `${s.spark} ${className}` : s.spark}
      viewBox={`0 0 ${VIEW_W} ${height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <polyline className={s.sparkLine} points={line} vectorEffect="non-scaling-stroke" />
      {hot.map((index) => {
        const point = coords[index];
        if (!point) return null;
        return (
          <circle
            key={`hot-${index}`}
            className={s.sparkHot}
            cx={point.x}
            cy={point.y}
            r={1.6}
            vectorEffect="non-scaling-stroke"
          />
        );
      })}
    </svg>
  );
}
