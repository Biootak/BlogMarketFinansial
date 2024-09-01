'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface BlogStatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'purple' | 'red' | 'orange';
  trend?: 'up' | 'down' | 'neutral';
  percentage?: number;
  detailedInfo?: React.ReactNode;
}

const colorVariants = {
  blue: 'from-blue-400 to-blue-600',
  green: 'from-green-400 to-green-600',
  purple: 'from-purple-400 to-purple-600',
  red: 'from-red-400 to-red-600',
  orange: 'from-orange-400 to-orange-600',
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
  detailedInfo,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const trendColor =
    trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-gray-500';

  return (
    <div className="relative">
      <motion.div
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
        className="bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-2xl shadow-lg 
                   border border-gray-100 dark:border-gray-700 cursor-pointer
                   hover:shadow-xl transition-all duration-300"
        onClick={() => setIsExpanded((prev) => !prev)}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0">
          <div className="flex items-center space-x-reverse space-x-4 sm:space-x-6">
            <motion.div
              whileHover={{ rotate: 15 }}
              className={`p-3 rounded-xl text-white shadow-md 
                          bg-gradient-to-br ${colorVariants[color]}`}
            >
              {icon}
            </motion.div>
            <div>
              <h3 className="text-gray-600 dark:text-gray-300 text-sm font-medium mb-2">{title}</h3>
              <motion.span
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-800 dark:text-white"
              >
                {value}
              </motion.span>
            </div>
          </div>
          {trend && percentage && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className={`text-sm sm:text-base font-medium flex items-center space-x-reverse space-x-1 ${trendColor}`}
            >
              <span>{trendIcons[trend]}</span>
              <span>{percentage}%</span>
            </motion.div>
          )}
        </div>
      </motion.div>
      <AnimatePresence>
        {isExpanded && detailedInfo && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute top-full right-0 left-0 mt-2 p-4 sm:p-6 
                       bg-white dark:bg-gray-800 rounded-xl shadow-lg z-10 
                       overflow-hidden border border-gray-100 dark:border-gray-700"
          >
            {detailedInfo}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default React.memo(BlogStatCard);
