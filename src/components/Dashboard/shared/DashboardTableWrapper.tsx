'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { HiMagnifyingGlass } from 'react-icons/hi2';
import { Input } from '@/components/ui/input';

interface DashboardPageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
}

export function DashboardPageHeader({ title, description, children }: DashboardPageHeaderProps) {
  return (
    <div className="mb-6 sm:mb-8">
      <div className="flex flex-col gap-4 sm:gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
            {title}
          </h1>
          {description && (
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">{description}</p>
          )}
        </div>
        {children && <div className="flex flex-wrap items-center gap-2 sm:gap-3">{children}</div>}
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
    <div className={cn('relative w-full sm:w-auto', className)}>
      <Input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 sm:h-11 w-full sm:min-w-[200px] rounded-xl border-neutral-200/60 bg-white/80 pl-9 sm:pl-10 pr-3 sm:pr-4 text-xs sm:text-sm shadow-sm backdrop-blur-sm transition-all duration-200 placeholder:text-neutral-400 hover:border-neutral-300 focus:border-primary-400 focus:bg-white focus:ring-2 focus:ring-primary-100 dark:border-neutral-700/60 dark:bg-neutral-800/80 dark:hover:border-neutral-600 dark:focus:border-primary-500 dark:focus:ring-primary-900/30"
      />
      <HiMagnifyingGlass className="absolute left-2.5 sm:left-3 top-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 -translate-y-1/2 text-neutral-400 dark:text-neutral-500" />
    </div>
  );
}


interface DashboardTableContainerProps {
  children: React.ReactNode;
  className?: string;
}

export function DashboardTableContainer({ children, className }: DashboardTableContainerProps) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl border border-neutral-200/60 bg-white/70 shadow-lg shadow-neutral-900/5 backdrop-blur-xl transition-all duration-200 dark:border-neutral-700/50 dark:bg-neutral-800/70 dark:shadow-neutral-900/20',
        className
      )}
    >
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

interface DashboardTableProps {
  children: React.ReactNode;
  className?: string;
}

export function DashboardTable({ children, className }: DashboardTableProps) {
  return (
    <table className={cn('w-full border-collapse text-sm', className)}>
      {children}
    </table>
  );
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
        className
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
    <th
      className={cn(
        'px-3 py-3 sm:px-5 sm:py-4 text-right text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-300',
        hidden && 'hidden sm:table-cell',
        className
      )}
    >
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
        className
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
    <td
      className={cn(
        'px-3 py-3 sm:px-5 sm:py-4 text-right text-xs sm:text-sm text-neutral-700 dark:text-neutral-300',
        hidden && 'hidden sm:table-cell',
        className
      )}
    >
      {children}
    </td>
  );
}


// Status Badge Component
interface StatusBadgeProps {
  status: string;
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'default';
  className?: string;
}

const statusVariants = {
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-900/30 dark:text-emerald-400 dark:ring-emerald-400/20',
  warning: 'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-900/30 dark:text-amber-400 dark:ring-amber-400/20',
  danger: 'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-900/30 dark:text-red-400 dark:ring-red-400/20',
  info: 'bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-900/30 dark:text-blue-400 dark:ring-blue-400/20',
  default: 'bg-neutral-100 text-neutral-700 ring-neutral-600/20 dark:bg-neutral-700/50 dark:text-neutral-300 dark:ring-neutral-400/20',
};

