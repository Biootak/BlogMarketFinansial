'use client';

import { Input } from '@/components/ui/input';
import { heading, table, text } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import type * as React from 'react';
import { HiMagnifyingGlass } from 'react-icons/hi2';

interface DashboardPageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
}

/** @deprecated Use `PageHeader` from `@/components/Dashboard/primitives`. Will be removed in v3. */
export function DashboardPageHeader({ title, description, children }: DashboardPageHeaderProps) {
  return (
    <div className="mb-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1.5">
          <h1 className={heading.h1}>{title}</h1>
          {description && <p className={text.bodySm}>{description}</p>}
        </div>
        {children && <div className="flex flex-wrap items-center gap-3">{children}</div>}
      </div>
    </div>
  );
}

interface DashboardSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function DashboardSearchInput({
  value,
  onChange,
  placeholder = 'جستجو...',
  className,
}: DashboardSearchInputProps) {
  return (
    <div className={cn('relative', className)}>
      <Input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'h-10 sm:h-11 w-full min-w-[200px] sm:w-64',
          'rounded-xl border-neutral-200/60 bg-white/80 ps-10 pe-4 text-sm',
          'shadow-sm backdrop-blur-sm transition-all duration-200',
          'placeholder:text-neutral-400',
          'hover:border-neutral-300',
          'focus:border-primary-400 focus:bg-white focus:ring-2 focus:ring-primary-100',
          'dark:border-neutral-700/60 dark:bg-neutral-800/80',
          'dark:hover:border-neutral-600',
          'dark:focus:border-primary-500 dark:focus:ring-primary-900/30',
        )}
      />
      <HiMagnifyingGlass className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400 dark:text-neutral-500" />
    </div>
  );
}

interface DashboardTableContainerProps {
  children: React.ReactNode;
  className?: string;
}

export function DashboardTableContainer({ children, className }: DashboardTableContainerProps) {
  return (
    <div className={cn('dash-panel overflow-hidden', className)}>
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

interface DashboardTableProps {
  children: React.ReactNode;
  className?: string;
}

export function DashboardTable({ children, className }: DashboardTableProps) {
  return <table className={cn('w-full border-collapse text-sm', className)}>{children}</table>;
}

interface DashboardTableHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function DashboardTableHeader({ children, className }: DashboardTableHeaderProps) {
  return (
    <thead
      className={cn(
        'border-b border-neutral-200/60 bg-gradient-to-l from-neutral-50/80 to-neutral-100/80 dark:border-neutral-700/50 dark:from-neutral-800/80 dark:to-neutral-750/80',
        className,
      )}
    >
      {children}
    </thead>
  );
}

interface DashboardTableHeadProps {
  children: React.ReactNode;
  className?: string;
  hidden?: boolean;
}

export function DashboardTableHead({ children, className, hidden }: DashboardTableHeadProps) {
  return (
    <th className={cn(table.headerCell, hidden && 'hidden sm:table-cell', className)}>
      {children}
    </th>
  );
}

interface DashboardTableBodyProps {
  children: React.ReactNode;
  className?: string;
}

export function DashboardTableBody({ children, className }: DashboardTableBodyProps) {
  return (
    <tbody className={cn('divide-y divide-neutral-100 dark:divide-neutral-700/50', className)}>
      {children}
    </tbody>
  );
}

interface DashboardTableRowProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function DashboardTableRow({ children, className, onClick }: DashboardTableRowProps) {
  return (
    <tr
      onClick={onClick}
      className={cn(
        'group transition-all duration-200 hover:bg-gradient-to-l hover:from-primary-50/50 hover:to-transparent dark:hover:from-primary-900/20',
        onClick && 'cursor-pointer',
        className,
      )}
    >
      {children}
    </tr>
  );
}

interface DashboardTableCellProps {
  children: React.ReactNode;
  className?: string;
  hidden?: boolean;
}

export function DashboardTableCell({ children, className, hidden }: DashboardTableCellProps) {
  return (
    <td className={cn(table.cell, hidden && 'hidden sm:table-cell', className)}>{children}</td>
  );
}

// Status Badge Component
interface StatusBadgeProps {
  status: string;
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'default';
  className?: string;
}

const statusVariants = {
  success:
    'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-900/30 dark:text-emerald-400 dark:ring-emerald-400/20',
  warning:
    'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-900/30 dark:text-amber-400 dark:ring-amber-400/20',
  danger:
    'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-900/30 dark:text-red-400 dark:ring-red-400/20',
  info: 'bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-900/30 dark:text-blue-400 dark:ring-blue-400/20',
  default:
    'bg-neutral-100 text-neutral-700 ring-neutral-600/20 dark:bg-neutral-700/50 dark:text-neutral-300 dark:ring-neutral-400/20',
};

export function StatusBadge({ status, variant = 'default', className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset transition-all duration-200',
        statusVariants[variant],
        className,
      )}
    >
      {status}
    </span>
  );
}

// Action Button Component
interface ActionButtonProps {
  onClick: () => void;
  variant?: 'edit' | 'delete' | 'view';
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

const actionVariants = {
  edit: 'text-primary-600 hover:bg-primary-50 hover:text-primary-700 dark:text-primary-400 dark:hover:bg-primary-900/30 dark:hover:text-primary-300',
  delete:
    'text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/30 dark:hover:text-red-300',
  view: 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-700/50 dark:hover:text-neutral-300',
};

export function ActionButton({
  onClick,
  variant = 'view',
  children,
  className,
  disabled,
}: ActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50',
        actionVariants[variant],
        className,
      )}
    >
      {children}
    </button>
  );
}

// Primary Action Button (for Add New)
interface PrimaryActionButtonProps {
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
  type?: 'button' | 'submit';
}

export function PrimaryActionButton({
  onClick,
  children,
  className,
  type = 'button',
}: PrimaryActionButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={cn(
        'group inline-flex items-center gap-2 rounded-xl bg-gradient-to-l from-primary-500 to-primary-600 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-primary-500/25 transition-all duration-300 hover:from-primary-600 hover:to-primary-700 hover:shadow-xl hover:shadow-primary-500/30 active:scale-[0.98] dark:shadow-primary-900/30',
        className,
      )}
    >
      {children}
    </button>
  );
}

// Empty State Component
interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

/** @deprecated Use `EmptyState` from `@/components/Dashboard/primitives`. Will be removed in v3. */
export function EmptyState({
  title = 'موردی یافت نشد',
  description = 'هنوز هیچ موردی اضافه نشده است.',
  icon,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {icon && (
        <div className="mb-4 rounded-full bg-neutral-100 p-4 dark:bg-neutral-800">{icon}</div>
      )}
      <h3 className={[heading.h3, 'mb-2'].join(' ')}>{title}</h3>
      <p className={[text.bodySm, 'mb-6 max-w-sm'].join(' ')}>{description}</p>
      {action}
    </div>
  );
}

// Filter Select Component
