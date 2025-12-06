'use client';

import type { ExchangeRateData } from '@/types/types';
import { AnimatePresence, motion } from 'framer-motion';
import { LayoutGrid, Table2 } from 'lucide-react';
import { useState } from 'react';
import { ExchangeRateCard } from './ExchangeRateCard';
import { ExchangeRateTableView } from './ExchangeRateTableView';

export function ExchangeRateTableWrapper({ exchangeRates }: { exchangeRates: ExchangeRateData[] }) {
  const [view, setView] = useState<'table' | 'card'>('table');

  return (
    <div className="space-y-8">
      {/* View Toggle */}
      <div className="flex justify-center">
        <div className="inline-flex items-center p-1.5 bg-slate-100 dark:bg-slate-800 rounded-2xl">
          <button
            onClick={() => setView('table')}
            className={`relative flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${
              view === 'table'
                ? 'text-white'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {view === 'table' && (
              <motion.div
                layoutId="viewToggle"
                className="absolute inset-0 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl shadow-lg shadow-blue-500/25"
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              />
            )}
            <Table2 className="w-4 h-4 relative z-10" />
            <span className="relative z-10">جدول</span>
          </button>
          <button
            onClick={() => setView('card')}
            className={`relative flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${
              view === 'card'
                ? 'text-white'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {view === 'card' && (
              <motion.div
                layoutId="viewToggle"
                className="absolute inset-0 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl shadow-lg shadow-blue-500/25"
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              />
            )}
            <LayoutGrid className="w-4 h-4 relative z-10" />
            <span className="relative z-10">کارت</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {view === 'table' ? (
          <motion.div
            key="table"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <ExchangeRateTableView exchangeRates={exchangeRates} />
          </motion.div>
        ) : (
          <motion.div
            key="card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6"
          >
            {exchangeRates.map((rate, index) => (
              <ExchangeRateCard key={rate.id} rate={rate} index={index} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
