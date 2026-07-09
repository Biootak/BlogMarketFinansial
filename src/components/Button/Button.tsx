'use client';

import type { Route } from '@/routers/types';
import Link from 'next/link';
import type React from 'react';
import { type ButtonHTMLAttributes, forwardRef } from 'react';
import type { FC } from 'react';
import Loading from './Loading';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  className?: string;
  sizeClass?: string;
  fontSize?: string;
  pattern?: 'primary' | 'secondary' | 'third' | 'white' | 'default';
  loading?: boolean;
  href?: Route;
  targetBlank?: boolean;
  onClick?: (event: React.MouseEvent<HTMLElement, MouseEvent>) => void;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      pattern = 'default',
      className = '',
      sizeClass = 'py-3 px-4 sm:py-3.5 sm:px-6',
      fontSize = 'text-sm sm:text-base font-medium',
      disabled = false,
      href,
      children,
      type = 'button',
      loading,
      onClick = () => {},
      ...rest
    },
    ref,
  ) => {
    let colors =
      'bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-neutral-100 dark:hover:bg-neutral-50 dark:text-black';
    switch (pattern) {
      case 'primary':
        colors = 'bg-primary-700 hover:bg-primary-600 text-primary-50';
        break;
      case 'secondary':
        colors = 'bg-secondary-500 hover:bg-secondary-600 text-secondary-50';
        break;
      case 'white':
        colors = 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-200';
        break;
      case 'third':
        colors =
          'bg-white dark:bg-neutral-900 ring-1 ring-neutral-300 hover:ring-neutral-400 dark:ring-neutral-700 dark:hover:ring-neutral-500';
        break;

      default:
        break;
    }

    const CLASSES = `nc-Button flex-shrink-0 relative h-auto inline-flex items-center justify-center rounded-full transition-all duration-200 border-transparent focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 hover:scale-[1.02] active:scale-[0.98] ${colors} ${fontSize} ${sizeClass} ${className} `;

    if (!!href) {
      return (
        <Link href={href} className={`${CLASSES}`} onClick={onClick}>
          {loading && <Loading />}
          {children || 'This is Link'}
        </Link>
      );
    }

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`${CLASSES}`}
        onClick={onClick}
        type={type}
        {...rest}
      >
        {loading && <Loading />}
        {children || 'Button default'}
      </button>
    );
  },
);

Button.displayName = 'Button';

export default Button;
