'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { ExchangeRateData } from '@/types/types';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Info, TrendingUp, TrendingDown } from 'lucide-react';

interface ExchangeRateTableViewProps {
  exchangeRates: ExchangeRateData[];
}

export function ExchangeRateTableView({ exchangeRates }: ExchangeRateTableViewProps) {
  const formatDate = (date: string) => {
    return new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    }).format(new Date(date));
  };

  const buySellRates = exchangeRates.filter((rate) => rate.rateType === 'BUY_SELL');
  const singleBulkRates = exchangeRates.filter((rate) => rate.rateType !== 'BUY_SELL');

  const TableSection = ({
    title,
    rates,
    type,
  }: {
    title: string;
    rates: ExchangeRateData[];
    type: 'buySell' | 'singleBulk';
  }) => (
    <div className="relative">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            {type === 'buySell' ? (
              <TrendingUp className="w-5 h-5 text-white" />
            ) : (
              <TrendingDown className="w-5 h-5 text-white" />
            )}
          </div>
          <h2 className="text-lg lg:text-xl font-bold text-slate-800 dark:text-slate-100">
            {title}
          </h2>
        </div>
        {rates.length > 0 && rates[0]?.updatedAt && (
          <time
            className="text-xs px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 dark:text-slate-400"
            dateTime={new Date(rates[0].updatedAt).toISOString()}
          >
            {formatDate(new Date(rates[0].updatedAt).toISOString())}
          </time>
        )}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl sm:rounded-2xl border border-slate-200/50 dark:border-slate-700/50 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
        <div className="overflow-x-hidden">
          <Table className="w-full table-fixed">
            <TableHeader>
              <TableRow className="bg-gradient-to-r from-slate-50 to-slate-100/50 dark:from-slate-800/80 dark:to-slate-900/80 border-b border-slate-200/50 dark:border-slate-700/50">
                <TableHead className="w-[40px] sm:w-[50px] p-2 sm:p-3 lg:p-4 text-slate-600 dark:text-slate-300 font-semibold text-[10px] sm:text-xs lg:text-sm">
                  نماد
                </TableHead>
                <TableHead className="p-2 sm:p-3 lg:p-4 text-slate-600 dark:text-slate-300 font-semibold text-[10px] sm:text-xs lg:text-sm">
                  نام
                </TableHead>
                <TableHead className="hidden md:table-cell p-2 sm:p-3 lg:p-4 text-slate-600 dark:text-slate-300 font-semibold text-[10px] sm:text-xs lg:text-sm">
                  ارز
                </TableHead>
                <TableHead className="p-2 sm:p-3 lg:p-4 text-slate-600 dark:text-slate-300 font-semibold text-center text-[10px] sm:text-xs lg:text-sm">
                  {type === 'buySell' ? 'خرید' : 'پرچون'}
                </TableHead>
                <TableHead className="p-2 sm:p-3 lg:p-4 text-slate-600 dark:text-slate-300 font-semibold text-center text-[10px] sm:text-xs lg:text-sm">
                  {type === 'buySell' ? 'فروش' : 'عمده'}
                </TableHead>
                <TableHead className="hidden lg:table-cell p-2 sm:p-3 lg:p-4 text-slate-600 dark:text-slate-300 font-semibold text-[10px] sm:text-xs lg:text-sm">
                  توضیحات
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rates.map((rate, index) => (
                <motion.tr
                  key={rate.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="group border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors duration-200"
                >
                  <TableCell className="p-1.5 sm:p-2 lg:p-4">
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className="group/btn block focus-visible:outline-none relative">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 rounded-lg sm:rounded-xl border-2 border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm group-hover/btn:shadow-md group-hover/btn:border-blue-300 dark:group-hover/btn:border-blue-700 transition-all duration-200 bg-white dark:bg-slate-800 flex-shrink-0">
                            <Image
                              src={rate.imageUrl || '/images/placeholder-small.png'}
                              alt={rate.name}
                              width={48}
                              height={48}
                              className="object-cover w-full h-full"
                            />
                          </div>
                          <div className="lg:hidden absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                            <Info className="w-2.5 h-2.5 text-white" />
                          </div>
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[300px] p-0 lg:hidden border-0 shadow-2xl" align="center" sideOffset={12}>
                        <div className="overflow-hidden rounded-xl">
                          <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-blue-500 to-indigo-600">
                            <div className="w-14 h-14 rounded-xl border-2 border-white/20 overflow-hidden bg-white/10 backdrop-blur-sm">
                              <Image
                                src={rate.imageUrl || '/images/placeholder-small.png'}
                                alt={rate.name}
                                width={56}
                                height={56}
                                className="object-cover w-full h-full"
                              />
                            </div>
                            <div>
                              <span className="font-bold text-lg text-white block">{rate.name}</span>
                              <span className="text-sm text-blue-100">{rate.currency}</span>
                            </div>
                          </div>
                          <div className="p-4 bg-white dark:bg-slate-900 space-y-3">
                            <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800">
                              <span className="text-sm text-slate-500 dark:text-slate-400">
                                {type === 'buySell' ? 'نرخ خرید' : 'نرخ پرچون'}
                              </span>
                              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                {type === 'buySell' ? rate.buyRate : rate.singleRate || '---'}
                              </span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800">
                              <span className="text-sm text-slate-500 dark:text-slate-400">
                                {type === 'buySell' ? 'نرخ فروش' : 'نرخ عمده'}
                              </span>
                              <span className="font-bold text-rose-600 dark:text-rose-400">
                                {type === 'buySell' ? rate.sellRate : rate.bulkRate || '---'}
                              </span>
                            </div>
                            {rate.description && (
                              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed pt-2">
                                {rate.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </TableCell>
                  <TableCell className="p-2 lg:p-4 max-w-[100px] sm:max-w-[140px] lg:max-w-none">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-semibold text-slate-800 dark:text-slate-100 text-xs sm:text-sm lg:text-base line-clamp-2 leading-tight">
                        {rate.name}
                      </span>
                      <span className="md:hidden text-[10px] sm:text-xs px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full w-fit truncate max-w-[80px]">
                        {rate.currency}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell p-2 lg:p-4">
                    <span className="text-sm text-slate-500 dark:text-slate-400">{rate.currency}</span>
                  </TableCell>
                  <TableCell className="p-1.5 sm:p-2 lg:p-4 text-center">
                    <span className="inline-flex items-center justify-center min-w-[50px] sm:min-w-[60px] lg:min-w-[90px] px-2 sm:px-3 py-1.5 sm:py-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-lg sm:rounded-xl text-xs sm:text-sm lg:text-base font-bold">
                      {type === 'buySell' ? rate.buyRate : rate.singleRate || '---'}
                    </span>
                  </TableCell>
                  <TableCell className="p-1.5 sm:p-2 lg:p-4 text-center">
                    <span className="inline-flex items-center justify-center min-w-[50px] sm:min-w-[60px] lg:min-w-[90px] px-2 sm:px-3 py-1.5 sm:py-2 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-lg sm:rounded-xl text-xs sm:text-sm lg:text-base font-bold">
                      {type === 'buySell' ? rate.sellRate : rate.bulkRate || '---'}
                    </span>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell p-2 lg:p-4">
                    <span className="text-sm text-slate-400 dark:text-slate-500 line-clamp-2">
                      {rate.description || '---'}
                    </span>
                  </TableCell>
                </motion.tr>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-10 lg:space-y-12">
      {buySellRates.length > 0 && (
        <TableSection title="نرخ خرید و فروش" rates={buySellRates} type="buySell" />
      )}
      {singleBulkRates.length > 0 && (
        <TableSection title="نرخ پرچون و عمده" rates={singleBulkRates} type="singleBulk" />
      )}
    </div>
  );
}
