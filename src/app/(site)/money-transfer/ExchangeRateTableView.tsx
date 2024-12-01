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

export function ExchangeRateTableView({ exchangeRates }: { exchangeRates: ExchangeRateData[] }) {
  const buySellRates = exchangeRates.filter((rate) => rate.rateType === 'BUY_SELL');
  const singleBulkRates = exchangeRates.filter((rate) => rate.rateType !== 'BUY_SELL');

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-200">نرخ خرید و فروش</h2>
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/80 dark:bg-gray-800/80">
                <TableHead className="w-[80px]">نماد</TableHead>
                <TableHead className="min-w-[140px]">نام</TableHead>
                <TableHead className="min-w-[100px]">ارز</TableHead>
                <TableHead className="min-w-[120px]">نرخ خرید</TableHead>
                <TableHead className="min-w-[120px]">نرخ فروش</TableHead>
                <TableHead className="min-w-[200px]">توضیحات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {buySellRates.map((rate) => (
                <TableRow 
                  key={rate.id}
                  className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <TableCell className="font-medium">
                    <div className="w-10 h-10 rounded-full border-2 border-gray-100 dark:border-gray-700 overflow-hidden">
                      <Image
                        src={rate.imageUrl || '/images/placeholder-small.png'}
                        alt={rate.name}
                        width={40}
                        height={40}
                        className="object-cover w-full h-full"
                      />
                    </div>
                  </TableCell>
                  <TableCell className="font-medium text-gray-900 dark:text-gray-100">{rate.name}</TableCell>
                  <TableCell className="text-gray-600 dark:text-gray-400">{rate.currency}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                      {rate.buyRate}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                      {rate.sellRate}
                    </span>
                  </TableCell>
                  <TableCell className="text-gray-600 dark:text-gray-400 max-w-[200px] truncate">
                    {rate.description}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-200">نرخ پرچون و عمده</h2>
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/80 dark:bg-gray-800/80">
                <TableHead className="w-[80px]">نماد</TableHead>
                <TableHead className="min-w-[140px]">نام</TableHead>
                <TableHead className="min-w-[100px]">ارز</TableHead>
                <TableHead className="min-w-[120px]">نرخ پرچون</TableHead>
                <TableHead className="min-w-[120px]">نرخ عمده</TableHead>
                <TableHead className="min-w-[200px]">توضیحات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {singleBulkRates.map((rate) => (
                <TableRow 
                  key={rate.id}
                  className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <TableCell className="font-medium">
                    <div className="w-10 h-10 rounded-full border-2 border-gray-100 dark:border-gray-700 overflow-hidden">
                      <Image
                        src={rate.imageUrl || '/images/placeholder-small.png'}
                        alt={rate.name}
                        width={40}
                        height={40}
                        className="object-cover w-full h-full"
                      />
                    </div>
                  </TableCell>
                  <TableCell className="font-medium text-gray-900 dark:text-gray-100">{rate.name}</TableCell>
                  <TableCell className="text-gray-600 dark:text-gray-400">{rate.currency}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                      {rate.singleRate}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                      {rate.bulkRate}
                    </span>
                  </TableCell>
                  <TableCell className="text-gray-600 dark:text-gray-400 max-w-[200px] truncate">
                    {rate.description}
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
