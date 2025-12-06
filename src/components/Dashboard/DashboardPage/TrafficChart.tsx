'use client';

import { motion } from 'framer-motion';
import type React from 'react';
import { CalendarDays, Eye } from 'lucide-react';
import useSWR from 'swr';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from '@/components/ui/chart';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl px-4 py-3 rounded-xl shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50 border border-slate-100 dark:border-slate-700"
      >
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{label}</p>
        <p className="text-lg font-bold bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
          {payload[0].value.toLocaleString('fa-IR')} بازدید
        </p>
      </motion.div>
    );
  }
  return null;
};

const TrafficChart: React.FC = () => {
  const {
    data: trafficStats,
    error,
    isLoading,
  } = useSWR('/api/traffic-stats', fetcher, {
    refreshInterval: 60000,
  });

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center py-12">
        <div className="w-16 h-16 mb-4 rounded-2xl bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
          <span className="text-2xl">⚠️</span>
        </div>
        <p className="text-rose-600 dark:text-rose-400 font-medium">خطا در بارگیری داده‌ها</p>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">لطفاً دوباره تلاش کنید</p>
      </div>
    );
  }

  if (isLoading || !trafficStats || !trafficStats.labels || !trafficStats.data) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-4 border-violet-200 dark:border-violet-900 border-t-violet-600 animate-spin" />
        </div>
        <p className="mt-4 text-slate-500 dark:text-slate-400 text-sm">در حال بارگیری...</p>
      </div>
    );
  }

  const chartData = trafficStats.labels.map((label: string, index: number) => ({
    name: label,
    بازدید: trafficStats.data[index],
  }));

  return (
    <div className="w-full h-full flex flex-col">
      {/* Chart */}
      <div className="flex-grow min-h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 20, right: 10, left: -10, bottom: 5 }}>
            <defs>
              <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8B5CF6" stopOpacity={1} />
                <stop offset="50%" stopColor="#7C3AED" stopOpacity={0.9} />
                <stop offset="100%" stopColor="#6366F1" stopOpacity={0.7} />
              </linearGradient>
              <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow
                  dx="0"
                  dy="4"
                  stdDeviation="4"
                  floodColor="#8B5CF6"
                  floodOpacity="0.3"
                />
              </filter>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="currentColor"
              className="text-slate-200 dark:text-slate-700/50"
            />
            <XAxis
              dataKey="name"
              stroke="currentColor"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              dy={10}
              className="text-slate-500 dark:text-slate-400"
            />
            <YAxis
              stroke="currentColor"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value: any) => value.toLocaleString('fa-IR')}
              className="text-slate-500 dark:text-slate-400"
              dx={-5}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: 'rgba(139, 92, 246, 0.1)', radius: 8 }}
            />
            <Bar
              dataKey="بازدید"
              fill="url(#barGradient)"
              radius={[8, 8, 0, 0]}
              filter="url(#shadow)"
              role="img"
              aria-label="نمودار ستونی بازدید"
              maxBarSize={50}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Stats Footer */}
      <div className="flex flex-wrap justify-center gap-4 mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-900/20 dark:to-indigo-900/20 border border-violet-100 dark:border-violet-800/30"
        >
          <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-lg shadow-violet-500/30">
            <Eye className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">بازدید امروز</p>
            <p className="text-lg font-bold text-violet-700 dark:text-violet-300">
              {trafficStats.todayViews.toLocaleString('fa-IR')}
            </p>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border border-emerald-100 dark:border-emerald-800/30"
        >
          <div className="p-2 rounded-xl gradient-success-br text-white shadow-lg shadow-emerald-500/30">
            <CalendarDays className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">کل بازدیدها</p>
            <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">
              {trafficStats.totalViews.toLocaleString('fa-IR')}
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default TrafficChart;
