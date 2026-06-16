/**
 * @file AuthorStatPill
 * @description Inline stat cell (number + label) used across the author
 * surfaces. Numbers always pass through `toPersianNumber` so they read
 * naturally in RTL.
 */
import * as React from 'react';
import { cn } from '@/lib/utils';
import { toPersianNumber } from '@/lib/utils';

export interface AuthorStatPillProps {
  label: string;
  value: number | string;
  icon?: React.ReactNode;
  className?: string;
  /** Tighter layout for use inside dense cards */
  compact?: boolean;
}

const AuthorStatPill: React.FC<AuthorStatPillProps> = ({
  label,
  value,
  icon,
  className,
  compact = false,
}) => {
  const display =
    typeof value === 'number' ? toPersianNumber(value) : value;
  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-full border border-[color:var(--hairline)]',
        'bg-white/60 dark:bg-neutral-900/40',
        compact ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-xs',
        className,
      )}
    >
      {icon && (
        <span
          aria-hidden
          className="text-primary-500 dark:text-primary-300 flex items-center"
        >
          {icon}
        </span>
      )}
      <span className="author-num font-semibold text-neutral-900 dark:text-neutral-100">
        {display}
      </span>
      <span className="text-neutral-500 dark:text-neutral-400">{label}</span>
    </div>
  );
};

export default AuthorStatPill;
