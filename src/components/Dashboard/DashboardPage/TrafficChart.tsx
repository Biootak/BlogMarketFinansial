'use client';

import type React from 'react';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { motion } from 'framer-motion';

interface TrafficChartProps {
  data: number[];
  labels: string[];
  totalViews?: number;
  todayViews?: number;
}

const TrafficChart: React.FC<TrafficChartProps> = ({
  data,
  labels,
  totalViews = 0,
  todayViews = 0,
}) => {
  const chartData = labels.map((label, index) => ({
    name: label,
    بازدید: data[index],
  }));

  if (data.length === 0 || labels.length === 0) {
    return <div className="text-center py-4">داده‌ای برای نمایش وجود ندارد.</div>;
  }

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
              {chartData.map((entry, index) => (
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
              {(todayViews ?? 0).toLocaleString('fa-IR')}
            </span>
          </p>
        </div>
        <div className="text-gray-700 dark:text-gray-300">
          <p className="font-semibold">
            کل بازدیدها:{' '}
            <span className="text-purple-600 dark:text-purple-400">
              {(totalViews ?? 0).toLocaleString('fa-IR')}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default TrafficChart;
