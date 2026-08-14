'use client';

import * as RadioGroupPrimitive from '@radix-ui/react-radio-group';
import { Circle } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * RadioGroup / RadioGroupItem — Radix RadioGroup در پوستهٔ DS پروژه.
 *
 * قانون P0 (native-never): جایگزین `<input type="radio">` — با ترمینال
 * پیش‌فرض شبیه checkbox/switch (توکن‌های c-* همان خانواده).
 */
const RadioGroup = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>
>(({ className, ...props }, ref) => (
  <RadioGroupPrimitive.Root ref={ref} className={cn('grid gap-2', className)} {...props} />
));
RadioGroup.displayName = RadioGroupPrimitive.Root.displayName;

const RadioGroupItem = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item>
>(({ className, ...props }, ref) => (
  <RadioGroupPrimitive.Item
    ref={ref}
    className={cn(
      'aspect-square size-4 rounded-full border border-[rgb(var(--c-neutral-400))] text-[rgb(var(--c-primary-600))] shadow-sm transition-colors',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--c-primary-500))] focus-visible:ring-offset-2',
      'focus-visible:ring-offset-[rgb(var(--c-neutral-50))] disabled:cursor-not-allowed disabled:opacity-50',
      'data-[state=checked]:border-[rgb(var(--c-primary-600))]',
      className,
    )}
    {...props}
  >
    <RadioGroupPrimitive.Indicator className="flex items-center justify-center">
      <Circle className="size-2.5 fill-current text-current" />
    </RadioGroupPrimitive.Indicator>
  </RadioGroupPrimitive.Item>
));
RadioGroupItem.displayName = RadioGroupPrimitive.Item.displayName;

export { RadioGroup, RadioGroupItem };
