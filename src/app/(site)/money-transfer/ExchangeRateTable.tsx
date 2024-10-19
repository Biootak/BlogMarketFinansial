import Image from 'next/image';
import Link from 'next/link';
import * as motion from 'framer-motion/client';
import * as Dialog from '@radix-ui/react-dialog';
import type { ExchangeRateData } from '@/types/types';
import { Icon } from '@/components/ui/icon';

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
          className="bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-800 dark:to-neutral-700 rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
        >
          <div className="p-4 flex items-center space-x-4 rtl:space-x-reverse">
            {rate.imageUrl && (
              <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 border-2 border-primary-300 dark:border-primary-600">
                <Image
                  src={rate.imageUrl}
                  alt={rate.name}
                  width={48}
                  height={48}
                  className="w-full h-full object-cover object-center"
                />
              </div>
            )}
            <div>
              <h3 className="font-semibold text-lg text-neutral-800 dark:text-neutral-100">
                {rate.name}
              </h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-300">{rate.currency}</p>
            </div>
          </div>
          <div className="bg-white/50 dark:bg-neutral-800/50 p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                خرید:
              </span>
              <span className="font-bold text-success-600 dark:text-success-400">
                {rate.buyRate}
              </span>
            </div>
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                فروش:
              </span>
              <span className="font-bold text-destructive-600 dark:text-destructive-400">
                {rate.sellRate}
              </span>
            </div>

            <div className="mt-2 flex space-x-2 rtl:space-x-reverse">
              <Dialog.Root>
                <Dialog.Trigger asChild>
                  <button
                    type="button"
                    className="flex-1 px-3 py-2 bg-neutral-200 text-neutral-800 rounded-md hover:bg-neutral-300 transition-colors text-sm font-medium"
                  >
                    اطلاعات بیشتر
                  </button>
                </Dialog.Trigger>
                <Dialog.Portal>
                  <Dialog.Overlay className="fixed inset-0 bg-black/60" />
                  <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-neutral-800 rounded-lg p-6 max-w-md w-full shadow-2xl">
                    <Dialog.Title className="text-2xl font-bold mb-4 text-neutral-900 dark:text-neutral-100">
                      {rate.name}
                    </Dialog.Title>
                    <Dialog.Description className="text-neutral-700 dark:text-neutral-300 mb-6">
                      {rate.description}
                    </Dialog.Description>
                    <Dialog.Close asChild>
                      <button
                        type="button"
                        className="absolute top-4 left-4 text-neutral-400 hover:text-neutral-600 dark:text-neutral-500 dark:hover:text-neutral-300"
                      >
                        <Icon name="X" className="size-6" />
                      </button>
                    </Dialog.Close>
                  </Dialog.Content>
                </Dialog.Portal>
              </Dialog.Root>
              <Link
                href="https://t.me/Financial_Market_telegram"
                className="flex-1 px-3 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600 transition-colors text-sm font-bold shadow-md hover:shadow-lg transform hover:-translate-y-0.5 text-center"
              >
                ثبت سفارش
              </Link>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
