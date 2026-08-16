import { getSupportContactLinks } from '@/actions/serviceRequestActions';
import type { Metadata } from 'next';
import ServiceOrderCheckout from './_components/ServiceOrderCheckout';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'ثبت سفارش خدمات مالی',
  description:
    'حواله، خرید و فروش ارز، پرداخت آنلاین، شارژ موبایل، قبض، بلیط سفر و رمزارز — سفارش خود را آنلاین ثبت کنید؛ کارشناسان ما در کمتر از ۳۰ دقیقه با شما تماس می‌گیرند.',
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

export default async function ServiceOrderPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const contactLinks = await getSupportContactLinks();

  return (
    <ServiceOrderCheckout
      initialService={sp.service ?? null}
      initialAmount={sp.amount}
      initialCurrency={sp.currency}
      telegramLink={contactLinks.telegram ?? null}
      whatsappLink={contactLinks.whatsapp ?? null}
    />
  );
}
