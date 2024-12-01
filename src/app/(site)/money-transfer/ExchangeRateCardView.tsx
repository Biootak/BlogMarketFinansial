'use client';

import { motion } from 'framer-motion';
import type { ExchangeRateData } from '@/types/types';
import Image from 'next/image';

export function ExchangeRateCardView({ exchangeRates }: { exchangeRates: ExchangeRateData[] }) {
  const buySellRates = exchangeRates.filter((rate) => rate.rateType === 'BUY_SELL');
  const singleBulkRates = exchangeRates.filter((rate) => rate.rateType !== 'BUY_SELL');

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

  const RateSection = ({ title, rates, rateType }: { title: string, rates: ExchangeRateData[], rateType: 'BUY_SELL' | 'SINGLE_BULK' }) => (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">{title}</h2>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {rates.map((rate) => (
          <motion.div
            key={rate.id}
            variants={itemVariants}
            className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden border border-gray-100 dark:border-gray-700 shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-4">
              <div className="flex items-center gap-4">
                <div className="bg-white rounded-full w-12 h-12 flex items-center justify-center overflow-hidden border-2 border-white/20">
                  <Image
                    src={rate.imageUrl || '/images/placeholder-small.png'}
                    alt={rate.name}
                    width={40}
                    height={40}
                    className="object-cover"
                  />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">{rate.name}</h3>
                  <p className="text-sm text-orange-100">{rate.currency}</p>
                </div>
              </div>
            </div>
            
            <div className="p-4 space-y-4">
              {rateType === 'BUY_SELL' ? (
                <>
                  <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                    <span className="text-gray-600 dark:text-gray-400">نرخ خرید</span>
                    <span className="font-medium text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-3 py-1.5 rounded-md">
                      {rate.buyRate}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                    <span className="text-gray-600 dark:text-gray-400">نرخ فروش</span>
                    <span className="font-medium text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-1.5 rounded-md">
                      {rate.sellRate}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                    <span className="text-gray-600 dark:text-gray-400">نرخ پرچون</span>
                    <span className="font-medium text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-3 py-1.5 rounded-md">
                      {rate.singleRate}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                    <span className="text-gray-600 dark:text-gray-400">نرخ عمده</span>
                    <span className="font-medium text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-md">
                      {rate.bulkRate}
                    </span>
                  </div>
                </>
              )}
              {rate.description && (
                <div className="pt-2 text-sm text-gray-600 dark:text-gray-400">
                  {rate.description}
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );

  return (
    <div className="space-y-12">
      <RateSection title="نرخ خرید و فروش" rates={buySellRates} rateType="BUY_SELL" />
      <RateSection title="نرخ پرچون و عمده" rates={singleBulkRates} rateType="SINGLE_BULK" />
    </div>
  );
}
