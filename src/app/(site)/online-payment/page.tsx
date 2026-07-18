import type { Metadata } from 'next';
import { Suspense } from 'react';
import ContactCTA from '@/components/online-payment/ContactCTA';
import OnlinePaymentLanding from '@/components/online-payment/OnlinePaymentHero';

export const metadata: Metadata = {
  title: 'پرداخت آنلاین | خدمات پرداخت بین‌المللی',
  description:
    'خدمات پرداخت بین‌المللی با بهترین شرایط از طریق پی‌پال، مستر کارت، ویزا کارت و سایر روش‌های آنلاین. حواله ارزی، پرداخت شهریه، خرید نرم‌افزار و نقد کردن درآمد فریلنسری.',
  keywords: [
    'پرداخت آنلاین',
    'پی پال',
    'ویزا کارت',
    'مستر کارت',
    'حواله ارزی',
    'پرداخت بین المللی',
    'خرید از سایت خارجی',
    'شهریه دانشگاه',
  ],
  openGraph: {
    title: 'پرداخت آنلاین | خدمات پرداخت بین‌المللی',
    description:
      'خدمات پرداخت بین‌المللی با بهترین شرایط از طریق پی‌پال، مستر کارت، ویزا کارت',
    type: 'website',
  },
};

export default function OnlinePaymentPage() {
  return (
    <main>
      <OnlinePaymentLanding />
      <div id="contact">
        <Suspense fallback={<div className="h-64" />}>
          <ContactCTA defaultServiceType="ONLINE_PAYMENT" />
        </Suspense>
      </div>
    </main>
  );
}
