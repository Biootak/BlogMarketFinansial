'use client';

import type React from 'react';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { motion } from 'framer-motion';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const TrafficChart: React.FC = () => {
  const { data: trafficStats, error } = useSWR('/api/traffic-stats', fetcher, {
    refreshInterval: 60000, // Refresh every minute
  });

  if (error) return <div className="text-center py-4 text-red-500">خطا در بارگیری داده‌ها</div>;
  if (!trafficStats || !trafficStats.labels || !trafficStats.data) 
    return <div className="text-center py-4">در حال بارگیری...</div>;

  const chartData = trafficStats.labels.map((label: string, index: number) => ({
    name: label,
    بازدید: trafficStats.data[index],
  }));

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-grow min-h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <XAxis
              dataKey="name"
              stroke="currentColor"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              dy={10}
              className="text-gray-600 dark:text-gray-400"
            />
            <YAxis
              stroke="currentColor"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${value}`}
              className="text-gray-600 dark:text-gray-400"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'blur(4px)',
                border: 'none',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
              }}
              labelStyle={{ color: '#1F2937' }}
              itemStyle={{ color: '#4B5563' }}
            />
            <Bar
              dataKey="بازدید"
              fill="url(#colorGradient)"
              radius={[4, 4, 0, 0]}
              role="img"
              aria-label="نمودار ستونی بازدید"
            >
              {chartData.map((entry: any, index: number) => (
                <motion.rect
                  key={`bar-${index}`}
                  initial={{ y: 300, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.5, delay: index * 0.05 }}
                />
              ))}
            </Bar>
            <defs>
              <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.8} />
                <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0.3} />
              </linearGradient>
            </defs>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex justify-between items-center mt-4 text-sm">
        <div className="text-gray-700 dark:text-gray-300">
          <p className="font-semibold">
            بازدید امروز:{' '}
            <span className="text-purple-600 dark:text-purple-400">
              {trafficStats.todayViews.toLocaleString('fa-IR')}
            </span>
          </p>
        </div>
        <div className="text-gray-700 dark:text-gray-300">
          <p className="font-semibold">
            کل بازدیدها:{' '}
            <span className="text-purple-600 dark:text-purple-400">
              {trafficStats.totalViews.toLocaleString('fa-IR')}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default TrafficChart;
