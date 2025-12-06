'use client';

import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import { motion } from 'framer-motion';
import * as React from 'react';
import { FaCheck, FaChevronLeft, FaCircle } from 'react-icons/fa6';

import { cn } from '@/lib/utils';

const DropdownMenu = ({ modal = false, ...props }: DropdownMenuPrimitive.DropdownMenuProps) => (
  <DropdownMenuPrimitive.Root modal={modal} {...props} />
);
DropdownMenu.displayName = 'DropdownMenu';

const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;

const DropdownMenuGroup = DropdownMenuPrimitive.Group;

const DropdownMenuPortal = DropdownMenuPrimitive.Portal;

const DropdownMenuSub = DropdownMenuPrimitive.Sub;

const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup;

const DropdownMenuSubTrigger = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.SubTrigger>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubTrigger> & {
    inset?: boolean;
  }
>(({ className, inset, children, ...props }, ref) => (
  <DropdownMenuPrimitive.SubTrigger
    ref={ref}
    className={cn(
      'flex cursor-pointer select-none items-center rounded-xl px-3 py-2.5 text-sm font-medium outline-none transition-all duration-200 focus:bg-violet-50 dark:focus:bg-violet-900/30 data-[state=open]:bg-violet-50 dark:data-[state=open]:bg-violet-900/30',
      inset && 'p-8',
      className,
    )}
    {...props}
  >
    {children}
    <FaChevronLeft className="mr-auto h-3.5 w-3.5 opacity-60" />
  </DropdownMenuPrimitive.SubTrigger>
));
DropdownMenuSubTrigger.displayName = DropdownMenuPrimitive.SubTrigger.displayName;

const DropdownMenuSubContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.SubContent>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubContent>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.SubContent
    ref={ref}
    className={cn(
      'z-50 min-w-[180px] overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 backdrop-blur-xl p-2 text-slate-900 shadow-xl shadow-slate-200/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 dark:border-slate-700/80 dark:bg-slate-900/95 dark:text-slate-50 dark:shadow-slate-900/50',
      className,
    )}
    {...props}
  />
));
DropdownMenuSubContent.displayName = DropdownMenuPrimitive.SubContent.displayName;

const DropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(({ className, sideOffset = 8, ...props }, ref) => (
  <DropdownMenuPrimitive.Portal>
    <DropdownMenuPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        'z-50 min-w-[200px] overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 backdrop-blur-xl p-2 text-slate-900 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 dark:border-slate-700/80 dark:bg-slate-900/95 dark:text-slate-50',
        className,
      )}
      style={{
        boxShadow: `
          0 0 0 1px rgba(0,0,0,0.03),
          0 4px 6px -1px rgba(0,0,0,0.05),
          0 10px 15px -3px rgba(0,0,0,0.08),
          0 20px 25px -5px rgba(0,0,0,0.08)
        `,
      }}
      {...props}
    />
  </DropdownMenuPrimitive.Portal>
));
DropdownMenuContent.displayName = DropdownMenuPrimitive.Content.displayName;

const DropdownMenuItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> & {
    inset?: boolean;
  }
>(({ className, inset, ...props }, ref) => (
  <DropdownMenuPrimitive.Item
    ref={ref}
    className={cn(
      'relative flex cursor-pointer select-none items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium outline-none transition-all duration-200 focus:bg-gradient-to-r focus:from-violet-50 focus:to-purple-50 focus:text-violet-700 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 dark:focus:from-violet-900/30 dark:focus:to-purple-900/30 dark:focus:text-violet-300 hover:bg-gradient-to-r hover:from-slate-50 hover:to-slate-100 dark:hover:from-slate-800 dark:hover:to-slate-800/80',
      inset && 'pr-8',
      className,
    )}
    {...props}
  />
));
DropdownMenuItem.displayName = DropdownMenuPrimitive.Item.displayName;

const DropdownMenuCheckboxItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.CheckboxItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.CheckboxItem>
>(({ className, children, checked, ...props }, ref) => (
  <DropdownMenuPrimitive.CheckboxItem
    ref={ref}
    className={cn(
      'relative flex cursor-pointer select-none items-center rounded-xl py-2.5 pr-10 pl-3 text-sm font-medium outline-none transition-all duration-200 focus:bg-gradient-to-r focus:from-violet-50 focus:to-purple-50 focus:text-violet-700 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 dark:focus:from-violet-900/30 dark:focus:to-purple-900/30 dark:focus:text-violet-300',
      className,
    )}
    checked={checked}
    {...props}
  >
    <span className="absolute left-3 flex h-5 w-5 items-center justify-center rounded-md bg-violet-100 dark:bg-violet-900/50">
      <DropdownMenuPrimitive.ItemIndicator>
        <FaCheck className="h-3 w-3 text-violet-600 dark:text-violet-400" />
      </DropdownMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </DropdownMenuPrimitive.CheckboxItem>
));
DropdownMenuCheckboxItem.displayName = DropdownMenuPrimitive.CheckboxItem.displayName;

const DropdownMenuRadioItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.RadioItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.RadioItem>
>(({ className, children, ...props }, ref) => (
  <DropdownMenuPrimitive.RadioItem
    ref={ref}
    className={cn(
      'relative flex cursor-pointer select-none items-center rounded-xl py-2.5 pr-10 pl-3 text-sm font-medium outline-none transition-all duration-200 focus:bg-gradient-to-r focus:from-violet-50 focus:to-purple-50 focus:text-violet-700 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 dark:focus:from-violet-900/30 dark:focus:to-purple-900/30 dark:focus:text-violet-300',
      className,
    )}
    {...props}
  >
    <span className="absolute right-3 flex h-5 w-5 items-center justify-center rounded-full border-2 border-slate-300 dark:border-slate-600">
      <DropdownMenuPrimitive.ItemIndicator>
        <FaCircle className="h-2 w-2 fill-violet-600 dark:fill-violet-400" />
      </DropdownMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </DropdownMenuPrimitive.RadioItem>
));
DropdownMenuRadioItem.displayName = DropdownMenuPrimitive.RadioItem.displayName;

const DropdownMenuLabel = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label> & {
    inset?: boolean;
  }
>(({ className, inset, ...props }, ref) => (
  <DropdownMenuPrimitive.Label
    ref={ref}
    className={cn(
      'px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500',
      inset && 'pr-8',
      className,
    )}
    {...props}
  />
));
DropdownMenuLabel.displayName = DropdownMenuPrimitive.Label.displayName;

const DropdownMenuSeparator = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Separator
    ref={ref}
    className={cn(
      'my-2 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent dark:via-slate-700',
      className,
    )}
    {...props}
  />
));
DropdownMenuSeparator.displayName = DropdownMenuPrimitive.Separator.displayName;

const DropdownMenuShortcut = ({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) => {
  return (
    <span
      className={cn(
        'mr-auto text-[10px] font-medium tracking-widest text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded',
        className,
      )}
      {...props}
    />
  );
};
DropdownMenuShortcut.displayName = 'DropdownMenuShortcut';

const DropdownMenuItemWithIcon = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> & {
    icon: React.ReactNode;
  }
>(({ className, children, icon, ...props }, ref) => (
  <motion.div whileHover={{ x: 4 }} transition={{ duration: 0.15 }}>
    <DropdownMenuPrimitive.Item
      ref={ref}
      className={cn(
        'relative flex cursor-pointer select-none items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium outline-none transition-all duration-200 focus:bg-gradient-to-r focus:from-violet-50 focus:to-purple-50 focus:text-violet-700 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 dark:focus:from-violet-900/30 dark:focus:to-purple-900/30 dark:focus:text-violet-300',
        className,
      )}
      {...props}
    >
      <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
        {icon}
      </span>
      <span>{children}</span>
    </DropdownMenuPrimitive.Item>
  </motion.div>
));

DropdownMenuItemWithIcon.displayName = 'DropdownMenuItemWithIcon';

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuItemWithIcon,
};
