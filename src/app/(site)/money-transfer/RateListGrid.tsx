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
}

interface RateListGridProps {
  rateLists: RateList[];
  initialCount?: number;
}

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
                className={`bg-white dark:bg-gray-800 rounded-xl overflow-hidden border border-gray-100 dark:border-gray-700 transform transition-all duration-300 ${
                  isHovered ? 'shadow-2xl scale-[1.02]' : 'shadow-lg hover:shadow-xl'
                }`}
              >
                <motion.div 
                  className="bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 p-5"
                  animate={{
                    background: isHovered 
                      ? 'linear-gradient(135deg, rgb(59, 130, 246) 0%, rgb(37, 99, 235) 50%, rgb(29, 78, 216) 100%)'
                      : 'linear-gradient(135deg, rgb(59, 130, 246) 0%, rgb(37, 99, 235) 100%)'
                  }}
                >
                  <div className="flex justify-between items-start">
                    <h3 className="text-xl font-bold text-white mb-2">
                      {rateList.title}
                    </h3>
                    <span className="px-3 py-1 bg-white/10 rounded-full text-xs font-medium text-blue-100">
                      {rateList.rates.length} نرخ فعال
                    </span>
                  </div>
                </motion.div>
                
                <div className="p-5">
                  <div className="space-y-3">
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
                          className="flex items-center justify-between py-2.5 border-b border-gray-100 dark:border-gray-700 last:border-0 group"
                        >
                          <span className="text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                            {rate.title}
                          </span>
                          <span className="font-semibold text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-700/50 px-3 py-1.5 rounded-full group-hover:bg-blue-50 dark:group-hover:bg-gray-700 transition-colors">
                            {rate.value}
                          </span>
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
                
                <div className="bg-gray-50/50 dark:bg-gray-700/30 px-5 py-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500 dark:text-gray-400">
                      آخرین به‌روزرسانی
                    </span>
                    <span className="text-gray-600 dark:text-gray-300 font-medium">
                      {new Date().toLocaleDateString('fa-IR')}
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
