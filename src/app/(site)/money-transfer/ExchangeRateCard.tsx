'use client';

import Image from 'next/image';
import { motion } from '@/lib/motion-shim';
import type { ExchangeRateData } from '@/types/types';
import { Info, ExternalLink, TrendingUp, TrendingDown } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { useMediaQuery } from '@/hooks/use-media-query';

interface ExchangeRateCardProps {
  rate: ExchangeRateData;
  index: number;
}

export function ExchangeRateCard({ rate, index }: ExchangeRateCardProps) {
  const isMobile = useMediaQuery('(max-width: 640px)');

  const InfoIcon = () => (
    <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-slate-900/10 dark:bg-white/10 backdrop-blur-md flex items-center justify-center cursor-pointer hover:bg-slate-900/20 dark:hover:bg-white/20 transition-all duration-200 hover:scale-110">
      <Info className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-700 dark:text-white" />
    </div>
  );

  const InfoContent = () => (
    <div className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed max-w-[280px]">
      {rate.description || 'توضیحات موجود نیست'}
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
      className="group relative"
    >
      {/* Outer Glow */}
      <div className="absolute -inset-1 bg-gradient-to-br from-blue-500/20 via-indigo-500/20 to-violet-500/20 rounded-2xl sm:rounded-[28px] opacity-0 group-hover:opacity-100 blur-xl transition-all duration-700" />

      {/* Main Card */}
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl overflow-hidden border border-slate-200/80 dark:border-slate-700/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_20px_-4px_rgba(0,0,0,0.4)] group-hover:shadow-[0_16px_40px_-12px_rgba(59,130,246,0.2)] dark:group-hover:shadow-[0_16px_40px_-12px_rgba(59,130,246,0.15)] group-hover:border-blue-200 dark:group-hover:border-blue-800/50 transition-all duration-500 group-hover:-translate-y-1 sm:group-hover:-translate-y-2">
        
        {/* Top Gradient Bar */}
        <div className="h-1 sm:h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500" />

        {/* Info Button */}
        <div className="absolute top-3 sm:top-4 left-3 sm:left-4 z-10">
          {isMobile ? (
            <Dialog>
              <DialogTrigger asChild>
                <button type="button" aria-label="اطلاعات بیشتر">
                  <InfoIcon />
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-[90vw] sm:max-w-sm rounded-2xl mx-4">
                <div className="flex items-center gap-3 mb-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                  <div className="w-12 h-12 rounded-xl overflow-hidden border-2 border-slate-100 dark:border-slate-700 shadow-lg flex-shrink-0">
                    <Image
                      src={rate.imageUrl || '/images/placeholder-small.png'}
                      alt={rate.name}
                      width={48}
                      height={48}
                      className="object-cover w-full h-full"
                    />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-base text-slate-900 dark:text-white truncate">{rate.name}</h4>
                    <span className="text-sm text-slate-500 dark:text-slate-400">{rate.currency}</span>
                  </div>
                </div>
                <InfoContent />
              </DialogContent>
            </Dialog>
          ) : (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" aria-label="اطلاعات بیشتر">
                    <InfoIcon />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" align="start" className="max-w-[280px] rounded-xl">
                  <InfoContent />
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 lg:p-6 pt-3 sm:pt-4">
          {/* Currency Icon & Name */}
          <div className="flex flex-col items-center mb-4 sm:mb-5">
            <motion.div 
              className="relative mb-3 sm:mb-4"
              whileHover={{ scale: 1.08, rotate: 3 }}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              {/* Icon Background Glow */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-xl sm:rounded-2xl blur-lg opacity-20 group-hover:opacity-40 transition-opacity duration-300" />
              
              <div className="relative w-14 h-14 sm:w-16 sm:h-16 lg:w-20 lg:h-20 rounded-xl sm:rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 border-2 border-slate-200/50 dark:border-slate-600/50 shadow-lg flex items-center justify-center overflow-hidden">
                <Image
                  src={rate.imageUrl || '/images/placeholder-small.png'}
                  alt={rate.name}
                  width={64}
                  height={64}
                  className="object-contain w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14"
                />
              </div>
            </motion.div>

            <h3 className="font-bold text-base sm:text-lg lg:text-xl text-slate-900 dark:text-white text-center mb-1 line-clamp-1 px-2">
              {rate.name}
            </h3>
            <span className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 px-2 sm:px-3 py-0.5 sm:py-1 bg-slate-100 dark:bg-slate-800 rounded-full">
              {rate.currency}
            </span>
          </div>

          {/* Rates */}
          <div className="space-y-2 sm:space-y-2.5 mb-4 sm:mb-5">
            {rate.rateType === 'BUY_SELL' ? (
              <>
                <div className="flex items-center justify-between p-2.5 sm:p-3 lg:p-3.5 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-xl sm:rounded-2xl border border-emerald-100 dark:border-emerald-800/30 hover:shadow-sm transition-all duration-200">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <div className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                      <TrendingUp className="w-3 h-3 sm:w-3.5 sm:h-3.5 lg:w-4 lg:h-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <span className="text-xs sm:text-sm font-medium text-emerald-700 dark:text-emerald-300">خرید</span>
                  </div>
                  <span className="font-bold text-sm sm:text-base lg:text-lg text-emerald-600 dark:text-emerald-400 tabular-nums">
                    {rate.buyRate || '---'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-2.5 sm:p-3 lg:p-3.5 bg-gradient-to-r from-rose-50 to-pink-50 dark:from-rose-900/20 dark:to-pink-900/20 rounded-xl sm:rounded-2xl border border-rose-100 dark:border-rose-800/30 hover:shadow-sm transition-all duration-200">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <div className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 rounded-lg bg-rose-500/10 flex items-center justify-center flex-shrink-0">
                      <TrendingDown className="w-3 h-3 sm:w-3.5 sm:h-3.5 lg:w-4 lg:h-4 text-rose-600 dark:text-rose-400" />
                    </div>
                    <span className="text-xs sm:text-sm font-medium text-rose-700 dark:text-rose-300">فروش</span>
                  </div>
                  <span className="font-bold text-sm sm:text-base lg:text-lg text-rose-600 dark:text-rose-400 tabular-nums">
                    {rate.sellRate || '---'}
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between p-2.5 sm:p-3 lg:p-3.5 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl sm:rounded-2xl border border-blue-100 dark:border-blue-800/30 hover:shadow-sm transition-all duration-200">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <div className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-[10px] sm:text-xs font-bold text-blue-600 dark:text-blue-400">۱x</span>
                    </div>
                    <span className="text-xs sm:text-sm font-medium text-blue-700 dark:text-blue-300">پرچون</span>
                  </div>
                  <span className="font-bold text-sm sm:text-base lg:text-lg text-blue-600 dark:text-blue-400 tabular-nums">
                    {rate.singleRate || '---'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-2.5 sm:p-3 lg:p-3.5 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 rounded-xl sm:rounded-2xl border border-violet-100 dark:border-violet-800/30 hover:shadow-sm transition-all duration-200">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <div className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 rounded-lg bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-[10px] sm:text-xs font-bold text-violet-600 dark:text-violet-400">∞</span>
                    </div>
                    <span className="text-xs sm:text-sm font-medium text-violet-700 dark:text-violet-300">عمده</span>
                  </div>
                  <span className="font-bold text-sm sm:text-base lg:text-lg text-violet-600 dark:text-violet-400 tabular-nums">
                    {rate.bulkRate || '---'}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* CTA Button */}
          <motion.a
            href="#contact"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="relative w-full flex items-center justify-center gap-2 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl font-bold text-sm sm:text-base text-white overflow-hidden group/btn"
          >
            {/* Button Gradient Background */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500 transition-all duration-300" />
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300" />
            
            {/* Shine Effect */}
            <div className="absolute inset-0 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-500">
              <div className="absolute inset-0 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            </div>

            <span className="relative z-10">ثبت سفارش</span>
            <ExternalLink className="w-3.5 h-3.5 sm:w-4 sm:h-4 relative z-10 group-hover/btn:translate-x-1 transition-transform duration-200" />
          </motion.a>
        </div>
      </div>
    </motion.div>
  );
}
