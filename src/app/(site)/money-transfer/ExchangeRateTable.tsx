'use client';

import { useEffect, useState } from 'react';
import type { ExchangeRateData } from '@/types/types';
import { motion, AnimatePresence } from 'framer-motion';

type ExchangeRateTableProps = {
  exchangeRates: ExchangeRateData[];
};

export default function ExchangeRateTable({ exchangeRates: initialRates }: ExchangeRateTableProps) {
  const [rates, setRates] = useState(initialRates);

  useEffect(() => {
    const fetchRates = async () => {
      const response = await fetch('/api/exchange-rates');
      const newRates = await response.json();
      setRates(newRates);
    };

    const interval = setInterval(fetchRates, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="overflow-x-auto ">
      <table className="w-full text-sm text-right" dir="rtl">
        <thead className="text-xs uppercase bg-gray-50 dark:bg-gray-700">
          <tr>
            <th scope="col" className="px-6 py-3 text-gray-500 dark:text-gray-400">
              سرویس
            </th>
            <th scope="col" className="px-6 py-3 text-gray-500 dark:text-gray-400">
              ارز
            </th>
            <th scope="col" className="px-6 py-3 text-gray-500 dark:text-gray-400">
              خرید
            </th>
            <th scope="col" className="px-6 py-3 text-gray-500 dark:text-gray-400">
              فروش
            </th>
          </tr>
        </thead>
        <AnimatePresence>
          <tbody>
            {rates.map((rate, index) => (
              <motion.tr
                key={rate.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <th
                  scope="row"
                  className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap"
                >
                  {rate.service}
                </th>
                <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{rate.currency}</td>
                <td className="px-6 py-4 text-green-600 dark:text-green-400">
                  {rate.buyRate.toLocaleString()}
                </td>
                <td className="px-6 py-4 text-red-600 dark:text-red-400">
                  {rate.sellRate.toLocaleString()}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </AnimatePresence>
      </table>
    </div>
  );
}
