import Image from 'next/image';
import Link from 'next/link';
import * as motion from 'framer-motion/client';
import type { ExchangeRateData } from '@/types/types';

import { Button } from '@/components/ui/button';
import { FaQuestionCircle } from 'react-icons/fa';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const MotionLink = motion.a;

export default function ExchangeRateTable({
  exchangeRates,
}: {
  exchangeRates: ExchangeRateData[];
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {exchangeRates.map((rate, index) => (
        <motion.div
          key={rate.id}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: index * 0.05 }}
          className="bg-gradient-to-b from-orange-300 to-orange-500 rounded-2xl shadow-lg overflow-hidden text-center relative"
        >
          <div className="absolute top-2 right-2 z-10">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="bg-white bg-opacity-20 backdrop-filter backdrop-blur-lg rounded-full p-1 cursor-pointer">
                    <FaQuestionCircle className="text-white text-xs" />
                  </div>
                </TooltipTrigger>
                <TooltipContent
                  side="bottom"
                  align="start"
                  className="bg-white text-black border border-orange-200 p-3 rounded-md shadow-md max-w-[250px] z-50"
                >
                  {rate.description}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <div className="p-4">
            <div className="bg-white rounded-full w-20 h-20 mx-auto mb-2 flex items-center justify-center overflow-hidden">
              <Image
                src={rate.imageUrl || '/images/placeholder-small.png'}
                alt={rate.name}
                width={80}
                height={80}
                className="object-cover"
              />
            </div>
            <h3 className="font-bold text-xl text-white mb-1">{rate.name}</h3>
            <p className="text-sm text-white mb-3">{rate.currency}</p>
            {rate.rateType === 'BUY_SELL' ? (
              <>
                <div className="bg-white/20 rounded-lg p-2 mb-2">
                  <span className="text-sm text-white">خرید: </span>
                  <span className="font-bold text-white">{rate.buyRate}</span>
                </div>
                <div className="bg-white/20 rounded-lg p-2 mb-3">
                  <span className="text-sm text-white">فروش: </span>
                  <span className="font-bold text-white">{rate.sellRate}</span>
                </div>
              </>
            ) : (
              <>
                <div className="bg-white/20 rounded-lg p-2 mb-2">
                  <span className="text-sm text-white">پرچون: </span>
                  <span className="font-bold text-white">{rate.singleRate}</span>
                </div>
                <div className="bg-white/20 rounded-lg p-2 mb-3">
                  <span className="text-sm text-white">عمده: </span>
                  <span className="font-bold text-white">{rate.bulkRate}</span>
                </div>
              </>
            )}
            <div className="flex items-center justify-center">
              <MotionLink
                href="https://t.me/Financial_Market_telegram"
                className="w-full py-2 px-4 bg-white bg-opacity-20 backdrop-filter backdrop-blur-lg text-white rounded-lg font-bold hover:bg-opacity-30 transition-all duration-300 flex items-center justify-center space-x-2"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <span>ثبت سفارش</span>
              </MotionLink>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
