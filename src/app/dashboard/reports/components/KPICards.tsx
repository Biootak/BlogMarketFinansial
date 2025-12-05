'use client';

import { Users, FileText, Eye, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { KPIData } from '@/actions/reportActions';

interface KPICardsProps {
  data: KPIData;
  isLoading?: boolean;
}

export function KPICards({ data, isLoading = false }: KPICardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-gray-200 animate-pulse"
          >
            <div className="h-10 sm:h-12 bg-gray-200 rounded mb-3 sm:mb-4" />
            <div className="h-6 sm:h-8 bg-gray-200 rounded mb-2" />
            <div className="h-3 sm:h-4 bg-gray-200 rounded w-2/3" />
          </div>
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: 'کل کاربران',
      value: data.totalUsers.toLocaleString('fa-IR'),
      growth: data.userGrowth,
      icon: Users,
      gradient: 'from-blue-500 to-indigo-600',
      bgGradient: 'from-blue-50 to-indigo-50',
    },
    {
      title: 'کل پست‌ها',
      value: (
        data.totalPosts.published +
        data.totalPosts.draft +
        data.totalPosts.pending
      ).toLocaleString('fa-IR'),
      subtitle: `منتشر شده: ${data.totalPosts.published.toLocaleString('fa-IR')}`,
      icon: FileText,
      gradient: 'from-emerald-500 to-teal-600',
      bgGradient: 'from-emerald-50 to-teal-50',
    },
    {
      title: 'کل بازدیدها',
      value: data.pageViews.toLocaleString('fa-IR'),
      subtitle: '(همه زمان‌ها)',
      icon: Eye,
      gradient: 'from-purple-500 to-pink-600',
      bgGradient: 'from-purple-50 to-pink-50',
    },
    {
      title: 'نرخ تعامل',
      value: `${data.engagementRate.toFixed(2)}%`,
      icon: TrendingUp,
      gradient: 'from-amber-500 to-orange-600',
      bgGradient: 'from-amber-50 to-orange-50',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
      {cards.map((card, index) => {
        const Icon = card.icon;
        const hasGrowth = card.growth !== undefined;
        const isPositive = hasGrowth && card.growth >= 0;

        return (
          <div
            key={index}
            className={cn(
              'relative overflow-hidden rounded-xl sm:rounded-2xl p-4 sm:p-6',
              'bg-gradient-to-br',
              card.bgGradient,
              'border border-gray-200',
              'shadow-lg hover:shadow-xl transition-all duration-300',
              'group'
            )}
          >
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-5">
              <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(0,0,0,0.05)_25%,rgba(0,0,0,0.05)_50%,transparent_50%,transparent_75%,rgba(0,0,0,0.05)_75%)] bg-[length:20px_20px]" />
            </div>

            {/* Content */}
            <div className="relative z-10">
              {/* Icon */}
              <div
                className={cn(
                  'inline-flex p-2 sm:p-3 rounded-lg sm:rounded-xl mb-3 sm:mb-4',
                  'bg-gradient-to-br',
                  card.gradient,
                  'shadow-lg group-hover:scale-110 transition-transform duration-300'
                )}
              >
                <Icon className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
              </div>

              {/* Title */}
              <h3 className="text-xs sm:text-sm font-medium text-gray-600 mb-1.5 sm:mb-2 truncate">
                {card.title}
              </h3>

              {/* Value */}
              <div className="flex items-baseline gap-1.5 sm:gap-2 mb-1.5 sm:mb-2 flex-wrap">
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 truncate">{card.value}</p>
                {hasGrowth && (
                  <span
                    className={cn(
                      'inline-flex items-center gap-0.5 sm:gap-1 text-xs sm:text-sm font-semibold whitespace-nowrap',
                      isPositive ? 'text-emerald-600' : 'text-red-600'
                    )}
                  >
                    {isPositive ? (
                      <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4" />
                    ) : (
                      <TrendingDown className="w-3 h-3 sm:w-4 sm:h-4" />
                    )}
                    {Math.abs(card.growth).toFixed(1)}%
                  </span>
                )}
              </div>

              {/* Subtitle */}
              {card.subtitle && (
                <p className="text-[10px] sm:text-xs text-gray-500 truncate">{card.subtitle}</p>
              )}
            </div>

            {/* Shine Effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
          </div>
        );
      })}
    </div>
  );
}
