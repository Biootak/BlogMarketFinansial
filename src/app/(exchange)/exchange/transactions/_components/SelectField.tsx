/**
 * SelectField — `<select>` با chevron در سمت چپ (انتهای مسیر خواندن در RTL).
 *
 * مشکل رایج: فلش <select> با position:100%-14px همیشه سمت راست فیزیکی است
 * که در RTL با متن راست‌چین تداخل می‌کند. این کامپوننت آیکون ChevronDown
 * را به‌عنوان یک المان جدا با inset-inline-end در سمت چپ (RTL) قرار می‌دهد.
 */

'use client';

import { ChevronDown } from 'lucide-react';
import { type SelectHTMLAttributes, forwardRef, useId } from 'react';
import { cn } from '@/lib/utils';
import s from './SelectField.module.css';

export interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  /** wrapper className (اختیاری) */
  wrapperClassName?: string;
}

export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(
  ({ wrapperClassName, className, children, ...rest }, ref) => {
    const reactId = useId();
    return (
      <span className={cn(s.wrap, wrapperClassName)}>
        <select ref={ref} className={cn(s.select, className)} id={rest.id ?? reactId} {...rest}>
          {children}
        </select>
        <ChevronDown
          size={14}
          strokeWidth={2}
          aria-hidden
          className={s.chevron}
        />
      </span>
    );
  },
);
SelectField.displayName = 'SelectField';
