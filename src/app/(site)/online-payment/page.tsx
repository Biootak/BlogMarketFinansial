import type { Metadata } from 'next';
import ContactCTA from '@/components/online-payment/ContactCTA';
import OnlinePaymentHero from '@/components/online-payment/OnlinePaymentHero';
import ServicesList from '@/components/online-payment/ServicesList';

export const metadata: Metadata = {
  title: 'پرداخت آنلاین | خدمات پرداخت بین‌المللی',
  description:
    'خدمات پرداخت بین‌المللی با بهترین شرایط و قیمت از طریق پی‌پال، مستر کارت، ویزا کارت و سایر روش‌های آنلاین',
};

export default function OnlinePaymentPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
      <OnlinePaymentHero />
      <ServicesList />
      <ContactCTA />
    </main>
  );
}
