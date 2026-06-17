'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from '@/lib/motion-shim';
import { ChevronDown, Calendar, Layers, TrendingUp, TrendingDown } from 'lucide-react';
import { parseRateItem } from '@/lib/rateItem';

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

const isSingleRateList = (rates: Rate[]) => {
  if (rates.length === 0) return true;
  return !rates.some((rate) => String(rate.value).includes('|'));
};

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
    <div className="relative py-6 sm:py-8 lg:py-12">
      {/* Premium Ambient Background */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-blue-500/8 via-indigo-500/5 to-transparent rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-tr from-violet-500/8 via-purple-500/5 to-transparent rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-gradient-to-r from-cyan-500/3 via-blue-500/5 to-indigo-500/3 rounded-full blur-3xl" />
      </div>



      {/* Cards Grid */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className={`grid gap-4 sm:gap-6 lg:gap-8 ${
          rateLists.length <= 3 
            ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' 
            : rateLists.length === 4 
              ? 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-4' 
              : 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4'
        }`}
      >
        <AnimatePresence>
          {rateLists.slice(0, displayCount).map((rateList, listIndex) => {
            const currentDisplayCount = expandedCards[rateList.id] || initialRateCount;
            const hasMoreRates = currentDisplayCount < rateList.rates.length;
            const isSingle = isSingleRateList(rateList.rates);

            return (
              <motion.div
                key={rateList.id}
                initial={{ opacity: 0, y: 40, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                transition={{ 
                  delay: listIndex * 0.1,
                  type: 'spring',
                  stiffness: 120,
                  damping: 20
                }}
                className="group relative h-fit"
              >
                {/* Multi-layer Glow Effect */}
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-600/30 via-indigo-500/30 to-violet-600/30 rounded-[28px] blur-2xl opacity-0 group-hover:opacity-60 transition-all duration-700 ease-out" />
                <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500/20 to-violet-500/20 rounded-[26px] blur-xl opacity-0 group-hover:opacity-40 transition-all duration-500" />
                
                {/* Main Card Container */}
                <div className="relative bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl rounded-3xl border border-slate-200/80 dark:border-slate-700/50 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.08),0_8px_48px_-8px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_24px_-4px_rgba(0,0,0,0.4),0_8px_48px_-8px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_40px_-8px_rgba(59,130,246,0.15),0_16px_64px_-16px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_8px_40px_-8px_rgba(59,130,246,0.25),0_16px_64px_-16px_rgba(0,0,0,0.5)] transition-all duration-500 ease-out overflow-hidden transform-gpu hover:-translate-y-1">
                  
                  {/* Premium Header */}
                  <div className="relative overflow-hidden">
                    {/* Gradient Background */}
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700" />
                    
                    {/* Animated Mesh Pattern */}
                    <div className="absolute inset-0 opacity-20">
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.2)_0%,transparent_50%)]" />
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(255,255,255,0.15)_0%,transparent_40%)]" />
                    </div>
                    
                    {/* Subtle Grid Pattern */}
                    <div 
                      className="absolute inset-0 opacity-10"
                      style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23fff' fill-opacity='0.4' fill-rule='evenodd'%3E%3Cpath d='M0 40L40 0H20L0 20M40 40V20L20 40'/%3E%3C/g%3E%3C/svg%3E")`,
                        backgroundSize: '24px 24px'
                      }}
                    />
                    
                    <div className="relative px-5 py-6 sm:px-6 sm:py-7">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-extrabold text-white text-lg sm:text-xl leading-tight line-clamp-2 drop-shadow-sm">
                            {rateList.title}
                          </h3>
                        </div>
                        
                        {/* Date Badge */}
                        <div className="flex items-center gap-2 px-3.5 py-2 bg-white/15 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg shadow-black/5 flex-shrink-0 group-hover:bg-white/20 transition-colors duration-300">
                          <Calendar className="w-4 h-4 text-white/80" />
                          <span className="text-xs sm:text-sm text-white font-semibold whitespace-nowrap">
                            {formatDate(rateList.updatedAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Bottom Curve */}
                    <div className="absolute -bottom-px left-0 right-0 h-4 bg-white dark:bg-slate-900/90 rounded-t-[24px]" />
                  </div>

                  {/* Table Header */}
                  <div className={`grid gap-4 px-5 py-4 sm:px-6 bg-gradient-to-b from-slate-50/80 to-white dark:from-slate-800/60 dark:to-slate-900/40 ${isSingle ? 'grid-cols-2' : 'grid-cols-3'}`}>
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                      عنوان
                    </span>
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 text-center uppercase tracking-widest flex items-center justify-center gap-1.5">
                      {isSingle ? (
                        'قیمت'
                      ) : (
                        <>
                          <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                            <TrendingUp className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          </span>
                          خرید
                        </>
                      )}
                    </span>
                    {!isSingle && (
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400 text-center uppercase tracking-widest flex items-center justify-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-rose-100 dark:bg-rose-900/40 flex items-center justify-center">
                          <TrendingDown className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                        </span>
                        فروش
                      </span>
                    )}
                  </div>

                  {/* Rates List */}
                  <div className="divide-y divide-slate-100/80 dark:divide-slate-800/60">
                    <AnimatePresence>
                      {rateList.rates.slice(0, currentDisplayCount).map((rate, index) => {
                        const parsed = parseRateItem({ title: String(rate.title), value: String(rate.value) });
                        const buyDisplay = parsed.buy;
                        const sellDisplay = parsed.sell;

                        return (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, x: -15 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.025, duration: 0.3 }}
                            className={`grid gap-4 px-5 py-4 sm:px-6 sm:py-5 hover:bg-gradient-to-l hover:from-blue-50/70 hover:via-indigo-50/30 hover:to-transparent dark:hover:from-blue-950/30 dark:hover:via-indigo-950/20 dark:hover:to-transparent transition-all duration-300 cursor-default ${isSingle ? 'grid-cols-2' : 'grid-cols-3'}`}
                          >
                            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">
                              {rate.title}
                            </span>

                            {/* Buy Price */}
                            <div className="flex items-center justify-center">
                              <span className="inline-flex items-center px-3 py-1.5 bg-gradient-to-br from-emerald-50 to-emerald-100/80 dark:from-emerald-900/30 dark:to-emerald-800/20 text-emerald-700 dark:text-emerald-300 rounded-xl text-sm font-bold tabular-nums shadow-sm shadow-emerald-500/10 border border-emerald-200/50 dark:border-emerald-700/30">
                                {buyDisplay || '---'}
                              </span>
                            </div>

                            {/* Sell Price */}
                            {!isSingle && (
                              <div className="flex items-center justify-center">
                                <span className="inline-flex items-center px-3 py-1.5 bg-gradient-to-br from-rose-50 to-rose-100/80 dark:from-rose-900/30 dark:to-rose-800/20 text-rose-700 dark:text-rose-300 rounded-xl text-sm font-bold tabular-nums shadow-sm shadow-rose-500/10 border border-rose-200/50 dark:border-rose-700/30">
                                  {sellDisplay || '---'}
                                </span>
                              </div>
                            )}
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>

                  {/* Show More Button */}
                  {hasMoreRates && (
                    <div className="px-5 py-5 sm:px-6 border-t border-slate-100/80 dark:border-slate-800/60 bg-gradient-to-t from-slate-50/60 to-transparent dark:from-slate-800/40">
                      <button
                        onClick={() => handleShowMore(rateList.id)}
                        className="w-full flex items-center justify-center gap-3 py-3 text-sm font-bold text-blue-600 dark:text-blue-400 rounded-2xl bg-blue-50/50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 border border-blue-200/50 dark:border-blue-700/30 hover:border-blue-300 dark:hover:border-blue-600/50 transition-all duration-300 group/btn shadow-sm hover:shadow-md hover:shadow-blue-500/10"
                      >
                        <span>نمایش بیشتر</span>
                        <ChevronDown className="w-4 h-4 group-hover/btn:translate-y-1 transition-transform duration-300" />
                        <span className="px-2.5 py-1 bg-blue-500 text-white rounded-full text-xs font-bold shadow-sm">
                          +{rateList.rates.length - currentDisplayCount}
                        </span>
                      </button>
                    </div>
                  )}

                  {/* Premium Footer */}
                  <div className="px-5 py-4 sm:px-6 bg-gradient-to-b from-slate-50/90 to-slate-100/70 dark:from-slate-800/60 dark:to-slate-900/40 border-t border-slate-100/80 dark:border-slate-800/60">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white dark:bg-slate-800 rounded-xl shadow-md shadow-slate-200/50 dark:shadow-slate-900/50 border border-slate-100 dark:border-slate-700">
                          <Layers className="w-4 h-4 text-blue-500" />
                        </div>
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                          تعداد نرخ‌ها
                        </span>
                      </div>
                      <span className="px-3 py-1.5 bg-white dark:bg-slate-800 rounded-xl shadow-md shadow-slate-200/50 dark:shadow-slate-900/50 border border-slate-100 dark:border-slate-700 font-black text-sm text-slate-700 dark:text-slate-200">
                        {rateList.rates.length}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </motion.div>

      {/* Premium Load More Button */}
      {hasMore && (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="mt-12 sm:mt-16 text-center"
        >
          <button
            onClick={() => setDisplayCount((prev) => prev + 6)}
            className="group relative inline-flex items-center gap-4 px-10 py-5 overflow-hidden rounded-3xl font-bold text-white shadow-2xl shadow-blue-500/30 hover:shadow-[0_20px_60px_-15px_rgba(59,130,246,0.5)] transition-all duration-500 transform-gpu hover:-translate-y-1"
          >
            {/* Multi-layer Button Background */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600" />
            <div className="absolute inset-0 bg-gradient-to-r from-blue-700 via-indigo-700 to-violet-700 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            {/* Animated Shine */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <div className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-out bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12" />
            </div>
            
            {/* Inner Glow */}
            <div className="absolute inset-[1px] rounded-[22px] bg-gradient-to-b from-white/20 to-transparent opacity-50" />
            
            <span className="relative text-base sm:text-lg">نمایش لیست‌های بیشتر</span>
            <span className="relative px-4 py-1.5 bg-white/25 backdrop-blur-sm rounded-2xl text-sm font-black border border-white/20">
              {rateLists.length - displayCount}
            </span>
          </button>
        </motion.div>
      )}
    </div>
  );
}
