'use client';

import type { CategoryStat } from '@/actions/reportActions';
import { Layers } from 'lucide-react';
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

interface CategoryDistributionProps {
  data: CategoryStat[];
  isLoading?: boolean;
}

const COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316', // orange
];

export function CategoryDistribution({ data, isLoading = false }: CategoryDistributionProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl p-6 border border-gray-200 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-6" />
        <div className="h-80 bg-gray-200 rounded" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-lg">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl">
            <Layers className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">توزیع دسته‌بندی‌ها</h3>
            <p className="text-sm text-gray-500">تعداد پست در هر دسته‌بندی</p>
          </div>
        </div>
        <div className="flex items-center justify-center h-80 text-gray-400">
          <p>داده‌ای برای نمایش وجود ندارد</p>
        </div>
      </div>
    );
  }

  // Prepare data for chart
  const chartData = data.map((item) => ({
    name: item.categoryName,
    value: item.postCount,
    percentage: item.percentage,
  }));

  return (
    <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-gray-200 shadow-lg">
      {/* Header */}
      <div className="flex items-start sm:items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
        <div className="p-1.5 sm:p-2 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg sm:rounded-xl flex-shrink-0">
          <Layers className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm sm:text-lg font-bold text-gray-900 truncate">توزیع دسته‌بندی‌ها</h3>
          <p className="text-xs sm:text-sm text-gray-500 truncate">تعداد پست در هر دسته‌بندی</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Pie Chart */}
        <div className="h-64 sm:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percentage }) => `${name} (${percentage.toFixed(1)}%)`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((_entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '12px',
                  padding: '12px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Category List */}
        <div className="space-y-2 sm:space-y-3">
          <h4 className="text-xs sm:text-sm font-semibold text-gray-700 mb-3 sm:mb-4">
            جزئیات دسته‌بندی‌ها
          </h4>
          <div className="space-y-1.5 sm:space-y-2 max-h-64 sm:max-h-72 overflow-y-auto">
            {data.map((category, index) => (
              <div
                key={category.categoryId}
                className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 rounded-lg sm:rounded-xl hover:bg-gray-100 transition-colors gap-2"
              >
                <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                  <div
                    className="w-3 h-3 sm:w-4 sm:h-4 rounded-full flex-shrink-0"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-xs sm:text-sm font-medium text-gray-900 truncate">
                    {category.categoryName}
                  </span>
                </div>
                <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
                  <span className="text-[10px] sm:text-sm text-gray-500 whitespace-nowrap">
                    {category.postCount.toLocaleString('fa-IR')} پست
                  </span>
                  <span className="text-xs sm:text-sm font-semibold text-gray-900 whitespace-nowrap">
                    {category.percentage.toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-gray-200">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          <div>
            <p className="text-[10px] sm:text-xs text-gray-500 truncate">کل دسته‌بندی‌ها</p>
            <p className="text-base sm:text-lg font-bold text-gray-900 truncate">
              {data.length.toLocaleString('fa-IR')}
            </p>
          </div>
          <div>
            <p className="text-[10px] sm:text-xs text-gray-500 truncate">کل پست‌ها</p>
            <p className="text-base sm:text-lg font-bold text-gray-900 truncate">
              {data.reduce((sum, item) => sum + item.postCount, 0).toLocaleString('fa-IR')}
            </p>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <p className="text-[10px] sm:text-xs text-gray-500 truncate">محبوب‌ترین</p>
            <p className="text-base sm:text-lg font-bold text-gray-900 truncate">
              {data[0]?.categoryName || '-'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
