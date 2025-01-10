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

const colorVariants = {
  blue: 'from-blue-500 to-blue-700',
  green: 'from-green-500 to-green-700',
  purple: 'from-purple-500 to-purple-700',
  red: 'from-red-500 to-red-700',
  orange: 'from-orange-500 to-orange-700',
};

const trendIcons = {
  up: '↑',
  down: '↓',
  neutral: '→',
};

const BlogStatCard: React.FC<BlogStatCardProps> = ({
  title,
  value,
  icon,
  color,
  trend,
  percentage,
}) => {
  const trendColor =
    trend === 'up'
      ? 'text-green-500 dark:text-green-400'
      : trend === 'down'
        ? 'text-red-500 dark:text-red-400'
        : 'text-gray-500 dark:text-gray-400';

  return (
    <div className="relative h-full">
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
        className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-2xl shadow-lg h-full"
      >
        <div className="flex items-center justify-between mb-4">
          <motion.div
            whileHover={{ rotate: 15 }}
            className={`p-3 rounded-xl text-white shadow-md 
                      bg-gradient-to-br ${colorVariants[color]}`}
          >
            {icon}
          </motion.div>
          {trend && percentage && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className={`text-sm font-medium flex items-center space-x-1 ${trendColor}`}
            >
              <span aria-hidden="true">{trendIcons[trend]}</span>
              <span>{percentage}%</span>
            </motion.div>
          )}
        </div>
        <div>
          <h3 className="text-gray-600 dark:text-gray-300 text-sm font-medium mb-1">{title}</h3>
          <motion.span
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-2xl sm:text-xl font-bold text-gray-800 dark:text-white"
          >
            {typeof value === 'number' ? value.toLocaleString('fa-IR') : value}
          </motion.span>
        </div>
      </motion.div>
    </div>
  );
};

export default React.memo(BlogStatCard);