export function StatusBadge({ status, variant = 'default', className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 sm:px-2.5 sm:py-1 text-[10px] sm:text-xs font-medium ring-1 ring-inset transition-all duration-200',
        statusVariants[variant],
        className
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
  delete: 'text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/30 dark:hover:text-red-300',
  view: 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-700/50 dark:hover:text-neutral-300',
};

export function ActionButton({ onClick, variant = 'view', children, className, disabled }: ActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex items-center gap-1 sm:gap-1.5 rounded-lg px-2 py-1 sm:px-3 sm:py-1.5 text-[10px] sm:text-xs font-medium transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50',
        actionVariants[variant],
        className
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

export function PrimaryActionButton({ onClick, children, className, type = 'button' }: PrimaryActionButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={cn(
        'group inline-flex items-center gap-1.5 sm:gap-2.5 rounded-xl bg-gradient-to-l from-primary-500 to-primary-600 px-3 py-2 sm:px-5 sm:py-3 text-xs sm:text-sm font-semibold text-white shadow-lg shadow-primary-500/25 transition-all duration-150 hover:from-primary-600 hover:to-primary-700 hover:shadow-xl hover:shadow-primary-500/30 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 dark:shadow-primary-900/30 whitespace-nowrap',
        className
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

export function EmptyState({
  title = 'موردی یافت نشد',
  description = 'هنوز هیچ موردی اضافه نشده است.',
  icon,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 sm:py-16 text-center px-4">
      {icon && (
        <div className="mb-3 sm:mb-4 rounded-full bg-neutral-100 p-3 sm:p-4 dark:bg-neutral-800">
          {icon}
        </div>
      )}
      <h3 className="mb-1.5 sm:mb-2 text-base sm:text-lg font-semibold text-neutral-900 dark:text-neutral-100">{title}</h3>
      <p className="mb-4 sm:mb-6 max-w-sm text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">{description}</p>
      {action}
    </div>
  );
}

// Mobile Card View Component (for responsive tables)
interface MobileCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function MobileCard({ children, className, onClick }: MobileCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'block sm:hidden p-4 rounded-xl bg-white/80 dark:bg-neutral-800/80 border border-neutral-200/60 dark:border-neutral-700/50 shadow-sm hover:shadow-md transition-all duration-200',
        onClick && 'cursor-pointer active:scale-[0.98]',
        className
      )}
    >
      {children}
    </div>
  );
}

interface MobileCardRowProps {
  label: string;
  value: React.ReactNode;
  className?: string;
}

export function MobileCardRow({ label, value, className }: MobileCardRowProps) {
  return (
    <div className={cn('flex items-center justify-between py-2 border-b border-neutral-100 dark:border-neutral-700/50 last:border-0', className)}>
      <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">{label}</span>
      <div className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">{value}</div>
    </div>
  );
}

// Filter Select Component
interface FilterSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  className?: string;
}

export function FilterSelect({ value, onChange, options, placeholder, className }: FilterSelectProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const selectRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div ref={selectRef} className={cn('relative w-full sm:w-auto', className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex h-9 sm:h-11 w-full sm:min-w-[140px] items-center justify-between rounded-xl border border-neutral-200/60 bg-white/80 px-2.5 sm:px-3 text-xs sm:text-sm font-medium text-neutral-700 shadow-sm backdrop-blur-sm transition-all duration-200 hover:border-neutral-300 hover:bg-white focus:border-primary-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-100 dark:border-neutral-700/60 dark:bg-neutral-800/80 dark:text-neutral-300 dark:hover:border-neutral-600 dark:hover:bg-neutral-800 dark:focus:border-primary-500 dark:focus:bg-neutral-800 dark:focus:ring-primary-900/30',
          isOpen && 'border-primary-400 ring-2 ring-primary-100 dark:border-primary-500 dark:ring-primary-900/30'
        )}
      >
        <span className="truncate">{selectedOption?.label || placeholder}</span>
        <svg
          className={cn(
            'h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0 text-neutral-500 transition-transform duration-200 dark:text-neutral-400',
            isOpen && 'rotate-180'
          )}
          fill="none"
          viewBox="0 0 20 20"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="m6 8 4 4 4-4"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-60 overflow-auto rounded-xl border border-neutral-200/60 bg-white shadow-xl backdrop-blur-xl dark:border-neutral-700/50 dark:bg-neutral-800">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={cn(
                'flex w-full items-center px-2.5 sm:px-3 py-2 sm:py-2.5 text-right text-xs sm:text-sm font-medium transition-colors duration-150',
                value === option.value
                  ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
                  : 'text-neutral-700 hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-neutral-700/50'
              )}
            >
              <span className="flex-1 truncate">{option.label}</span>
              {value === option.value && (
                <svg
                  className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0 text-primary-600 dark:text-primary-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
