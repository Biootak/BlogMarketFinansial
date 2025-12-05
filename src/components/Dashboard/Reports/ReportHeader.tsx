'use client';

import { Sparkles, TrendingUp } from 'lucide-react';

interface ReportHeaderProps {
  title?: string;
  subtitle?: string;
  showStatus?: boolean;
}

export function ReportHeader({
  title = 'گزارش‌های سیستم',
  subtitle = 'مشاهده وضعیت لحظه‌ای، آمار تحلیلی و گزارش‌های جامع عملکرد سیستم',
  showStatus = true,
}: ReportHeaderProps) {
  return (
    <header className="relative">
      <div className="flex flex-col sm:flex-row sm:items-start lg:items-center justify-between gap-4 sm:gap-5 lg:gap-8">
        {/* Title Area */}
        <div className="flex-1 space-y-3 sm:space-y-4">
          <div className="flex items-start gap-3 sm:gap-4">
            {/* Icon with Multi-layer Glow - Responsive */}
            <div className="relative group flex-shrink-0">
              {/* Outer Glow Layers */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 rounded-xl sm:rounded-2xl blur-xl sm:blur-2xl opacity-30 group-hover:opacity-50 transition-opacity duration-500" />
              <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-xl sm:rounded-2xl blur-lg sm:blur-xl opacity-40 group-hover:opacity-60 transition-opacity duration-500" />

              {/* Icon Container */}
              <div className="relative p-3 sm:p-3.5 md:p-4 bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600 rounded-xl sm:rounded-2xl shadow-xl sm:shadow-2xl shadow-blue-500/30 group-hover:shadow-blue-500/50 transition-all duration-500 group-hover:scale-105">
                <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-white drop-shadow-lg" />

                {/* Shine Effect */}
                <div className="absolute inset-0 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-white/0 via-white/30 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              </div>

              {/* Floating Particles - Hidden on very small screens */}
              <div className="hidden sm:block absolute -top-1 -right-1 w-2 h-2 bg-blue-400 rounded-full animate-ping" />
              <div
                className="hidden sm:block absolute -bottom-1 -left-1 w-1.5 h-1.5 bg-purple-400 rounded-full animate-ping"
                style={{ animationDelay: '0.5s' }}
              />
            </div>

            {/* Text Content */}
            <div className="flex-1 min-w-0 space-y-2 sm:space-y-2.5">
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black bg-gradient-to-l from-gray-900 via-gray-800 to-gray-700 bg-clip-text text-transparent leading-tight tracking-tight">
                  {title}
                </h1>
                {showStatus && (
                  <span className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-[10px] sm:text-xs font-bold rounded-full shadow-lg shadow-emerald-500/30">
                    <TrendingUp className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    فعال
                  </span>
                )}
              </div>

              <p className="text-sm sm:text-base md:text-lg text-gray-600 font-medium leading-relaxed">
                {subtitle}
              </p>

              {/* Decorative Line */}
              <div className="flex items-center gap-1.5 sm:gap-2 pt-0.5 sm:pt-1">
                <div className="h-0.5 sm:h-1 w-12 sm:w-16 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full" />
                <div className="h-0.5 sm:h-1 w-6 sm:w-8 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full" />
                <div className="h-0.5 sm:h-1 w-3 sm:w-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
