'use client';

import type React from 'react';
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

interface InnerChartProps {
  data: Array<Record<string, unknown>>;
  tooltip: React.ReactElement;
}

const TrafficChartInner: React.FC<InnerChartProps> = ({ data, tooltip }) => {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 20, right: 10, left: -10, bottom: 5 }}>
        <defs>
          <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8B5CF6" stopOpacity={1} />
            <stop offset="50%" stopColor="#7C3AED" stopOpacity={0.9} />
            <stop offset="100%" stopColor="#6366F1" stopOpacity={0.7} />
          </linearGradient>
          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#8B5CF6" floodOpacity="0.3" />
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
          tickFormatter={(value) => value.toLocaleString('fa-IR')}
          className="text-slate-500 dark:text-slate-400"
          dx={-5}
        />
        <Tooltip content={tooltip} cursor={{ fill: 'rgba(139, 92, 246, 0.1)', radius: 8 }} />
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
  );
};

export default TrafficChartInner;
