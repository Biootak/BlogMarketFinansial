'use client';

import type React from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import useSWR from 'swr';
import { HiOutlineEye, HiOutlineCalendar, HiExclamation } from 'react-icons/hi';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// 2026-06-14: recharts is ~100KB. We split the file into two
// chunks: a small wrapper that owns the toolbar/data binding and
// a heavy inner that only loads when the chart is actually
// rendered. The wrapper renders a skeleton until recharts parses
// so the dashboard layout doesn't jump.
//
// We pass the chart data via window-level HOC since recharts'
// class components (Bar, BarChart, ...) carry attached statics
// (`defaultProps.layout`, etc.) that `next/dynamic`'s type
// signature doesn't accept one-by-one. Loading the whole module
// inside a dynamic() call side-steps that — the wrapper module
// just re-exports the parts we use.
const InnerChart = dynamic(() => import('./TrafficChartInner'), {
  ssr: false,
  loading: () => (
    <div className="h-[300px] animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800/50" />
  ),
});

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
  const { data: trafficStats, error, isLoading } = useSWR('/api/traffic-stats', fetcher, {
    refreshInterval: 60000,
  });

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center py-12">
        <div className="w-16 h-16 mb-4 rounded-2xl bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
          <HiExclamation className="w-8 h-8 text-rose-500" aria-hidden />
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
      <div className="flex-grow min-h-[300px]">
        <InnerChart data={chartData} tooltip={<CustomTooltip />} />
      </div>

      {/* Stats Footer */}
      <div className="flex flex-wrap justify-center gap-4 mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-900/20 dark:from-indigo-900/20 border border-violet-100 dark:border-violet-800/30"
        >
          <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-lg shadow-violet-500/30">
            <HiOutlineEye className="w-4 h-4" />
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
          <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30">
            <HiOutlineCalendar className="w-4 h-4" />
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
