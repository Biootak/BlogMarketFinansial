'use client';

import * as React from 'react';
import * as ToastPrimitives from '@radix-ui/react-toast';
import { cva, type VariantProps } from 'class-variance-authority';
import { MdClose, MdInfo, MdCheckCircle, MdWarning, MdError } from 'react-icons/md';
import { motion, AnimatePresence } from '@/lib/motion-shim';
import { cn } from '@/lib/utils';

const ToastProvider = ToastPrimitives.Provider;

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn(
      'fixed z-[100] flex flex-col-reverse p-4 gap-3',
      'bottom-0 right-0 left-0 sm:left-auto sm:right-0 sm:top-auto',
      'w-full sm:max-w-[400px]',
      className,
    )}
    {...props}
  />
));
ToastViewport.displayName = ToastPrimitives.Viewport.displayName;

const toastVariants = cva(
  cn(
    'group pointer-events-auto relative flex w-full items-start gap-4 overflow-hidden',
    'rounded-2xl border p-5 pe-10 shadow-2xl',
    'backdrop-blur-xl transition-all duration-300',
    'data-[swipe=cancel]:translate-x-0',
    'data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)]',
    'data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)]',
    'data-[swipe=move]:transition-none',
    'data-[state=open]:animate-in data-[state=closed]:animate-out',
    'data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full',
    'data-[state=open]:slide-in-from-bottom-full data-[state=open]:sm:slide-in-from-bottom-full',
  ),
  {
    variants: {
      variant: {
        default: cn(
          'bg-white/95 border-gray-200/60 text-gray-900',
          'shadow-gray-200/50',
        ),
        destructive: cn(
          'bg-gradient-to-l from-red-50/95 to-rose-50/95 border-red-200/60 text-red-900',
          'shadow-red-200/30',
        ),
        success: cn(
          'bg-gradient-to-l from-emerald-50/95 to-teal-50/95 border-emerald-200/60 text-emerald-900',
          'shadow-emerald-200/30',
        ),
        info: cn(
          'bg-gradient-to-l from-blue-50/95 to-indigo-50/95 border-blue-200/60 text-blue-900',
          'shadow-blue-200/30',
        ),
        warning: cn(
          'bg-gradient-to-l from-amber-50/95 to-orange-50/95 border-amber-200/60 text-amber-900',
          'shadow-amber-200/30',
        ),
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export type ToastVariant = NonNullable<VariantProps<typeof toastVariants>['variant']>;

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> & VariantProps<typeof toastVariants>
>(({ className, variant, ...props }, ref) => {
  return (
    <ToastPrimitives.Root
      ref={ref}
      className={cn(toastVariants({ variant }), className)}
      {...props}
    />
  );
});
Toast.displayName = ToastPrimitives.Root.displayName;

const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Action
    ref={ref}
    className={cn(
      'inline-flex h-9 shrink-0 items-center justify-center rounded-xl',
      'border border-gray-200/60 bg-white/80 backdrop-blur-sm',
      'px-4 text-sm font-medium',
      'ring-offset-white transition-all duration-200',
      'hover:bg-gray-100 hover:border-gray-300',
      'focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2',
      'disabled:pointer-events-none disabled:opacity-50',
      className,
    )}
    {...props}
  />
));
ToastAction.displayName = ToastPrimitives.Action.displayName;

const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn(
      'absolute right-3 left-auto rtl:left-3 rtl:right-auto top-3',
      'rounded-xl p-1.5',
      'text-gray-400 opacity-70',
      'transition-all duration-200',
      'hover:text-gray-600 hover:opacity-100 hover:bg-gray-100/80',
      'focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-gray-300',
      'group-hover:opacity-100',
      className,
    )}
    toast-close=""
    {...props}
  >
    <MdClose className="h-4 w-4" />
  </ToastPrimitives.Close>
));
ToastClose.displayName = ToastPrimitives.Close.displayName;

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Title
    ref={ref}
    className={cn('text-sm font-semibold leading-tight', className)}
    {...props}
  />
));
ToastTitle.displayName = ToastPrimitives.Title.displayName;

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Description
    ref={ref}
    className={cn('text-sm opacity-80 leading-relaxed', className)}
    {...props}
  />
));
ToastDescription.displayName = ToastPrimitives.Description.displayName;

type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>;
type ToastActionElement = React.ReactElement<typeof ToastAction>;

export {
  type ToastProps,
  type ToastActionElement,
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
};

const iconVariants: Record<ToastVariant, { icon: React.ReactNode; bg: string }> = {
  default: {
    icon: <MdInfo className="h-5 w-5 text-gray-600" />,
    bg: 'bg-gray-100',
  },
  success: {
    icon: <MdCheckCircle className="h-5 w-5 text-emerald-600" />,
    bg: 'bg-emerald-100',
  },
  info: {
    icon: <MdInfo className="h-5 w-5 text-blue-600" />,
    bg: 'bg-blue-100',
  },
  warning: {
    icon: <MdWarning className="h-5 w-5 text-amber-600" />,
    bg: 'bg-amber-100',
  },
  destructive: {
    icon: <MdError className="h-5 w-5 text-red-600" />,
    bg: 'bg-red-100',
  },
};

export const ToastIcon: React.FC<{ variant?: ToastVariant }> = ({ variant = 'default' }) => {
  const config = iconVariants[variant];
  return (
    <div className={cn('flex-shrink-0 p-2 rounded-xl', config.bg)}>
      {config.icon}
    </div>
  );
};

export const AnimatedToast: React.FC<ToastProps> = (props) => (
  <AnimatePresence>
    {props.open && (
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.9, transition: { duration: 0.2 } }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      >
        <Toast {...props} />
      </motion.div>
    )}
  </AnimatePresence>
);
