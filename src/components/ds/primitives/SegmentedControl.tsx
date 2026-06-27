'use client';

import { type ReactNode, useCallback } from 'react';

export interface SegmentedOption<T extends string> {
  value: T;
  label: ReactNode;
  icon?: ReactNode;
}

export interface SegmentedControlProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (next: T) => void;
  ariaLabel: string;
  className?: string;
}

/**
 * SegmentedControl — single-select tab-like control.
 * - role="tablist" + role="tab" + aria-selected
 * - keyboard navigation با Arrow keys
 */
export default function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className = '',
}: SegmentedControlProps<T>) {
  const handleKey = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>, idx: number) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        const dir = e.key === 'ArrowRight' ? 1 : -1;
        const next = options[(idx + dir + options.length) % options.length];
        onChange(next.value);
        const parent = e.currentTarget.parentElement;
        const nextBtn = parent?.children[idx + dir] as HTMLButtonElement | undefined;
        nextBtn?.focus();
      }
    },
    [onChange, options],
  );

  return (
    <div className={`ds-segmented ${className}`.trim()} role="tablist" aria-label={ariaLabel}>
      {options.map((opt, i) => {
        const isActive = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-current={isActive ? 'true' : undefined}
            className="ds-segmented__item"
            onClick={() => onChange(opt.value)}
            onKeyDown={(e) => handleKey(e, i)}
            title={typeof opt.label === 'string' ? opt.label : undefined}
          >
            {opt.icon}
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
