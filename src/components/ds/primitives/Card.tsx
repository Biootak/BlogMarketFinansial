import { type HTMLAttributes, type ReactNode, forwardRef } from 'react';

export interface CardProps extends HTMLAttributes<HTMLElement> {
  /** محتوای اصلی */
  children: ReactNode;
  /** کلاس‌های اضافی */
  className?: string;
  /** نوع کارت (برای variant) */
  variant?: 'default' | 'featured' | 'list';
  /** آیا reveal animation فعال باشد */
  reveal?: boolean;
}

/**
 * Card — پایه‌ای‌ترین primitive.
 * - conic ring hover effect
 * - glassmorphism
 * - container queries
 * - logical properties (RTL-safe)
 */
const Card = forwardRef<HTMLElement, CardProps>(
  ({ children, className = '', variant = 'default', reveal = false, ...rest }, ref) => {
    const variantClass = variant === 'featured' ? 'ds-card--featured' : '';
    const revealAttr = reveal ? { 'data-ds-reveal': '' } : {};
    return (
      <article
        ref={ref}
        className={`ds-card ${variantClass} ${className}`.trim()}
        {...revealAttr}
        {...rest}
      >
        {children}
      </article>
    );
  },
);

Card.displayName = 'Card';
export default Card;
