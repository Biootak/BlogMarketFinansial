import { type ButtonHTMLAttributes, type ReactNode, forwardRef } from 'react';

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  label: string;
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * IconButton — دکمه‌ی square فقط با آیکون.
 * - aria-label اجباری (screen reader)
 * - focus ring واضح
 */
const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon, label, size = 'md', className = '', ...rest }, ref) => {
    const sizeClass = size === 'sm' ? 'ds-icon-btn--sm' : '';
    return (
      <button
        ref={ref}
        type="button"
        aria-label={label}
        title={label}
        className={`ds-icon-btn ${sizeClass} ds-focus ${className}`.trim()}
        {...rest}
      >
        {icon}
      </button>
    );
  },
);

IconButton.displayName = 'IconButton';
export default IconButton;
