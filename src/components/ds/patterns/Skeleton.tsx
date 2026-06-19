import type { CSSProperties } from 'react';

export interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  radius?: string;
  className?: string;
  /** اگر true، کل Skeleton بزرگ parent را پر می‌کند */
  block?: boolean;
  style?: CSSProperties;
}

/**
 * Skeleton — جای‌گزین loading با انیمیشن شیمر.
 * - color از token (var(--ds-border-subtle) + overlay)
 * - prefers-reduced-motion → انیمیشن غیرفعال
 */
export default function Skeleton({
  width,
  height,
  radius = 'var(--ds-radius-md)',
  className = '',
  block = false,
  style: customStyle,
}: SkeletonProps) {
  const baseStyle: CSSProperties = {
    width: block ? '100%' : width,
    height: block ? '100%' : height,
    borderRadius: radius,
  };
  return (
    <div
      className={`ds-skeleton ${className}`.trim()}
      style={{ ...baseStyle, ...customStyle }}
      aria-hidden
      role="presentation"
    />
  );
}
