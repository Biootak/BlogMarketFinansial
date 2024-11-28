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
        <h2 className="text-xl font-bold mb-4 ">نرخ خرید و فروش</h2>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">نماد</TableHead>
                <TableHead>نام</TableHead>
                <TableHead>ارز</TableHead>
                <TableHead>نرخ خرید</TableHead>
                <TableHead>نرخ فروش</TableHead>
                <TableHead>توضیحات </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {buySellRates.map((rate) => (
                <TableRow key={rate.id}>
                  <TableCell className="font-medium">
                    <Image
                      src={rate.imageUrl || '/images/placeholder-small.png'}
                      alt={rate.name}
                      width={40}
                      height={40}
                      className="rounded-full"
                    />
                  </TableCell>
                  <TableCell>{rate.name}</TableCell>
                  <TableCell>{rate.currency}</TableCell>
                  <TableCell>{rate.buyRate}</TableCell>
                  <TableCell>{rate.sellRate}</TableCell>
                  <TableCell>{rate.description}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold mb-4 ">نرخ پرچون و عمده</h2>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">نماد</TableHead>
                <TableHead>نام</TableHead>
                <TableHead>ارز</TableHead>
                <TableHead>نرخ پرچون</TableHead>
                <TableHead>نرخ عمده</TableHead>
                <TableHead>توضیحات </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {singleBulkRates.map((rate) => (
                <TableRow key={rate.id}>
                  <TableCell className="font-medium">
                    <Image
                      src={rate.imageUrl || '/images/placeholder-small.png'}
                      alt={rate.name}
                      width={40}
                      height={40}
                      className="rounded-full"
                    />
                  </TableCell>
                  <TableCell>{rate.name}</TableCell>
                  <TableCell>{rate.currency}</TableCell>
                  <TableCell>{rate.singleRate}</TableCell>
                  <TableCell>{rate.bulkRate}</TableCell>
                  <TableCell>{rate.description}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
