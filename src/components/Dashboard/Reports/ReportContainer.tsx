'use client';

import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface ReportContainerProps {
  children: ReactNode;
  gradient?: string;
}

export function ReportContainer({
  children,
  gradient = 'from-blue-500 to-indigo-600',
}: ReportContainerProps) {
  return (
    <main className="relative">
      {/* Multi-layer Glass Card */}
      <div className="relative">
        {/* Outer Glow */}
        <div
          className={cn(
            'absolute -inset-0.5 sm:-inset-1 bg-gradient-to-l rounded-2xl sm:rounded-3xl blur-lg sm:blur-xl opacity-20',
            gradient,
          )}
        />

        {/* Main Card */}
        <div
          className={cn(
            'relative overflow-hidden rounded-2xl sm:rounded-3xl',
            'bg-white/90 backdrop-blur-2xl',
            'border border-white/80 sm:border-2',
            'shadow-xl sm:shadow-2xl shadow-gray-400/20',
          )}
        >
          {/* Top Gradient Bar - Thicker & More Prominent */}
          <div className={cn('absolute top-0 inset-x-0 h-1 sm:h-1.5 bg-gradient-to-l', gradient)} />

          {/* Multi-layer Inner Glow */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/80 via-white/40 to-transparent pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-tr from-gray-50/50 to-transparent pointer-events-none" />

          {/* Content with Enhanced Spacing - Responsive */}
          <div className="relative p-4 sm:p-6 md:p-8 lg:p-12 min-h-[400px] sm:min-h-[500px] md:min-h-[600px]">
            {/* Content Wrapper with Fade-in Animation */}
            <div className="animate-in fade-in duration-500">{children}</div>
          </div>

          {/* Bottom Subtle Gradient */}
          <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
        </div>
      </div>
    </main>
  );
}
