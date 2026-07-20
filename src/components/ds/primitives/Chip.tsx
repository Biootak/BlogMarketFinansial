import { type ReactNode, forwardRef } from 'react';

export type ChipAccent = 'slate' | 'emerald' | 'amber' | 'rose' | 'violet' | 'brand';

export interface ChipProps {
  children: ReactNode;
  icon?: ReactNode;
  accent?: ChipAccent;
  className?: string;
}

/**
 * Chip — eyebrow chip با accent رنگی.
 * - استفاده در Hero (eyebrow)، quick-pick suggestions
 * - accent رنگ پس‌زمینه‌ی gradient را تعیین می‌کند
 */
const Chip = forwardRef<HTMLSpanElement, ChipProps>(
  ({ children, icon, accent = 'slate', className = '' }, ref) => {
    const accentClass = accent !== 'slate' ? `ds-chip--${accent}` : '';
    return (
      <span ref={ref} className={`ds-chip ${accentClass} ${className}`.trim()}>
        {icon ? <span className="ds-chip__icon">{icon}</span> : null}
        <span>{children}</span>
      </span>
    );
  },
);

Chip.displayName = 'Chip';
export default Chip;
