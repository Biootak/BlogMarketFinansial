/**
 * /services — بازارچه مرکزی خدمات آنلاین صرافی‌ها.
 *
 *  لایه ۳ از ۴ لایه پیشنهادی:
 *  - همه سرویس‌ها × همه صرافی‌ها
 *  - فیلتر با chip-tab در header
 *  - لینک مستقیم به پروفایل صرافی
 *  - قابلیت اشتراک‌گذاری با query param (e.g. /services?service=CURRENCY_BUY)
 *
 *  Pattern: marketplace hub مثل Airbnb / Booking / Amazon
 *  - hero با توضیح کوتاه + counter کل
 *  - chip-tab برای فیلتر
 *  - لیست گروه‌بندی شده بر اساس serviceGroup
 */

import { getMarketplaceData } from '@/actions/exchange-services';
import type { Metadata } from 'next';
import ServicesMarketplace from './_components/ServicesMarketplace';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'خدمات آنلاین صرافی‌ها',
  description: 'خدمات آنلاین صرافی‌ها — خرید و فروش ارز، حواله، پرداخت، رمزارز و سایر خدمات.',
  openGraph: {
    title: 'خدمات آنلاین صرافی‌ها',
    description: 'پیدا کردن صرافی مناسب برای هر خدمت — در یک نگاه.',
    type: 'website',
  },
};

type SearchParams = Promise<{
  service?: string;
  exchange?: string;
  group?: string;
}>;

export default async function ServicesMarketplacePage({
  searchParams,
}: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const data = await getMarketplaceData();

  return (
    <ServicesMarketplace
      data={data}
      initialService={sp.service}
      initialExchange={sp.exchange}
      initialGroup={sp.group}
    />
  );
}
