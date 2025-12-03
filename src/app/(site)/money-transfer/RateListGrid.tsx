'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Calendar, Layers, ArrowUpDown } from 'lucide-react';

interface Rate {
  title: string;
  value: string | number;
}

interface RateList {
  id: string;
  title: string;
  rates: Rate[];
  isActive: boolean;
  updatedAt: string | Date;
}

interface RateListGridProps {
  rateLists: RateList[];
  initialCount?: number;
}

const formatDate = (date: string | Date) => {
  const d = new Date(date);
  const dateOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  };
  return new Intl.DateTimeFormat('fa-IR', dateOptions).format(d);
};

export default function RateListGrid({ rateLists, initialCount = 6 }: RateListGridProps) {
  const [displayCount, setDisplayCount] = useState(initialCount);
  const [expandedCards, setExpandedCards] = useState<{ [key: string]: number }>({});

  const hasMore = displayCount < rateLists.length;
  const initialRateCount = 8;

  const handleShowMore = (rateListId: string) => {
    setExpandedCards((prev) => ({
      ...prev,
      [rateListId]: (prev[rateListId] || initialRateCount) + 8,
    }));
  };

  return (
    <div>
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6"
      >
        <AnimatePresence>
          {rateLists.slice(0, displayCount).map((rateList, listIndex) => {
            const currentDisplayCount = expandedCards[rateList.id] || initialRateCount;
            const hasMoreRates = currentDisplayCount < rateList.rates.length;

            return (
              <motion.div
                key={rateList.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: listIndex * 0.05 }}
                className="group bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-slate-900/50 transition-all duration-300 overflow-hidden h-fit"
              >
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-white text-base sm:text-lg truncate flex-1 ml-2">
                      {rateList.title}
                    </h3>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/15 backdrop-blur-sm rounded-full flex-shrink-0">
                      <Calendar className="w-3 h-3 text-white/80" />
                      <span className="text-[10px] sm:text-xs text-white/90 font-medium">
                        {formatDate(rateList.updatedAt)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Table Header */}
                <div className="grid grid-cols-3 gap-2 px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400">
                    عنوان
                  </span>
                  <span className="text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 text-center">
                    خرید
                  </span>
                  <span className="text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 text-center">
                    فروش
                  </span>
                </div>

                {/* Rates */}
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  <AnimatePresence>
                    {rateList.rates.slice(0, currentDisplayCount).map((rate, index) => {
                      const hasBuySell = rate.value.toString().includes('|');
                      const buyValue = hasBuySell
                        ? rate.value.toString().split('|')[0]?.replace('خرید:', '').trim()
                        : rate.value;
                      const sellValue = hasBuySell
                        ? rate.value.toString().split('|')[1]?.replace('فروش:', '').trim()
                        : '---';

                      return (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: index * 0.02 }}
                          className="grid grid-cols-3 gap-2 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                        >
                          <span className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 truncate">
                            {rate.title}
                          </span>
                          <span className="text-xs sm:text-sm font-bold text-emerald-600 dark:text-emerald-400 text-center tabular-nums">
                            {buyValue || '---'}
                          </span>
                          <span className="text-xs sm:text-sm font-bold text-rose-600 dark:text-rose-400 text-center tabular-nums">
                            {sellValue}
                          </span>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>

                {/* Show More Button */}
                {hasMoreRates && (
                  <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={() => handleShowMore(rateList.id)}
                      className="w-full flex items-center justify-center gap-2 py-2 text-xs sm:text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
                    >
                      <span>نمایش بیشتر</span>
                      <ChevronDown className="w-4 h-4" />
                      <span className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 rounded text-[10px]">
                        +{rateList.rates.length - currentDisplayCount}
                      </span>
                    </button>
                  </div>
                )}

                {/* Footer */}
                <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5" />
                      <span>تعداد</span>
                    </div>
                    <span className="font-medium">{rateList.rates.length} نرخ</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </motion.div>

      {/* Load More Button */}
      {hasMore && (
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-8 sm:mt-10 text-center"
        >
          <button
            onClick={() => setDisplayCount((prev) => prev + 6)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-medium shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/30 transition-all duration-300"
          >
            <span>نمایش لیست‌های بیشتر</span>
            <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs">
              {rateLists.length - displayCount}
            </span>
          </button>
        </motion.div>
      )}
    </div>
  );
}
