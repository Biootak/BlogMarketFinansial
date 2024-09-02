'use client';

import type React from 'react';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface TrafficChartProps {
  data: number[];
  labels: string[];
}

const TrafficChart: React.FC<TrafficChartProps> = ({ data, labels }) => {
  const chartData = labels.map((label, index) => ({
    name: label,
    بازدید: data[index],
  }));

  return (
    <Card className="w-full h-[400px] p-4 bg-white dark:bg-gray-800 transition-colors duration-200">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          نمودار ترافیک
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <XAxis
              dataKey="name"
              stroke="currentColor"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              dy={10}
              className="text-gray-600 dark:text-gray-400"
            />
            <YAxis
              stroke="currentColor"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${value}`}
              dx={-10}
              className="text-gray-600 dark:text-gray-400"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--background)',
                border: 'none',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
              }}
              labelStyle={{ color: 'var(--foreground)' }}
              itemStyle={{ color: 'var(--foreground)' }}
            />
            <Bar
              dataKey="بازدید"
              fill="rgb(var(--c-primary-500))"
              radius={[4, 4, 0, 0]}
              role="img"
              aria-label="نمودار ستونی بازدید"
            >
              {chartData.map((entry, index) => (
                <motion.rect
                  key={`bar-${index}`}
                  initial={{ y: 300, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default TrafficChart;
