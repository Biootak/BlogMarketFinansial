'use client';

import { useEffect, useState } from 'react';
import {
  HiOutlineClock,
  HiOutlineCheckCircle,
  HiOutlineXCircle,
  HiOutlineArrowPath,
  HiOutlineRectangleStack,
  HiOutlineCalendarDays,
} from 'react-icons/hi2';
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
    icon: HiOutlineRectangleStack,
    gradient: 'from-blue-500 to-blue-600',
    iconBg: 'bg-blue-50 dark:bg-blue-900/20',
    textColor: 'text-blue-600 dark:text-blue-400',
    borderColor: 'border-blue-200/50 dark:border-blue-800/50',
  },
  {
    key: 'pending',
    label: 'در انتظار',
    icon: HiOutlineClock,
    gradient: 'from-amber-500 to-orange-500',
    iconBg: 'bg-amber-50 dark:bg-amber-900/20',
    textColor: 'text-amber-600 dark:text-amber-400',
    borderColor: 'border-amber-200/50 dark:border-amber-800/50',
  },
  {
    key: 'inProgress',
    label: 'در حال انجام',
    icon: HiOutlineArrowPath,
    gradient: 'from-indigo-500 to-violet-500',
    iconBg: 'bg-indigo-50 dark:bg-indigo-900/20',
    textColor: 'text-indigo-600 dark:text-indigo-400',
    borderColor: 'border-indigo-200/50 dark:border-indigo-800/50',
  },
  {
    key: 'completed',
    label: 'تکمیل شده',
    icon: HiOutlineCheckCircle,
    gradient: 'from-emerald-500 to-green-500',
    iconBg: 'bg-emerald-50 dark:bg-emerald-900/20',
    textColor: 'text-emerald-600 dark:text-emerald-400',
    borderColor: 'border-emerald-200/50 dark:border-emerald-800/50',
  },
  {
    key: 'cancelled',
    label: 'لغو شده',
    icon: HiOutlineXCircle,
    gradient: 'from-rose-500 to-red-500',
    iconBg: 'bg-rose-50 dark:bg-rose-900/20',
    textColor: 'text-rose-600 dark:text-rose-400',
    borderColor: 'border-rose-200/50 dark:border-rose-800/50',
  },
  {
    key: 'todayCount',
    label: 'امروز',
    icon: HiOutlineCalendarDays,
    gradient: 'from-purple-500 to-fuchsia-500',
    iconBg: 'bg-purple-50 dark:bg-purple-900/20',
    textColor: 'text-purple-600 dark:text-purple-400',
    borderColor: 'border-purple-200/50 dark:border-purple-800/50',
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
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="h-28 animate-pulse rounded-2xl border border-slate-200/50 bg-gradient-to-br from-slate-100 to-slate-50 dark:border-slate-700/50 dark:from-slate-800 dark:to-slate-900"
          />
        ))}
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
      {statCards.map((card, index) => (
        <div
          key={card.key}
          className="group relative"
          style={{ animationDelay: `${index * 50}ms` }}
        >
          {/* Card */}
          <div className={`relative overflow-hidden rounded-2xl border ${card.borderColor} bg-white/80 p-5 shadow-sm backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:bg-slate-900/80`}>
            <div className="flex items-start justify-between gap-3">
              {/* Icon */}
              <div className={`rounded-xl p-2.5 transition-transform duration-300 group-hover:scale-110 ${card.iconBg}`}>
                <card.icon className={`h-5 w-5 ${card.textColor}`} />
              </div>

              {/* Number */}
              <div className="text-left">
                <p className={`text-3xl font-black tabular-nums ${card.textColor}`}>
                  {stats[card.key as keyof Stats].toLocaleString('fa-IR')}
                </p>
              </div>
            </div>

            {/* Label */}
            <p className="mt-3 text-sm font-medium text-slate-600 dark:text-slate-400">
              {card.label}
            </p>

            {/* Bottom Gradient Line */}
            <div className="absolute bottom-0 left-4 right-4 h-0.5 overflow-hidden rounded-full">
              <div
                className={`h-full w-0 bg-gradient-to-l transition-all duration-500 group-hover:w-full ${card.gradient}`}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
