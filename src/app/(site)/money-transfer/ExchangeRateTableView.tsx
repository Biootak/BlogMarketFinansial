'use client'

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
      day: 'numeric'
    }).format(new Date(date))
  };

  const buySellRates = exchangeRates.filter((rate) => rate.rateType === 'BUY_SELL');
  const singleBulkRates = exchangeRates.filter((rate) => rate.rateType !== 'BUY_SELL');

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base sm:text-xl font-bold text-gray-800 dark:text-gray-200">
            نرخ خرید و فروش
          </h2>
          {buySellRates.length > 0 && (
            <time className="text-xs text-gray-500 dark:text-gray-400" dateTime={typeof buySellRates[0].updatedAt === 'string' ? new Date(buySellRates[0].updatedAt).toISOString() : buySellRates[0].updatedAt.toISOString()}>
              {formatDate(typeof buySellRates[0].updatedAt === 'string' ? new Date(buySellRates[0].updatedAt).toISOString() : buySellRates[0].updatedAt.toISOString())}
            </time>
          )}
        </div>
        
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
          <Table className="min-w-[350px]">
            <TableHeader>
              <TableRow className="bg-gray-50/50 dark:bg-gray-800/50">
                <TableHead className="w-[36px] p-1">نماد</TableHead>
                <TableHead className="w-[100px] p-1">نام</TableHead>
                <TableHead className="w-[70px] p-1 text-center">خرید</TableHead>
                <TableHead className="w-[70px] p-1 text-center">فروش</TableHead>
                <TableHead className="hidden md:table-cell w-[150px] p-1">توضیحات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {buySellRates.map((rate) => (
                <TableRow key={rate.id} className="border-t border-gray-100 dark:border-gray-800">
                  <TableCell className="p-1">
                    <div className="w-5 h-5 sm:w-8 sm:h-8 rounded-full border border-gray-100 dark:border-gray-700 overflow-hidden">
                      <Image
                        src={rate.imageUrl || '/images/placeholder-small.png'}
                        alt={rate.name}
                        width={32}
                        height={32}
                        className="object-cover w-full h-full"
                      />
                    </div>
                  </TableCell>
                  <TableCell className="p-1">
                    <div className="leading-tight">
                      <p className="font-medium text-gray-900 dark:text-gray-100 text-[11px] sm:text-sm">
                        {rate.name}
                      </p>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400">
                        {rate.currency}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="p-1 text-center">
                    <span className="block text-[11px] sm:text-sm">{rate.buyRate}</span>
                  </TableCell>
                  <TableCell className="p-1 text-center">
                    <span className="block text-[11px] sm:text-sm">{rate.sellRate}</span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell p-1">
                    <span className="text-[11px] sm:text-sm text-gray-600 dark:text-gray-400">
                      {rate.description || 'قیمت لحظه‌ای خرید و فروش'}
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
          <h2 className="text-base sm:text-xl font-bold text-gray-800 dark:text-gray-200">
            نرخ پرچون و عمده
          </h2>
          {singleBulkRates.length > 0 && (
            <time className="text-xs text-gray-500 dark:text-gray-400" dateTime={typeof singleBulkRates[0].updatedAt === 'string' ? new Date(singleBulkRates[0].updatedAt).toISOString() : singleBulkRates[0].updatedAt.toISOString()}>
              {formatDate(typeof singleBulkRates[0].updatedAt === 'string' ? new Date(singleBulkRates[0].updatedAt).toISOString() : singleBulkRates[0].updatedAt.toISOString())}
            </time>
          )}
        </div>

        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
          <Table className="min-w-[350px]">
            <TableHeader>
              <TableRow className="bg-gray-50/50 dark:bg-gray-800/50">
                <TableHead className="w-[36px] p-1">نماد</TableHead>
                <TableHead className="w-[100px] p-1">نام</TableHead>
                <TableHead className="w-[70px] p-1 text-center">پرچون</TableHead>
                <TableHead className="w-[70px] p-1 text-center">عمده</TableHead>
                <TableHead className="hidden md:table-cell w-[150px] p-1">توضیحات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {singleBulkRates.map((rate) => (
                <TableRow key={rate.id} className="border-t border-gray-100 dark:border-gray-800">
                  <TableCell className="p-1">
                    <div className="w-5 h-5 sm:w-8 sm:h-8 rounded-full border border-gray-100 dark:border-gray-700 overflow-hidden">
                      <Image
                        src={rate.imageUrl || '/images/placeholder-small.png'}
                        alt={rate.name}
                        width={32}
                        height={32}
                        className="object-cover w-full h-full"
                      />
                    </div>
                  </TableCell>
                  <TableCell className="p-1">
                    <div className="leading-tight">
                      <p className="font-medium text-gray-900 dark:text-gray-100 text-[11px] sm:text-sm">
                        {rate.name}
                      </p>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400">
                        {rate.currency}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="p-1 text-center">
                    <span className="block text-[11px] sm:text-sm">{rate.singleRate}</span>
                  </TableCell>
                  <TableCell className="p-1 text-center">
                    <span className="block text-[11px] sm:text-sm">{rate.bulkRate}</span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell p-1">
                    <span className="text-[11px] sm:text-sm text-gray-600 dark:text-gray-400">
                      {rate.description || 'قیمت عمده و پرچون'}
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
