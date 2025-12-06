'use client';

import { cn } from '@/lib/utils';
import { useEffect, useRef, useState } from 'react';

export interface MobileOptimizedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

/**
 * Mobile Optimized Input
 * - Full width on mobile
 * - Scrolls into view when focused
 * - Appropriate input types for mobile keyboards
 * - Error messages without layout shift
 */
export function MobileOptimizedInput({
  label,
  error,
  helperText,
  className,
  type = 'text',
  ...props
}: MobileOptimizedInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  // Scroll into view when keyboard appears
  useEffect(() => {
    if (!isFocused || !inputRef.current) return;

    const timer = setTimeout(() => {
      inputRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }, 300); // Wait for keyboard animation

    return () => clearTimeout(timer);
  }, [isFocused]);

  // Get optimal input type for mobile
  const getInputType = () => {
    const mobileTypes: Record<string, string> = {
      email: 'email',
      tel: 'tel',
      number: 'number',
      url: 'url',
      search: 'search',
    };
    return mobileTypes[type] || type;
  };

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium mb-2" htmlFor={props.id}>
          {label}
        </label>
      )}

      <div className="relative">
        <input
          ref={inputRef}
          type={getInputType()}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className={cn(
            'w-full px-4 py-3 rounded-lg border',
            'focus:outline-none focus:ring-2 focus:ring-primary-500',
            'transition-colors duration-200',
            error
              ? 'border-red-500 focus:border-red-500'
              : 'border-neutral-300 dark:border-neutral-600',
            'bg-white dark:bg-neutral-800',
            'text-base', // Minimum 16px to prevent zoom on iOS
            className,
          )}
          {...props}
        />

        {/* Error message - reserved space to prevent layout shift */}
        <div className="min-h-[20px] mt-1">
          {error && (
            <p className="text-sm text-red-500 animate-in fade-in slide-in-from-top-1">{error}</p>
          )}
          {!error && helperText && <p className="text-sm text-neutral-500">{helperText}</p>}
        </div>
      </div>
    </div>
  );
}

/**
 * Mobile Optimized Select
 * - Native select on mobile for better UX
 * - Bottom sheet style on desktop
 */
export function MobileOptimizedSelect({
  label,
  error,
  options,
  className,
  ...props
}: {
  label?: string;
  error?: string;
  options: Array<{ value: string; label: string }>;
  className?: string;
} & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium mb-2" htmlFor={props.id}>
          {label}
        </label>
      )}

      <select
        className={cn(
          'w-full px-4 py-3 rounded-lg border',
          'focus:outline-none focus:ring-2 focus:ring-primary-500',
          'transition-colors duration-200',
          error
            ? 'border-red-500 focus:border-red-500'
            : 'border-neutral-300 dark:border-neutral-600',
          'bg-white dark:bg-neutral-800',
          'text-base',
          className,
        )}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {/* Error message */}
      <div className="min-h-[20px] mt-1">
        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>
    </div>
  );
}

/**
 * Mobile Optimized Date Input
 * - Native date picker on mobile
 */
export function MobileOptimizedDateInput({
  label,
  error,
  className,
  ...props
}: {
  label?: string;
  error?: string;
  className?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium mb-2" htmlFor={props.id}>
          {label}
        </label>
      )}

      <input
        type="date"
        className={cn(
          'w-full px-4 py-3 rounded-lg border',
          'focus:outline-none focus:ring-2 focus:ring-primary-500',
          'transition-colors duration-200',
          error
            ? 'border-red-500 focus:border-red-500'
            : 'border-neutral-300 dark:border-neutral-600',
          'bg-white dark:bg-neutral-800',
          'text-base',
          className,
        )}
        {...props}
      />

      {/* Error message */}
      <div className="min-h-[20px] mt-1">
        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>
    </div>
  );
}
