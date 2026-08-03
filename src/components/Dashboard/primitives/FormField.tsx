'use client';

import { cn } from '@/lib/utils';
import {
  Children,
  type ReactElement,
  type ReactNode,
  cloneElement,
  isValidElement,
  useId,
} from 'react';

export interface FormFieldProps {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  htmlFor?: string;
  /**
   * The single form control this field wraps. Must accept id,
   * aria-describedby, and aria-invalid props.
   *
   * If multiple children are passed (e.g. a hidden input + a visible control),
   * the first valid element receives the id/aria wiring; the rest are left intact.
   */
  children: ReactNode;
  className?: string;
}

/**
 * Find the first descendant that is a valid React element with a settable id
 * — i.e. the interactive control we should wire aria-describedby / aria-invalid to.
 */
function findControl(node: ReactNode): ReactElement<{
  id?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
}> | null {
  let found: ReactElement<{
    id?: string;
    'aria-describedby'?: string;
    'aria-invalid'?: boolean;
  }> | null = null;
  Children.forEach(node, (child) => {
    if (found) return;
    if (isValidElement(child)) {
      // Skip hidden inputs — they don't need aria wiring.
      const t = (child.props as { type?: unknown }).type;
      if (t === 'hidden') return;
      found = child as ReactElement<{
        id?: string;
        'aria-describedby'?: string;
        'aria-invalid'?: boolean;
      }>;
    }
  });
  return found;
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
  const control = findControl(children);
  const controlProps = (control?.props ?? {}) as {
    id?: string;
    'aria-describedby'?: string;
    'aria-invalid'?: boolean;
  };
  const inputId = htmlFor ?? controlProps.id ?? reactId;
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;
  const describedBy = [hint && !error ? hintId : null, error ? errorId : null]
    .filter(Boolean)
    .join(' ')
    .trim();

  // Re-walk children to clone only the first valid control with the id/aria wiring.
  let wired = false;
  const renderedChildren = Children.map(children, (child) => {
    if (wired) return child;
    if (!isValidElement(child)) return child;
    const t = (child.props as { type?: unknown }).type;
    if (t === 'hidden') return child;
    wired = true;
    return cloneElement(
      child as ReactElement<{
        id?: string;
        'aria-describedby'?: string;
        'aria-invalid'?: boolean;
      }>,
      {
        ...(controlProps.id === undefined ? { id: inputId } : {}),
        'aria-describedby': describedBy || controlProps['aria-describedby'],
        'aria-invalid': error ? true : controlProps['aria-invalid'],
      },
    );
  });

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
      {renderedChildren}
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
