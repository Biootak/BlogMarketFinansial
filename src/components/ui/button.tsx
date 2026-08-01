import { Slot } from '@radix-ui/react-slot';
import { type VariantProps, cva } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-semibold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          '[background:linear-gradient(180deg,var(--ds-brand-500),var(--ds-brand-600))] text-white ' +
          '[box-shadow:0_1px_0_oklch(100%_0_0/0.18)_inset,0_4px_14px_-4px_oklch(52%_0.14_162/0.45)] ' +
          'hover:-translate-y-px hover:[background:linear-gradient(180deg,var(--ds-brand-600),var(--ds-brand-700))] ' +
          'active:scale-[0.97] transition-all duration-200',
        destructive:
          'bg-red-500 text-white hover:bg-red-600 active:scale-[0.97] shadow-lg shadow-red-500/25',
        outline:
          'border border-neutral-300/80 bg-white/70 backdrop-blur-md hover:bg-white dark:bg-neutral-800/70 dark:hover:bg-neutral-700/80 text-neutral-700 dark:text-neutral-200 active:scale-[0.97] shadow-md shadow-neutral-900/5 dark:shadow-black/20',
        secondary:
          'bg-secondary-500 text-white hover:bg-secondary-600 active:scale-[0.97] shadow-lg shadow-secondary-500/25 backdrop-blur-md border border-white/25',
        ghost:
          'hover:bg-neutral-100/70 dark:hover:bg-neutral-800/70 backdrop-blur-md text-neutral-700 dark:text-neutral-200',
        link: 'text-primary-500 underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, type = 'button', ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        type={asChild ? undefined : type}
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
