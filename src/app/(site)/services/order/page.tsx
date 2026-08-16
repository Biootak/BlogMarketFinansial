import { getMarketplaceCatalog } from '@/actions/exchange-services';
import { getSupportContactLinks } from '@/actions/serviceRequestActions';
import { findMarketRate } from '@/lib/order-quote';
import type { Metadata } from 'next';
import ServiceOrderCheckout, { type MarketRateStrip } from './_components/ServiceOrderCheckout';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'ثبت سفارش خدمات مالی',
  description:
    'حواله، خرید و فروش ارز، پرداخت آنلاین، شارژ موبایل، قبض، بلیط سفر و رمزارز — نرخ لحظه‌ای قفل می‌شود و سفارش آنلاین ثبت می‌شود.',
  openGraph: {
    title: 'ثبت سفارش خدمات مالی',
    description: 'همه خدمات مالی در یک جریان ثبت سفارش — سریع، شفاف و بدون مراجعه حضوری.',
    type: 'website',
  },
};

type SearchParams = Promise<{
  service?: string;
  amount?: string;
  currency?: string;
}>;

/** ارزهای استریک نرخ زنده زیر هدر — دادهٔ واقعی snapshot بازار */
const STRIP_CURRENCIES: Array<{ code: string; label: string }> = [
  { code: 'USD', label: 'دلار' },
  { code: 'EUR', label: 'یورو' },
  { code: 'AED', label: 'درهم' },
  { code: 'GBP', label: 'پوند' },
];

export default async function ServiceOrderPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const [contactLinks, catalog] = await Promise.all([
    getSupportContactLinks(),
    getMarketplaceCatalog(),
  ]);

  // نرخ زندهٔ استریک — از snapshot بازار (parallel، fail-safe)
  const stripRates = await Promise.all(
    STRIP_CURRENCIES.map(async (c): Promise<MarketRateStrip | null> => {
      const market = await findMarketRate(c.code);
      if (!market) return null;
      return {
        code: c.code,
        label: c.label,
        rate: market.sell,
        changePercent: market.changePercent,
      };
    }),
  );
  const marketRates = stripRates.filter((r): r is MarketRateStrip => r !== null);

  // routing بازارچه: صرافی‌های فعالِ هر سرویس — فقط وقتی واقعاً وجود دارند
  const exchangeOptions: Record<string, Array<{ id: string; name: string }>> = {};
  for (const row of catalog) {
    if (row.count > 0 && row.exchanges.length > 0) {
      exchangeOptions[row.serviceKey] = row.exchanges.map((e) => ({ id: e.id, name: e.name }));
    }
  }

  return (
    <ServiceOrderCheckout
      initialService={sp.service ?? null}
      initialAmount={sp.amount}
      initialCurrency={sp.currency}
      telegramLink={contactLinks.telegram ?? null}
      whatsappLink={contactLinks.whatsapp ?? null}
      marketRates={marketRates}
      exchangeOptions={exchangeOptions}
    />
  );
}
