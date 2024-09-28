import Image from 'next/image';
import * as motion from 'framer-motion/client';
import type { ExchangeRateData } from '@/types/types';

export default function ExchangeRateTable({
  exchangeRates,
}: {
  exchangeRates: ExchangeRateData[];
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {exchangeRates.map((rate, index) => (
        <motion.div
          key={rate.id}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: index * 0.05 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
        >
          <div className="p-4 flex items-center space-x-4 rtl:space-x-reverse">
            {rate.imageUrl && (
              <Image
                src={rate.imageUrl}
                alt={rate.name}
                width={48}
                height={48}
                className="rounded-full object-cover"
              />
            )}
            <div>
              <h3 className="font-semibold text-lg text-gray-800 dark:text-gray-100">
                {rate.name}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{rate.currency}</p>
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">خرید:</span>
              <span className="font-bold text-green-600 dark:text-green-400">
                {rate.buyRate.toLocaleString()} تومان
              </span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">فروش:</span>
              <span className="font-bold text-red-600 dark:text-red-400">
                {rate.sellRate.toLocaleString()} تومان
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">حداقل مبلغ:</span>
              <span className="font-medium text-blue-600 dark:text-blue-400">
                {rate.minimumAmount.toLocaleString()} {rate.currency}
              </span>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
