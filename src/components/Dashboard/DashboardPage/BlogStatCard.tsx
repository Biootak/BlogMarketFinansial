'use client';

import React from 'react';
import { motion } from 'framer-motion';

export interface BlogStatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'purple' | 'red' | 'orange';
  trend?: 'up' | 'down' | 'neutral';
  percentage?: number;
}

const colorConfig = {
  blue: {
    iconBg: 'bg-gradient-to-br from-blue-500 to-indigo-600',
    accent: 'from-blue-500 to-indigo-600',
  },
  green: {
    iconBg: 'bg-gradient-to-br from-emerald-500 to-teal-600',
    accent: 'from-emerald-500 to-teal-600',
  },
  purple: {
    iconBg: 'bg-gradient-to-br from-violet-500 to-purple-600',
    accent: 'from-violet-500 to-purple-600',
  },
  red: {
    iconBg: 'bg-gradient-to-br from-rose-500 to-pink-600',
    accent: 'from-rose-500 to-pink-600',
  },
  orange: {
    iconBg: 'bg-gradient-to-br from-orange-500 to-amber-600',
    accent: 'from-orange-500 to-amber-600',
  },
};

const BlogStatCard: React.FC<BlogStatCardProps> = ({
  title,
  value,
  icon,
  color,
  trend,
  percentage,
}) => {
  const config = colorConfig[color];
  
  const trendColor =
    trend === 'up'
      ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30'
      : trend === 'down'
        ? 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/30'
        : 'text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800';

  const trendIcon = trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="relative h-full bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-lg transition-shadow duration-300 overflow-hidden group"
    >
      {/* Bottom accent line */}
      <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${config.accent}`} />

      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <motion.div 
          whileHover={{ scale: 1.05, rotate: 5 }}
          transition={{ type: 'spring', stiffness: 400, damping: 17 }}
          className={`p-3 rounded-xl text-white shadow-lg ${config.iconBg}`}
        >
          {icon}
        </motion.div>
        
        {trend && percentage !== undefined && (
          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${trendColor}`}>
            {trendIcon} {percentage}%
          </span>
        )}
      </div>

      {/* Content */}
      <div className="space-y-1">
        <motion.span 
          className="block text-2xl font-bold text-slate-900 dark:text-white"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          {typeof value === 'number' ? value.toLocaleString('fa-IR') : value}
        </motion.span>
        <h3 className="text-slate-500 dark:text-slate-400 text-sm font-medium">
          {title}
        </h3>
      </div>
    </motion.div>
  );
};

export default React.memo(BlogStatCard);
