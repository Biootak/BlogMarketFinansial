'use client';

import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import * as React from 'react';
import { HiCheck } from 'react-icons/hi2';

import { cn } from '@/lib/utils';
import styles from './checkbox.module.css';

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, style, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    style={style}
    className={cn(
      styles.root,
      'peer h-5 w-5 shrink-0 rounded-md border-2 ring-offset-background',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
      'disabled:cursor-not-allowed disabled:opacity-50',
      'transition-all duration-200 ease-in-out',
      className,
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator
      className={cn(
        'flex items-center justify-center text-white transition-opacity duration-200 ease-in-out',
      )}
    >
      <HiCheck className="h-4 w-4" />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export { Checkbox };
