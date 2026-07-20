import { form, heading, space, text } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import * as React from 'react';

/**
 * FormField — the single source of truth for a labeled form input.
 * Wraps the label, input, helper, and error markup so every form in the
 * project renders the same way.
 *
 * Usage:
 *   <FormField label="عنوان" required error={errors.title?.message}>
 *     <Input {...register('title')} />
 *   </FormField>
 */
interface FormFieldProps {
  label?: React.ReactNode;
  required?: boolean;
  error?: string;
  helper?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  /** Renders label on the same row as the input. Default is stacked. */
  inline?: boolean;
  htmlFor?: string;
}

export function FormField({
  label,
  required,
  error,
  helper,
  children,
  className,
  inline,
  htmlFor,
}: FormFieldProps) {
  const id = htmlFor ?? React.useId();
  return (
    <div className={cn(inline ? 'flex items-center gap-4' : 'flex flex-col gap-1.5', className)}>
      {label && (
        <label htmlFor={id} className={cn(form.label, required && form.required)}>
          {label}
        </label>
      )}
      <div className={inline ? 'flex-1' : ''}>{children}</div>
      {error ? (
        <p className={form.error}>{error}</p>
      ) : helper ? (
        <p className={form.helper}>{helper}</p>
      ) : null}
    </div>
  );
}

/**
 * FormSection — wraps a group of FormFields with consistent vertical
 * rhythm between sections.
 */
export function FormSection({
  title,
  description,
  children,
  className,
}: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('space-y-4', className)}>
      {(title || description) && (
        <div className="space-y-1">
          {title && <h3 className={heading.h3}>{title}</h3>}
          {description && <p className={text.bodySm}>{description}</p>}
        </div>
      )}
      <div className={form.fieldGap}>{children}</div>
    </div>
  );
}

/**
 * FieldGrid — a responsive 2-column grid of FormFields.
 */
export function FieldGrid({
  children,
  className,
  cols = 2,
}: {
  children: React.ReactNode;
  className?: string;
  cols?: 1 | 2 | 3;
}) {
  const colsClass = cols === 3 ? 'sm:grid-cols-3' : cols === 2 ? 'sm:grid-cols-2' : '';
  return <div className={cn('grid gap-4', colsClass, className)}>{children}</div>;
}
