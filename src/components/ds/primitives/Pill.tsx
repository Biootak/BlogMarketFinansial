import { type ReactNode, forwardRef } from 'react';

export type PillVariant = 'default' | 'primary' | 'accent';

export interface PillProps {
  children: ReactNode;
  icon?: ReactNode;
  variant?: PillVariant;
  onRemove?: () => void;
  removeLabel?: string;
  className?: string;
}

/**
 * Pill — تگ قابل‌حذف برای ActiveFilters.
 * - variant: default (خنثی) | primary (brand) | accent (هشدار/حذف)
 * - اختیاری: icon + remove button
 */
const Pill = forwardRef<HTMLDivElement, PillProps>(
  ({ children, icon, variant = 'default', onRemove, removeLabel = 'حذف', className = '' }, ref) => {
    const variantClass = variant !== 'default' ? `ds-pill--${variant}` : '';
    return (
      <div ref={ref} className={`ds-pill ${variantClass} ${className}`.trim()}>
        {icon ? <span className="ds-pill__icon">{icon}</span> : null}
        <span className="ds-pill__label">{children}</span>
        {onRemove ? (
          <button
            type="button"
            onClick={onRemove}
            className="ds-pill__remove"
            aria-label={removeLabel}
          >
            ×
          </button>
        ) : null}
      </div>
    );
  },
);

Pill.displayName = 'Pill';
export default Pill;
