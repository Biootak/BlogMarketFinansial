import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const alertVariants = cva(
  [
    'group/alert relative w-full overflow-hidden rounded-xl border text-start',
    'p-4 pe-10',
    '[&>svg.icon]:absolute [&>svg.icon]:start-4 [&>svg.icon]:top-4',
    '[&>svg.icon]:size-5 [&>svg.icon]:shrink-0',
    '[&_.alert-body]:ps-9 [&_.alert-body]:block',
    // subtle gradient + soft inner highlight so it reads premium, not flat
    'shadow-[inset_0_1px_0_0_rgb(255_255_255/0.45)]',
    'dark:shadow-[inset_0_1px_0_0_rgb(255_255_255/0.04)]',
    // gentle entrance — works without JS
    'animate-in fade-in-0 slide-in-from-top-2 duration-300',
  ].join(' '),
  {
    variants: {
      variant: {
        default:
          'bg-neutral-50/90 text-neutral-900 border-neutral-200/80 [&>svg.icon]:text-neutral-500 dark:bg-neutral-900/60 dark:text-neutral-100 dark:border-neutral-800',
        primary:
          'bg-primary-50/90 text-primary-900 border-primary-200/80 [&>svg.icon]:text-primary-600 dark:bg-primary-950/40 dark:text-primary-100 dark:border-primary-900/60',
        secondary:
          'bg-secondary-50/90 text-secondary-900 border-secondary-200/80 [&>svg.icon]:text-secondary-600 dark:bg-secondary-950/40 dark:text-secondary-100 dark:border-secondary-900/60',
        destructive:
          'bg-destructive-50/90 text-destructive-900 border-destructive-200/80 [&>svg.icon]:text-destructive-600 dark:bg-destructive-950/40 dark:text-destructive-100 dark:border-destructive-900/60',
        success:
          'bg-emerald-50/90 text-emerald-900 border-emerald-200/80 [&>svg.icon]:text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-100 dark:border-emerald-900/60',
        info:
          'bg-sky-50/90 text-sky-900 border-sky-200/80 [&>svg.icon]:text-sky-600 dark:bg-sky-950/40 dark:text-sky-100 dark:border-sky-900/60',
        warning:
          'bg-amber-50/90 text-amber-900 border-amber-200/80 [&>svg.icon]:text-amber-600 dark:bg-amber-950/40 dark:text-amber-100 dark:border-amber-900/60',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

const iconFor = {
  default: Info,
  primary: Info,
  secondary: Info,
  destructive: AlertCircle,
  success: CheckCircle2,
  info: Info,
  warning: AlertTriangle,
} as const;

interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {
  /** allow callers to dismiss (×) the alert — shows a close button */
  onDismiss?: () => void;
  /** override the auto-picked icon */
  icon?: React.ReactNode;
  /** hide the leading icon entirely */
  hideIcon?: boolean;
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant, children, onDismiss, icon, hideIcon, ...props }, ref) => {
    const Icon = iconFor[variant ?? 'default'];
    return (
      <div
        ref={ref}
        role="alert"
        aria-live="polite"
        className={cn(alertVariants({ variant }), className)}
        {...props}
      >
        {!hideIcon && (
          <span aria-hidden className="icon">
            {icon ?? <Icon />}
          </span>
        )}
        <div className="alert-body">{children}</div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="بستن پیام"
            className={cn(
              'absolute end-3 top-3 inline-flex h-7 w-7 items-center justify-center rounded-md',
              'text-current/70 opacity-60 hover:opacity-100 hover:bg-black/5',
              'dark:hover:bg-white/10 transition',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current/40',
            )}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  },
);
Alert.displayName = 'Alert';

const AlertTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h5
      ref={ref}
      className={cn('mb-1 font-semibold leading-none tracking-tight', className)}
      {...props}
    />
  ),
);
AlertTitle.displayName = 'AlertTitle';

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('text-sm leading-relaxed [&_p]:leading-relaxed', className)}
    {...props}
  />
));
AlertDescription.displayName = 'AlertDescription';

export { Alert, AlertTitle, AlertDescription };