'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { HiClock, HiCheckCircle, HiXCircle, HiRefresh, HiCollection, HiCalendar } from 'react-icons/hi';
import { getServiceRequestStats } from '@/actions/serviceRequestActions';

interface Stats {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  cancelled: number;
  todayCount: number;
}

const statCards = [
  {
    key: 'total',
    label: 'کل درخواست‌ها',
    icon: HiCollection,
    gradient: 'from-blue-500 to-blue-600',
    bgGlow: 'bg-blue-500/20',
    iconBg: 'bg-blue-500/10',
    textColor: 'text-blue-600 dark:text-blue-400',
  },
  {
    key: 'pending',
    label: 'در انتظار',
    icon: HiClock,
    gradient: 'from-amber-500 to-orange-500',
    bgGlow: 'bg-amber-500/20',
    iconBg: 'bg-amber-500/10',
    textColor: 'text-amber-600 dark:text-amber-400',
  },
  {
    key: 'inProgress',
    label: 'در حال انجام',
    icon: HiRefresh,
    gradient: 'from-indigo-500 to-violet-500',
    bgGlow: 'bg-indigo-500/20',
    iconBg: 'bg-indigo-500/10',
    textColor: 'text-indigo-600 dark:text-indigo-400',
  },
  {
    key: 'completed',
    label: 'تکمیل شده',
    icon: HiCheckCircle,
    gradient: 'from-emerald-500 to-green-500',
    bgGlow: 'bg-emerald-500/20',
    iconBg: 'bg-emerald-500/10',
    textColor: 'text-emerald-600 dark:text-emerald-400',
  },
  {
    key: 'cancelled',
    label: 'لغو شده',
    icon: HiXCircle,
    gradient: 'from-rose-500 to-red-500',
    bgGlow: 'bg-rose-500/20',
    iconBg: 'bg-rose-500/10',
    textColor: 'text-rose-600 dark:text-rose-400',
  },
  {
    key: 'todayCount',
    label: 'امروز',
    icon: HiCalendar,
    gradient: 'from-purple-500 to-fuchsia-500',
    bgGlow: 'bg-purple-500/20',
    iconBg: 'bg-purple-500/10',
    textColor: 'text-purple-600 dark:text-purple-400',
  },
];

export default function ServiceRequestsStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      const result = await getServiceRequestStats();
      if (result.success && result.data) {
        setStats(result.data);
      }
      setLoading(false);
    }
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-5">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="h-28 bg-gradient-to-br from-neutral-100 to-neutral-50 dark:from-neutral-800 dark:to-neutral-900 rounded-2xl animate-pulse border border-neutral-200/50 dark:border-neutral-700/50"
          />
        ))}
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-5">
      {statCards.map((card, index) => (
        <motion.div
          key={card.key}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: index * 0.05 }}
          className="group relative"
        >
          {/* Glow Effect */}
          <div
            className={`absolute inset-0 ${card.bgGlow} rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
          />

          {/* Card */}
          <div className="relative bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl rounded-2xl p-5 border border-neutral-200/60 dark:border-neutral-700/60 shadow-sm hover:shadow-xl hover:shadow-neutral-200/50 dark:hover:shadow-neutral-900/50 transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-start justify-between gap-3">
              {/* Icon */}
              <div className={`p-2.5 rounded-xl ${card.iconBg} transition-transform duration-300 group-hover:scale-110`}>
                <card.icon className={`w-5 h-5 ${card.textColor}`} />
              </div>

              {/* Number */}
              <div className="text-left">
                <p className={`text-3xl font-black ${card.textColor} tabular-nums`}>
                  {stats[card.key as keyof Stats].toLocaleString('fa-IR')}
                </p>
              </div>
            </div>

            {/* Label */}
            <p className="mt-3 text-sm font-medium text-neutral-600 dark:text-neutral-400">
              {card.label}
            </p>

            {/* Bottom Gradient Line */}
            <div className="absolute bottom-0 left-4 right-4 h-0.5 rounded-full overflow-hidden">
              <div
                className={`h-full w-0 group-hover:w-full bg-gradient-to-l ${card.gradient} transition-all duration-500`}
              />
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
