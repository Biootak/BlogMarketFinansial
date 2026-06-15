'use client';

import { memo } from 'react';
import { motion } from '@/lib/motion-shim';

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
    iconBg: 'from-blue-500 to-indigo-600',
    iconShadow: 'shadow-blue-500/30',
    accent: 'from-blue-500 to-indigo-600',
    glow: 'rgba(59,130,246,0.15)',
    lightBg: 'from-blue-50 to-indigo-50',
  },
  green: {
    iconBg: 'from-emerald-500 to-teal-600',
    iconShadow: 'shadow-emerald-500/30',
    accent: 'from-emerald-500 to-teal-600',
    glow: 'rgba(16,185,129,0.15)',
    lightBg: 'from-emerald-50 to-teal-50',
  },
  purple: {
    iconBg: 'from-violet-500 to-purple-600',
    iconShadow: 'shadow-violet-500/30',
    accent: 'from-violet-500 to-purple-600',
    glow: 'rgba(139,92,246,0.15)',
    lightBg: 'from-violet-50 to-purple-50',
  },
  red: {
    iconBg: 'from-rose-500 to-pink-600',
    iconShadow: 'shadow-rose-500/30',
    accent: 'from-rose-500 to-pink-600',
    glow: 'rgba(244,63,94,0.15)',
    lightBg: 'from-rose-50 to-pink-50',
  },
  orange: {
    iconBg: 'from-orange-500 to-amber-600',
    iconShadow: 'shadow-orange-500/30',
    accent: 'from-orange-500 to-amber-600',
    glow: 'rgba(249,115,22,0.15)',
    lightBg: 'from-orange-50 to-amber-50',
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
  
  const trendStyles = {
    up: {
      bg: 'bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/30 dark:to-green-900/30',
      text: 'text-emerald-600 dark:text-emerald-400',
      icon: '↑',
    },
    down: {
      bg: 'bg-gradient-to-r from-rose-50 to-pink-50 dark:from-rose-900/30 dark:to-pink-900/30',
      text: 'text-rose-600 dark:text-rose-400',
      icon: '↓',
    },
    neutral: {
      bg: 'bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-800 dark:to-gray-800',
      text: 'text-slate-500 dark:text-slate-400',
      icon: '→',
    },
  };

  const trendStyle = trend ? trendStyles[trend] : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -6, scale: 1.02 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="group relative h-full overflow-hidden"
    >
      {/* Card container */}
      <div 
        className="relative h-full bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 transition-all duration-500"
        style={{
          boxShadow: `
            0 0 0 1px rgba(0,0,0,0.03),
            0 2px 4px rgba(0,0,0,0.02),
            0 8px 16px rgba(0,0,0,0.04),
            0 16px 32px rgba(0,0,0,0.04)
          `,
        }}
      >
        {/* Hover glow effect */}
        <div 
          className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{ 
            background: `radial-gradient(circle at 30% 30%, ${config.glow}, transparent 70%)`,
          }}
        />

        {/* Top accent gradient */}
        <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${config.accent} rounded-t-3xl`} />

        {/* Header row */}
        <div className="relative flex items-start justify-between mb-5">
          {/* Icon with enhanced styling */}
          <motion.div 
            whileHover={{ scale: 1.1, rotate: 8 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
            className={`relative p-3.5 rounded-2xl bg-gradient-to-br ${config.iconBg} text-white shadow-xl ${config.iconShadow}`}
          >
            {/* Icon glow */}
            <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${config.iconBg} blur-lg opacity-40`} />
            <span className="relative">{icon}</span>
          </motion.div>
          
          {/* Trend badge */}
          {trendStyle && percentage !== undefined && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-bold ${trendStyle.bg} ${trendStyle.text} border border-current/10`}
            >
              <span className="text-[10px]">{trendStyle.icon}</span>
              <span>{percentage}%</span>
            </motion.div>
          )}
        </div>

        {/* Value and title */}
        <div className="relative space-y-1.5">
          <motion.div 
            className="text-3xl font-black text-slate-900 dark:text-white tracking-tight"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
          >
            {typeof value === 'number' ? value.toLocaleString('fa-IR') : value}
          </motion.div>
          <h3 className="text-slate-500 dark:text-slate-400 text-sm font-medium">
            {title}
          </h3>
        </div>

        {/* Decorative corner element */}
        <div className={`absolute bottom-0 right-0 w-24 h-24 bg-gradient-to-tl ${config.lightBg} dark:from-slate-800/50 dark:to-slate-900/50 rounded-tl-[60px] opacity-50 group-hover:opacity-80 transition-opacity duration-500`} />
      </div>
    </motion.div>
  );
};

export default memo(BlogStatCard);
