'use client';

import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';

import { cn } from '@/lib/utils';

const TooltipProvider = TooltipPrimitive.Provider;

const Tooltip = TooltipPrimitive.Root;

const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content> & {
    variant?:
      | 'primary'
      | 'secondary'
      | 'neutral'
      | 'success'
      | 'destructive'
      | 'info'
      | 'warning'
      | 'accent';
  }
>(({ className, sideOffset = 4, variant = 'primary', ...props }, ref) => {
  const variantClasses = {
    primary: 'bg-primary-100 text-primary-900 border-primary-200',
    secondary: 'bg-secondary-100 text-secondary-900 border-secondary-200',
    neutral: 'bg-neutral-100 text-neutral-900 border-neutral-200',
    success: 'bg-success-100 text-success-900 border-success-200',
    destructive: 'bg-destructive-100 text-destructive-900 border-destructive-200',
    info: 'bg-info-100 text-info-900 border-info-200',
    warning: 'bg-warning-100 text-warning-900 border-warning-200',
    accent: 'bg-accent-100 text-accent-900 border-accent-200',
  };

  return (
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        'z-50 overflow-hidden rounded-md border px-3 py-1.5 text-sm shadow-md',
        'animate-in fade-in-0 zoom-in-95',
        'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
        'data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
});
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
