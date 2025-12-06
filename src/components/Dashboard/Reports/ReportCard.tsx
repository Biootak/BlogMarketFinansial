'use client';

import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface ReportCardProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  isActive?: boolean;
  onClick?: () => void;
  gradient?: string;
  glowColor?: string;
}

export function ReportCard({
  icon: Icon,
  title,
  description,
  isActive = false,
  onClick,
  gradient = 'from-blue-500 to-indigo-600',
  glowColor = 'rgba(59, 130, 246, 0.5)',
}: ReportCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative flex items-center justify-center sm:justify-start gap-2 sm:gap-2.5 md:gap-3',
        'px-4 py-3 sm:px-5 sm:py-3.5 md:px-6 md:py-4',
        'rounded-xl sm:rounded-2xl font-bold text-xs sm:text-sm md:text-base',
        'transition-all duration-300 ease-out',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
        'group overflow-hidden',
        'flex-1 min-w-0 w-full',
      )}
    >
      {isActive ? (
        <>
          {/* Active State - Premium Gradient */}
          <div
            className={cn('absolute inset-0 bg-gradient-to-l', gradient, 'shadow-lg sm:shadow-xl')}
            style={{
              boxShadow: `0 4px 16px -4px ${glowColor}, 0 8px 32px -8px ${glowColor}`,
            }}
          />

          {/* Shine Animation */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />

          {/* Content */}
          <span className="relative z-10 flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 bg-white/20 rounded-lg sm:rounded-xl backdrop-blur-sm group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
            <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </span>
          <span className="relative z-10 text-white drop-shadow-sm truncate">{title}</span>

          {/* Pulse Effect */}
          <div className="absolute inset-0 rounded-xl sm:rounded-2xl bg-white/10 animate-pulse" />
        </>
      ) : (
        <>
          {/* Inactive State - Elegant Hover */}
          <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-white rounded-xl sm:rounded-2xl border border-gray-200/50 group-hover:border-gray-300 group-hover:shadow-md sm:group-hover:shadow-lg transition-all duration-300" />

          {/* Hover Gradient */}
          <div
            className={cn(
              'absolute inset-0 bg-gradient-to-l opacity-0 group-hover:opacity-10 transition-opacity duration-300 rounded-xl sm:rounded-2xl',
              gradient,
            )}
          />

          {/* Content */}
          <span className="relative z-10 flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 bg-gray-100 rounded-lg sm:rounded-xl group-hover:bg-gray-200 transition-all duration-300 group-hover:scale-110 flex-shrink-0">
            <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 group-hover:text-gray-800 transition-colors duration-300" />
          </span>
          <span className="relative z-10 text-gray-700 group-hover:text-gray-900 transition-colors duration-300 truncate">
            {title}
          </span>
        </>
      )}
    </button>
  );
}
