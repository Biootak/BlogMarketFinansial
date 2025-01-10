'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { ExchangeRateData } from '@/types/types';
import Image from 'next/image';

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

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base sm:text-xl font-bold text-slate-800 dark:text-slate-200">
            نرخ خرید و فروش
          </h2>
          {buySellRates && buySellRates.length > 0 && buySellRates[0]?.updatedAt && (
            <time
              className="text-xs text-slate-500 dark:text-slate-400"
              dateTime={new Date(buySellRates[0].updatedAt).toISOString()}
            >
              {formatDate(new Date(buySellRates[0].updatedAt).toISOString())}
            </time>
          )}
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
          <Table className="min-w-[350px] w-full border-separate border-spacing-0">
            <TableHeader>
              <TableRow className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800/90 dark:to-slate-900/90">
                <TableHead className="w-[40px] p-2 text-slate-600 dark:text-slate-300 first:rounded-tr-xl">
                  نماد
                </TableHead>
                <TableHead className="hidden md:table-cell w-[120px] p-2 text-slate-600 dark:text-slate-300">
                  نام
                </TableHead>
                <TableHead className="hidden md:table-cell w-[80px] p-2 text-slate-600 dark:text-slate-300">
                  ارز
                </TableHead>
                <TableHead className="md:hidden w-[140px] p-2 text-slate-600 dark:text-slate-300">
                  نام
                </TableHead>
                <TableHead className="w-[100px] p-2 text-slate-600 dark:text-slate-300 text-center">
                  خرید
                </TableHead>
                <TableHead className="w-[100px] p-2 text-slate-600 dark:text-slate-300 text-center">
                  فروش
                </TableHead>
                <TableHead className="w-[120px] p-2 text-slate-600 dark:text-slate-300 last:rounded-tl-xl">
                  توضیحات
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {buySellRates.map((rate) => (
                <TableRow
                  key={rate.id}
                  className="bg-white dark:bg-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/80 transition-colors duration-200"
                >
                  <TableCell className="p-1.5">
                    <div className="w-8 h-8 rounded-lg border-2 border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                      <Image
                        src={rate.imageUrl || '/images/placeholder-small.png'}
                        alt={rate.name}
                        width={32}
                        height={32}
                        className="object-cover w-full h-full"
                      />
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell p-1.5">
                    <span className="font-medium text-slate-700 dark:text-slate-200 text-sm">
                      {rate.name}
                    </span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell p-1.5">
                    <span className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-full border border-slate-200/70 dark:border-slate-700/70 font-medium">
                      {rate.currency}
                    </span>
                  </TableCell>
                  <TableCell className="md:hidden p-1.5">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium text-slate-700 dark:text-slate-200 text-[13px] md:text-sm">
                        {rate.name}
                      </span>
                      <span className="text-[9px] px-1.5 py-0.5 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-full border border-slate-200/70 dark:border-slate-700/70 font-medium">
                        {rate.currency}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="p-1.5 text-center">
                    <span className="inline-block min-w-[70px] md:min-w-[80px] text-[12px] md:text-sm font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50/40 dark:bg-emerald-900/20 px-2 py-1 rounded-lg border border-emerald-100/50 dark:border-emerald-800/50">
                      {rate.buyRate || '---'}
                    </span>
                  </TableCell>
                  <TableCell className="p-1.5 text-center">
                    <span className="inline-block min-w-[70px] md:min-w-[80px] text-[12px] md:text-sm font-medium text-rose-600 dark:text-rose-400 bg-rose-50/40 dark:bg-rose-900/20 px-2 py-1 rounded-lg border border-rose-100/50 dark:border-rose-800/50">
                      {rate.sellRate || '---'}
                    </span>
                  </TableCell>
                  <TableCell className="p-1.5">
                    <span className="text-[9px] md:text-xs text-slate-400 dark:text-slate-500 line-clamp-1">
                      {rate.description || '---'}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base sm:text-xl font-bold text-slate-800 dark:text-slate-200">
            نرخ پرچون و عمده
          </h2>
          {singleBulkRates && singleBulkRates.length > 0 && singleBulkRates[0]?.updatedAt && (
            <time
              className="text-xs text-slate-500 dark:text-slate-400"
              dateTime={new Date(singleBulkRates[0].updatedAt).toISOString()}
            >
              {formatDate(new Date(singleBulkRates[0].updatedAt).toISOString())}
            </time>
          )}
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
          <Table className="min-w-[350px] w-full border-separate border-spacing-0 mt-8">
            <TableHeader>
              <TableRow className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800/90 dark:to-slate-900/90">
                <TableHead className="w-[40px] p-2 text-slate-600 dark:text-slate-300 first:rounded-tr-xl">
                  نماد
                </TableHead>
                <TableHead className="hidden md:table-cell w-[120px] p-2 text-slate-600 dark:text-slate-300">
                  نام
                </TableHead>
                <TableHead className="hidden md:table-cell w-[80px] p-2 text-slate-600 dark:text-slate-300">
                  ارز
                </TableHead>
                <TableHead className="md:hidden w-[140px] p-2 text-slate-600 dark:text-slate-300">
                  نام
                </TableHead>
                <TableHead className="w-[100px] p-2 text-slate-600 dark:text-slate-300 text-center">
                  پرچون
                </TableHead>
                <TableHead className="w-[100px] p-2 text-slate-600 dark:text-slate-300 text-center">
                  عمده
                </TableHead>
                <TableHead className="w-[120px] p-2 text-slate-600 dark:text-slate-300 last:rounded-tl-xl">
                  توضیحات
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {singleBulkRates.map((rate) => (
                <TableRow
                  key={rate.id}
                  className="bg-white dark:bg-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/80 transition-colors duration-200"
                >
                  <TableCell className="p-1.5">
                    <div className="w-8 h-8 rounded-lg border-2 border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                      <Image
                        src={rate.imageUrl || '/images/placeholder-small.png'}
                        alt={rate.name}
                        width={32}
                        height={32}
                        className="object-cover w-full h-full"
                      />
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell p-1.5">
                    <span className="font-medium text-slate-700 dark:text-slate-200 text-sm">
                      {rate.name}
                    </span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell p-1.5">
                    <span className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-full border border-slate-200/70 dark:border-slate-700/70 font-medium">
                      {rate.currency}
                    </span>
                  </TableCell>
                  <TableCell className="md:hidden p-1.5">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium text-slate-700 dark:text-slate-200 text-[13px] md:text-sm">
                        {rate.name}
                      </span>
                      <span className="text-[9px] px-1.5 py-0.5 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-full border border-slate-200/70 dark:border-slate-700/70 font-medium">
                        {rate.currency}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="p-1.5 text-center">
                    <span className="inline-block min-w-[70px] md:min-w-[80px] text-[12px] md:text-sm font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50/40 dark:bg-indigo-900/20 px-2 py-1 rounded-lg border border-indigo-100/50 dark:border-indigo-800/50">
                      {rate.singleRate || '---'}
                    </span>
                  </TableCell>
                  <TableCell className="p-1.5 text-center">
                    <span className="inline-block min-w-[70px] md:min-w-[80px] text-[12px] md:text-sm font-medium text-violet-600 dark:text-violet-400 bg-violet-50/40 dark:bg-violet-900/20 px-2 py-1 rounded-lg border border-violet-100/50 dark:border-violet-800/50">
                      {rate.bulkRate || '---'}
                    </span>
                  </TableCell>
                  <TableCell className="p-1.5">
                    <span className="text-[9px] md:text-xs text-slate-400 dark:text-slate-500 line-clamp-1">
                      {rate.description || '---'}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
