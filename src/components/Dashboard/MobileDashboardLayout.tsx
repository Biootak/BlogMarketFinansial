'use client';

import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface MobileDashboardLayoutProps {
  children: React.ReactNode;
  sidebar: React.ReactNode;
  className?: string;
}

/**
 * Mobile Dashboard Layout
 * - Collapsible sidebar on mobile
 * - Full-width cards
 * - Single column forms
 */
export function MobileDashboardLayout({
  children,
  sidebar,
  className,
}: MobileDashboardLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className={cn('min-h-screen bg-neutral-50 dark:bg-neutral-900', className)}>
      {/* Mobile Header */}
      <div className="lg:hidden sticky top-0 z-40 bg-white dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700">
        <div className="flex items-center justify-between p-4">
          <h1 className="text-lg font-bold">داشبورد</h1>
          <button
            type="button"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700"
          >
            {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={cn(
            'fixed lg:sticky top-0 z-30 h-screen w-64 bg-white dark:bg-neutral-800 border-e border-neutral-200 dark:border-neutral-700 transition-transform duration-300',
            'lg:translate-x-0',
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          <div className="p-4 overflow-y-auto h-full">{sidebar}</div>
        </aside>

        {/* Backdrop */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-20 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 p-4 lg:p-6">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}

/**
 * Dashboard Card - Full width on mobile
 */
export function DashboardCard({
  children,
  title,
  className,
}: {
  children: React.ReactNode;
  title?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 p-4 lg:p-6',
        className
      )}
    >
      {title && <h2 className="text-lg font-bold mb-4">{title}</h2>}
      {children}
    </div>
  );
}

/**
 * Dashboard Form - Single column on mobile
 */
export function DashboardForm({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <form className={cn('space-y-4', className)}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">{children}</div>
    </form>
  );
}

/**
 * Dashboard Actions - Prioritized on mobile
 */
export function DashboardActions({
  primaryActions,
  secondaryActions,
  className,
}: {
  primaryActions: React.ReactNode;
  secondaryActions?: React.ReactNode;
  className?: string;
}) {
  const [showMore, setShowMore] = useState(false);

  return (
    <div className={cn('flex flex-col sm:flex-row gap-2', className)}>
      {/* Primary actions - always visible */}
      <div className="flex gap-2 flex-1">{primaryActions}</div>

      {/* Secondary actions - overflow menu on mobile */}
      {secondaryActions && (
        <>
          <button
            type="button"
            onClick={() => setShowMore(!showMore)}
            className="sm:hidden px-4 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600"
          >
            بیشتر
          </button>

          <div className={cn('sm:flex gap-2', showMore ? 'flex' : 'hidden')}>
            {secondaryActions}
          </div>
        </>
      )}
    </div>
  );
}
