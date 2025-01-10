'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
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

        <div className="overflow-x-auto">
          <Table className="min-w-[280px] md:min-w-[350px] w-full border-separate border-spacing-0">
            <TableHeader>
              <TableRow className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800/90 dark:to-slate-900/90">
                <TableHead className="w-[28px] md:w-[40px] p-1 md:p-3 text-slate-600 dark:text-slate-300 first:rounded-tr-xl text-[10px] md:text-sm">
                  نماد
                </TableHead>
                <TableHead className="h-12 text-right align-middle font-medium [&:has([role=checkbox])]:pr-0 w-[50px] md:w-[140px] p-1 md:p-3 text-slate-600 dark:text-slate-300 text-[10px] md:text-sm">
                  نام
                </TableHead>
                <TableHead className="hidden md:table-cell h-12 text-right align-middle font-medium [&:has([role=checkbox])]:pr-0 w-[60px] p-1 md:p-3 text-slate-600 dark:text-slate-300 text-[10px] md:text-sm">
                  ارز
                </TableHead>
                <TableHead className="w-[50px] md:w-[100px] p-1 md:p-3 text-slate-600 dark:text-slate-300 text-center text-[10px] md:text-sm">
                  خرید
                </TableHead>
                <TableHead className="w-[50px] md:w-[100px] p-1 md:p-3 text-slate-600 dark:text-slate-300 text-center text-[10px] md:text-sm">
                  فروش
                </TableHead>
                <TableHead className="hidden md:table-cell w-[120px] p-1.5 md:p-3 text-slate-600 dark:text-slate-300 last:rounded-tl-xl text-sm">
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
                  <TableCell className="p-0.5 md:p-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className="group block w-full md:w-auto focus-visible:outline-none relative">
                          <div className="w-5 h-5 md:w-9 md:h-9 rounded border md:rounded-lg border md:border-2 border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm relative">
                            <Image
                              src={rate.imageUrl || '/images/placeholder-small.png'}
                              alt={rate.name}
                              width={36}
                              height={36}
                              className="object-cover w-full h-full"
                            />
                            <div className="md:hidden absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200" />
                            <div className="md:hidden absolute -top-0.5 -right-0.5 w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                          </div>
                        </button>
                      </PopoverTrigger>
                      <PopoverContent 
                        className="w-[280px] p-0 md:hidden border-0" 
                        align="center"
                        sideOffset={20}
                      >
                        <div className="flex flex-col">
                          <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-900 border-b border-slate-200 dark:border-slate-700">
                            <div className="w-10 h-10 rounded-lg border-2 border-slate-200 dark:border-slate-700 overflow-hidden">
                              <Image
                                src={rate.imageUrl || '/images/placeholder-small.png'}
                                alt={rate.name}
                                width={40}
                                height={40}
                                className="object-cover w-full h-full"
                              />
                            </div>
                            <div className="flex flex-col">
                              <span className="font-medium text-base text-slate-900 dark:text-slate-100">
                                {rate.name}
                              </span>
                              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                {rate.currency}
                              </span>
                            </div>
                          </div>
                          <div className="p-3 bg-white dark:bg-slate-900">
                            <div className="flex flex-col gap-2">
                              <div className="flex justify-between items-center">
                                <span className="text-xs text-slate-500 dark:text-slate-400">نرخ خرید:</span>
                                <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                  {rate.buyRate || '---'}
                                </span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-xs text-slate-500 dark:text-slate-400">نرخ فروش:</span>
                                <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                  {rate.sellRate || '---'}
                                </span>
                              </div>
                              <div className="h-px bg-slate-100 dark:bg-slate-800 my-1" />
                              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                                {rate.description || 'توضیحات موجود نیست'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </TableCell>
                  <TableCell className="p-0.5 md:p-2">
                    <div className="flex flex-col gap-0">
                      <span className="font-medium text-slate-700 dark:text-slate-200 text-[10px] md:text-sm break-words w-full">
                        {rate.name}
                      </span>
                      <span className="text-[8px] md:hidden px-0.5 md:px-1 py-px md:py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full w-fit leading-tight">
                        {rate.currency}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell p-0.5 md:p-2">
                    <span className="text-[10px] md:text-sm text-slate-600 dark:text-slate-400">
                      {rate.currency}
                    </span>
                  </TableCell>
                  <TableCell className="p-0.5 md:p-2 text-center">
                    <span className="inline-block min-w-[45px] md:min-w-[70px] text-[10px] md:text-sm font-medium text-slate-700 dark:text-slate-200">
                      {rate.buyRate || '---'}
                    </span>
                  </TableCell>
                  <TableCell className="p-0.5 md:p-2 text-center">
                    <span className="inline-block min-w-[45px] md:min-w-[70px] text-[10px] md:text-sm font-medium text-slate-700 dark:text-slate-200">
                      {rate.sellRate || '---'}
                    </span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell p-1 md:p-2">
                    <span className="text-xs text-slate-400 dark:text-slate-500 line-clamp-1">
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

        <div className="overflow-x-auto">
          <Table className="min-w-[280px] md:min-w-[350px] w-full border-separate border-spacing-0 mt-8">
            <TableHeader>
              <TableRow className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800/90 dark:to-slate-900/90">
                <TableHead className="w-[28px] md:w-[40px] p-1 md:p-3 text-slate-600 dark:text-slate-300 first:rounded-tr-xl text-[10px] md:text-sm">
                  نماد
                </TableHead>
                <TableHead className="h-12 text-right align-middle font-medium [&:has([role=checkbox])]:pr-0 w-[50px] md:w-[140px] p-1 md:p-3 text-slate-600 dark:text-slate-300 text-[10px] md:text-sm">
                  نام
                </TableHead>
                <TableHead className="hidden md:table-cell h-12 text-right align-middle font-medium [&:has([role=checkbox])]:pr-0 w-[60px] p-1 md:p-3 text-slate-600 dark:text-slate-300 text-[10px] md:text-sm">
                  ارز
                </TableHead>
                <TableHead className="w-[50px] md:w-[100px] p-1 md:p-3 text-slate-600 dark:text-slate-300 text-center text-[10px] md:text-sm">
                  پرچون
                </TableHead>
                <TableHead className="w-[50px] md:w-[100px] p-1 md:p-3 text-slate-600 dark:text-slate-300 text-center text-[10px] md:text-sm">
                  عمده
                </TableHead>
                <TableHead className="hidden md:table-cell w-[120px] p-1.5 md:p-3 text-slate-600 dark:text-slate-300 last:rounded-tl-xl text-sm">
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
                  <TableCell className="p-0.5 md:p-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className="group block w-full md:w-auto focus-visible:outline-none relative">
                          <div className="w-5 h-5 md:w-9 md:h-9 rounded border md:rounded-lg border md:border-2 border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm relative">
                            <Image
                              src={rate.imageUrl || '/images/placeholder-small.png'}
                              alt={rate.name}
                              width={36}
                              height={36}
                              className="object-cover w-full h-full"
                            />
                            <div className="md:hidden absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200" />
                            <div className="md:hidden absolute -top-0.5 -right-0.5 w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                          </div>
                        </button>
                      </PopoverTrigger>
                      <PopoverContent 
                        className="w-[280px] p-0 md:hidden border-0" 
                        align="center"
                        sideOffset={20}
                      >
                        <div className="flex flex-col">
                          <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-900 border-b border-slate-200 dark:border-slate-700">
                            <div className="w-10 h-10 rounded-lg border-2 border-slate-200 dark:border-slate-700 overflow-hidden">
                              <Image
                                src={rate.imageUrl || '/images/placeholder-small.png'}
                                alt={rate.name}
                                width={40}
                                height={40}
                                className="object-cover w-full h-full"
                              />
                            </div>
                            <div className="flex flex-col">
                              <span className="font-medium text-base text-slate-900 dark:text-slate-100">
                                {rate.name}
                              </span>
                              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                {rate.currency}
                              </span>
                            </div>
                          </div>
                          <div className="p-3 bg-white dark:bg-slate-900">
                            <div className="flex flex-col gap-2">
                              <div className="flex justify-between items-center">
                                <span className="text-xs text-slate-500 dark:text-slate-400">نرخ پرچون:</span>
                                <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                  {rate.singleRate || '---'}
                                </span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-xs text-slate-500 dark:text-slate-400">نرخ عمده:</span>
                                <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                  {rate.bulkRate || '---'}
                                </span>
                              </div>
                              <div className="h-px bg-slate-100 dark:bg-slate-800 my-1" />
                              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                                {rate.description || 'توضیحات موجود نیست'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </TableCell>
                  <TableCell className="p-0.5 md:p-2">
                    <div className="flex flex-col gap-0">
                      <span className="font-medium text-slate-700 dark:text-slate-200 text-[10px] md:text-sm break-words w-full">
                        {rate.name}
                      </span>
                      <span className="text-[8px] md:hidden px-0.5 md:px-1 py-px md:py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full w-fit leading-tight">
                        {rate.currency}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell p-0.5 md:p-2">
                    <span className="text-[10px] md:text-sm text-slate-600 dark:text-slate-400">
                      {rate.currency}
                    </span>
                  </TableCell>
                  <TableCell className="p-0.5 md:p-2 text-center">
                    <span className="inline-block min-w-[45px] md:min-w-[70px] text-[10px] md:text-sm font-medium text-slate-700 dark:text-slate-200">
                      {rate.singleRate || '---'}
                    </span>
                  </TableCell>
                  <TableCell className="p-0.5 md:p-2 text-center">
                    <span className="inline-block min-w-[45px] md:min-w-[70px] text-[10px] md:text-sm font-medium text-slate-700 dark:text-slate-200">
                      {rate.bulkRate || '---'}
                    </span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell p-1 md:p-2">
                    <span className="text-xs text-slate-400 dark:text-slate-500 line-clamp-1">
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
