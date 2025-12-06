'use client';

import type { TrendData } from '@/actions/reportActions';
import { cn } from '@/lib/utils';
import { Bookmark, Eye, Heart, MessageSquare, TrendingUp } from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from '@/components/ui/chart';

interface TrendChartProps {
  data: TrendData[];
  metric?: 'views' | 'engagement';
  isLoading?: boolean;
}

export function TrendChart({ data, metric = 'views', isLoading = false }: TrendChartProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl p-6 border border-gray-200 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-6" />
        <div className="h-80 bg-gray-200 rounded" />
      </div>
    );
  }

  // Format date for display
  const formattedData = data.map((item) => ({
    ...item,
    dateDisplay: new Date(item.date).toLocaleDateString('fa-IR', {
      month: 'short',
      day: 'numeric',
    }),
  }));

  const isViewsMetric = metric === 'views';

  return (
    <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-gray-200 shadow-lg">
      {/* Header */}
      <div className="flex items-start sm:items-center justify-between mb-4 sm:mb-6 gap-2">
        <div className="flex items-start sm:items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <div className="p-1.5 sm:p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg sm:rounded-xl flex-shrink-0">
            <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm sm:text-lg font-bold text-gray-900 truncate">
              {isViewsMetric ? 'روند بازدیدها' : 'روند تعاملات'}
            </h3>
            <p className="text-xs sm:text-sm text-gray-500 truncate">
              {isViewsMetric ? 'تعداد بازدید در طول زمان' : 'لایک، نظر و ذخیره در طول زمان'}
            </p>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-64 sm:h-80">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={formattedData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorLikes" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorComments" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorSaves" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="dateDisplay"
              stroke="#6b7280"
              style={{ fontSize: '12px', fontFamily: 'inherit' }}
            />
            <YAxis stroke="#6b7280" style={{ fontSize: '12px', fontFamily: 'inherit' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                padding: '12px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              }}
              labelStyle={{
                color: '#111827',
                fontWeight: 'bold',
                marginBottom: '8px',
              }}
            />
            <Legend
              wrapperStyle={{
                paddingTop: '20px',
                fontFamily: 'inherit',
              }}
              iconType="circle"
            />

            {isViewsMetric ? (
              <Area
                type="monotone"
                dataKey="views"
                stroke="#3b82f6"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorViews)"
                name="بازدیدها"
              />
            ) : (
              <>
                <Area
                  type="monotone"
                  dataKey="likes"
                  stroke="#ef4444"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorLikes)"
                  name="لایک‌ها"
                />
                <Area
                  type="monotone"
                  dataKey="comments"
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorComments)"
                  name="نظرات"
                />
                <Area
                  type="monotone"
                  dataKey="saves"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorSaves)"
                  name="ذخیره‌ها"
                />
              </>
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-gray-200">
        {isViewsMetric ? (
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-500 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] sm:text-xs text-gray-500 truncate">کل بازدید</p>
              <p className="text-xs sm:text-sm font-bold text-gray-900 truncate">
                {data.reduce((sum, item) => sum + item.views, 0).toLocaleString('fa-IR')}
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Heart className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-500 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] sm:text-xs text-gray-500 truncate">کل لایک</p>
                <p className="text-xs sm:text-sm font-bold text-gray-900 truncate">
                  {data.reduce((sum, item) => sum + item.likes, 0).toLocaleString('fa-IR')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] sm:text-xs text-gray-500 truncate">کل نظر</p>
                <p className="text-xs sm:text-sm font-bold text-gray-900 truncate">
                  {data.reduce((sum, item) => sum + item.comments, 0).toLocaleString('fa-IR')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Bookmark className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] sm:text-xs text-gray-500 truncate">کل ذخیره</p>
                <p className="text-xs sm:text-sm font-bold text-gray-900 truncate">
                  {data.reduce((sum, item) => sum + item.saves, 0).toLocaleString('fa-IR')}
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
