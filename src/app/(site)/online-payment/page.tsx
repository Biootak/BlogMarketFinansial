import type { Metadata } from 'next';
import ContactCTA from '@/components/online-payment/ContactCTA';
import OnlinePaymentHero from '@/components/online-payment/OnlinePaymentHero';
import ServicesList from '@/components/online-payment/ServicesList';

export const metadata: Metadata = {
  title: 'پرداخت آنلاین | خدمات پرداخت بین‌المللی بیوتاک',
  description:
    'خدمات پرداخت بین‌المللی با بهترین شرایط و قیمت از طریق پی‌پال، مستر کارت، ویزا کارت و سایر روش‌های آنلاین. حواله ارزی، پرداخت شهریه، خرید نرم‌افزار و نقد کردن درآمد فریلنسری.',
  keywords: [
    'پرداخت آنلاین',
    'پی پال',
    'ویزا کارت',
    'مستر کارت',
    'حواله ارزی',
    'پرداخت بین المللی',
    'خرید از سایت خارجی',
  ],
  openGraph: {
    title: 'پرداخت آنلاین | خدمات پرداخت بین‌المللی بیوتاک',
    description:
      'خدمات پرداخت بین‌المللی با بهترین شرایط و قیمت از طریق پی‌پال، مستر کارت، ویزا کارت',
    type: 'website',
  },
};

export default function OnlinePaymentPage() {
  return (
    <main className="min-h-screen bg-white dark:bg-neutral-900">
      <OnlinePaymentHero />
      <ServicesList />
      <ContactCTA defaultServiceType="ONLINE_PAYMENT" />
    </main>
  );
}
