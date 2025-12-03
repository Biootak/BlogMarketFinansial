import { type ButtonHTMLAttributes, type HTMLProps, forwardRef } from 'react';
import { Icon } from './icon';
import { cn } from '../Editor1/lib/utils';
import { Button, type ButtonProps } from './button';
import { Tooltip } from './tooltip';

type ToolbarWrapperProps = HTMLProps<HTMLDivElement>;

const ToolbarWrapper = forwardRef<HTMLDivElement, ToolbarWrapperProps>(
  ({ children, className, ...rest }, ref) => {
    return (
      <div
        ref={ref}
        {...rest}
        className={cn(
          'flex flex-shrink-0 select-none items-center gap-1 px-2 py-1 sticky top-0 left-0 z-50 w-full justify-between overflow-x-auto rounded-t-lg border-b border-b-border backdrop-blur drop-shadow-sm',
          className,
        )}
      >
        <div className="w-full overflow-hidden flex flex-wrap items-center">{children}</div>
      </div>
    );
  },
);

ToolbarWrapper.displayName = 'Toolbar';

export type ToolbarDividerProps = {
  horizontal?: boolean;
} & HTMLProps<HTMLDivElement>;

const ToolbarDivider = forwardRef<HTMLDivElement, ToolbarDividerProps>(
  ({ horizontal, className, ...rest }, ref) => {
    const dividerClassName = cn(
      'bg-zinc-200 dark:bg-slate-700',
      horizontal ? 'w-full min-w-[1.5rem] h-px my-1' : 'h-full min-h-[1.5rem] w-px mx-1',
      className,
    );

    return <div className={dividerClassName} ref={ref} {...rest} />;
  },
);

ToolbarDivider.displayName = 'ToolbarDivider';

export type ToolbarGroupProps = {} & HTMLProps<HTMLDivElement>;

const ToolbarGroup = forwardRef<HTMLDivElement, ToolbarDividerProps>(
  ({ className, ...rest }, ref) => {
    const groupClassName = cn('flex items-center gap-1 mx-1 first:ml-0 last:mr-0', className);

    return <div className={groupClassName} ref={ref} {...rest} />;
  },
);

ToolbarGroup.displayName = 'ToolbarGroup';

export type ToolbarButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
  activeClassname?: string;
  tooltip?: string;
  tooltipShortcut?: string[];
  buttonSize?: ButtonProps['size'];
  variant?: ButtonProps['variant'];
  isDropdown?: boolean;
};

const ToolbarButton = forwardRef<HTMLButtonElement, ToolbarButtonProps>(
  (
    {
      children,
      buttonSize = 'icon',
      variant = 'ghost',
      className,
      tooltip,
      tooltipShortcut,
      activeClassname = 'bg-primary-500/10 text-primary-600 hover:text-primary-700 hover:bg-primary-500/20',
      active,
      isDropdown,
      ...rest
    },
    ref,
  ) => {
    const buttonClass = cn(
      'min-w-8 w-auto h-8 bg-transparent rounded aria-expanded:bg-primary-500/10 aria-expanded:text-primary-600 focus-visible:ring-0',
      className,
      {
        [`${activeClassname}`]: active,
        'hover:bg-primary-50 text-primary-500 dark:text-primary-400 dark:hover:bg-primary-900/20': !active,
        'my-1': isDropdown,
      },
    );

    const component = (
      <Button className={buttonClass} variant={variant} size={buttonSize} ref={ref} {...rest}>
        {children}
        {isDropdown && <Icon name="ChevronDown" className="size-4 ml-0.5" />}
      </Button>
    );

    if (tooltip) {
      return <Tooltip>{component}</Tooltip>;
    }

    return component;
  },
);

ToolbarButton.displayName = 'ToolbarButton';

export type ToolbarSelectProps = HTMLProps<HTMLSelectElement> & {
  tooltip?: string;
};

const ToolbarSelect = forwardRef<HTMLSelectElement, ToolbarSelectProps>(
  ({ children, className, tooltip, ...rest }, ref) => {
    const selectClass = cn(
      'h-8 px-2 text-sm bg-transparent border border-gray-200 dark:border-gray-700 rounded',
      'hover:bg-primary-50 dark:hover:bg-primary-900/20',
      'focus:outline-none focus:ring-1 focus:ring-primary-500',
      'text-primary-600 dark:text-primary-400',
      className,
    );

    const component = (
      <select className={selectClass} ref={ref} {...rest}>
        {children}
      </select>
    );

    if (tooltip) {
      return <Tooltip>{component}</Tooltip>;
    }

    return component;
  },
);

ToolbarSelect.displayName = 'ToolbarSelect';

export const Toolbar = {
  Wrapper: ToolbarWrapper,
  Button: ToolbarButton,
  Divider: ToolbarDivider,
  Group: ToolbarGroup,
  Select: ToolbarSelect,
};
