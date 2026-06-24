'use client';

import { cn } from '@/lib/utils';
import { type ReactElement, type ReactNode, cloneElement, isValidElement, useId } from 'react';

export interface FormFieldProps {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  htmlFor?: string;
  /**
   * The single form control this field wraps. Must accept id,
   * aria-describedby, and aria-invalid props.
   */
  children: ReactElement<{
    id?: string;
    'aria-describedby'?: string;
    'aria-invalid'?: boolean;
  }>;
  className?: string;
}

export function FormField({
  label,
  error,
  hint,
  required = false,
  htmlFor,
  children,
  className,
}: FormFieldProps) {
  const reactId = useId();
  const inputId = htmlFor ?? children.props.id ?? reactId;
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;
  const describedBy = [hint && !error ? hintId : null, error ? errorId : null]
    .filter(Boolean)
    .join(' ')
    .trim();

  const labelled = isValidElement(children)
    ? cloneElement(children, {
        ...(children.props.id === undefined ? { id: inputId } : {}),
        'aria-describedby': describedBy || children.props['aria-describedby'],
        'aria-invalid': error ? true : children.props['aria-invalid'],
      })
    : children;

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={inputId} className="text-sm font-medium text-foreground">
        {label}
        {required && (
          <span aria-hidden="true" className="ms-1 text-rose-600">
            *
          </span>
        )}
      </label>
      {labelled}
      {error ? (
        <p id={errorId} role="alert" className="text-xs text-rose-600">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

// Re-export ReactNode so consumers can type form-related props from this module.
export type { ReactNode };
