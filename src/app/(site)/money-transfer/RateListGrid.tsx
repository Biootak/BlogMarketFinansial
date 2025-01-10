'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

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
  // تبدیل به تاریخ شمسی
  const dateOptions: Intl.DateTimeFormatOptions = { 
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };
  
  return new Intl.DateTimeFormat('fa-IR', dateOptions).format(d);
};

export default function RateListGrid({ rateLists, initialCount = 10 }: RateListGridProps) {
  const [displayCount, setDisplayCount] = useState(initialCount);
  const [expandedCards, setExpandedCards] = useState<{ [key: string]: number }>({});
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  const hasMore = displayCount < rateLists.length;

  const handleShowMore = (rateListId: string) => {
    setExpandedCards(prev => ({
      ...prev,
      [rateListId]: (prev[rateListId] || initialCount) + 10
    }));
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { 
      opacity: 1, 
      y: 0,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 15
      }
    }
  };

  return (
    <div>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
      >
        <AnimatePresence>
          {rateLists.slice(0, displayCount).map((rateList) => {
            const currentDisplayCount = expandedCards[rateList.id] || initialCount;
            const hasMoreRates = currentDisplayCount < rateList.rates.length;
            const isHovered = hoveredCard === rateList.id;
            
            return (
              <motion.div
                key={rateList.id}
                variants={itemVariants}
                layout
                onHoverStart={() => setHoveredCard(rateList.id)}
                onHoverEnd={() => setHoveredCard(null)}
                className={`bg-white dark:bg-gray-800 rounded-xl overflow-hidden border border-gray-100 dark:border-gray-700 transform transition-all duration-300 h-fit ${
                  isHovered 
                    ? 'shadow-[0_20px_35px_-10px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_35px_-10px_rgba(0,0,0,0.3)] scale-[1.02]' 
                    : 'shadow-[0_10px_30px_-15px_rgba(0,0,0,0.08)] dark:shadow-[0_10px_30px_-15px_rgba(0,0,0,0.25)] hover:shadow-[0_15px_30px_-12px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_15px_30px_-12px_rgba(0,0,0,0.3)]'
                }`}
              >
                <motion.div 
                  className="bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 p-3 relative"
                  animate={{
                    background: isHovered 
                      ? 'linear-gradient(135deg, rgb(59, 130, 246) 0%, rgb(37, 99, 235) 50%, rgb(29, 78, 216) 100%)'
                      : 'linear-gradient(135deg, rgb(59, 130, 246) 0%, rgb(37, 99, 235) 100%)'
                  }}
                >
                  <div className="flex justify-between items-center relative z-10">
                    <h3 className="text-xl font-bold text-white">
                      {rateList.title}
                    </h3>
                    <span className="px-3 py-1 bg-white/10 backdrop-blur-sm rounded-full text-xs font-medium text-blue-100">
                      {formatDate(rateList.updatedAt)}
                    </span>
                  </div>
                  {isHovered && (
                    <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent"></div>
                  )}
                </motion.div>
                
                <div className="p-3">
                  <div className="space-y-2">
                    <AnimatePresence>
                      {rateList.rates.slice(0, currentDisplayCount).map((rate, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          transition={{ 
                            type: "spring",
                            stiffness: 100,
                            damping: 15,
                            delay: index * 0.05 
                          }}
                          className="flex flex-col py-1.5 border-b border-gray-100 dark:border-gray-700 last:border-0 group"
                        >
                          {rate.value.toString().includes('|') ? (
                            <>
                              <span className="text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors text-center mb-1.5 font-medium">
                                {rate.title}
                              </span>
                              <div className="flex justify-between items-center gap-3">
                                <div className="flex-1 text-center">
                                  <span className="text-sm text-gray-500 dark:text-gray-400 mb-0.5 block">خرید</span>
                                  <span className="font-semibold text-gray-900 dark:text-gray-100 bg-gray-50/80 dark:bg-gray-700/50 px-2.5 py-1 rounded-lg transition-all duration-200 inline-block min-w-[90px] shadow-sm hover:shadow-md hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-700 dark:hover:text-emerald-400 hover:-translate-y-0.5">
                                    {rate.value.toString().split('|')[0]?.replace('خرید:', '').trim() || '---'}
                                  </span>
                                </div>
                                <div className="h-8 w-px bg-gray-200 dark:bg-gray-700 shadow-sm"></div>
                                <div className="flex-1 text-center">
                                  <span className="text-sm text-gray-500 dark:text-gray-400 mb-0.5 block">فروش</span>
                                  <span className="font-semibold text-gray-900 dark:text-gray-100 bg-gray-50/80 dark:bg-gray-700/50 px-2.5 py-1 rounded-lg transition-all duration-200 inline-block min-w-[90px] shadow-sm hover:shadow-md hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:text-rose-700 dark:hover:text-rose-400 hover:-translate-y-0.5">
                                    {rate.value.toString().split('|')[1]?.replace('فروش:', '').trim() || '---'}
                                  </span>
                                </div>
                              </div>
                            </>
                          ) : (
                            <div className="flex justify-between items-center py-0.5">
                              <span className="text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors font-medium">
                                {rate.title}
                              </span>
                              <span className="font-semibold text-gray-900 dark:text-gray-100 bg-gray-50/80 dark:bg-gray-700/50 px-2.5 py-1 rounded-lg transition-all duration-200 inline-block shadow-sm hover:shadow-md hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-700 dark:hover:text-blue-400 hover:-translate-y-0.5">
                                {rate.value}
                              </span>
                            </div>
                          )}
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                  
                  {hasMoreRates && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="mt-4 text-center"
                    >
                      <button
                        onClick={() => handleShowMore(rateList.id)}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors group"
                      >
                        <span>نمایش بیشتر</span>
                        <motion.span 
                          className="inline-block"
                          animate={{ y: [0, 3, 0] }}
                          transition={{ 
                            duration: 1.5,
                            repeat: Infinity,
                            ease: "easeInOut"
                          }}
                        >
                          <ChevronDown className="w-4 h-4" />
                        </motion.span>
                        <span className="text-sm text-gray-400 dark:text-gray-500">
                          ({rateList.rates.length - currentDisplayCount})
                        </span>
                      </button>
                    </motion.div>
                  )}
                </div>
                
                <div className="bg-gray-50/50 dark:bg-gray-700/30 px-3 py-2 mt-auto">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500 dark:text-gray-400">
                      تعداد نرخ‌ها
                    </span>
                    <span className="text-gray-600 dark:text-gray-300 font-medium">
                      {rateList.rates.length} نرخ
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </motion.div>

      {hasMore && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-10 text-center"
        >
          <button
            onClick={() => setDisplayCount(prev => prev + 10)}
            className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-full text-sm font-medium transition-all duration-300 transform hover:scale-105 hover:shadow-lg"
          >
            <span>نمایش لیست‌های بیشتر</span>
            <span className="px-2 py-0.5 bg-white/10 rounded-full text-xs">
              {rateLists.length - displayCount}
            </span>
          </button>
        </motion.div>
      )}
    </div>
  );
}
