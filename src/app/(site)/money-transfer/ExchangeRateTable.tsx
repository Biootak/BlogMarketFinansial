'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import type { ExchangeRateData } from '@/types/types';

export default function ExchangeRateTable({
  exchangeRates: initialRates,
}: {
  exchangeRates: ExchangeRateData[];
}) {
  const [rates, setRates] = useState(initialRates);

  useEffect(() => {
    const fetchRates = async () => {
      const response = await fetch('/api/exchange-rates');
      const newRates = await response.json();
      setRates(newRates);
    };

    const interval = setInterval(fetchRates, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {rates.map((rate, index) => (
        <motion.div
          key={rate.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.1 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 flex flex-col items-center hover:shadow-lg transition-shadow duration-300"
        >
          {rate.imageUrl && (
            <Image
              src={rate.imageUrl}
              alt={rate.name}
              width={64}
              height={64}
              className="rounded-full mb-4 object-cover"
            />
          )}
          <h3 className="font-medium text-lg text-gray-800 dark:text-gray-100 mb-2">
            {rate.name} ({rate.currency})
          </h3>
          <div className="flex flex-col items-center space-y-2 text-sm">
            <div className="bg-blue-100 dark:bg-blue-900 px-3 py-1 rounded-full">
              <span className="text-gray-600 dark:text-gray-400">خرید:</span>{' '}
              <span className="font-semibold">{rate.buyRate.toLocaleString()} تومان</span>
            </div>
            <div className="bg-green-100 dark:bg-green-900 px-3 py-1 rounded-full">
              <span className="text-gray-600 dark:text-gray-400">فروش:</span>{' '}
              <span className="font-semibold">{rate.sellRate.toLocaleString()} تومان</span>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
