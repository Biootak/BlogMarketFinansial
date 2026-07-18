import type { Metadata } from 'next';
import OnlinePaymentLanding from '@/components/online-payment/OnlinePaymentHero';
import ContactCTAClient from '@/components/online-payment/ContactCTAClient';
import { getSupportContactLinks } from '@/actions/serviceRequestActions';

// ISR: rebuild at most once per hour. No per-request dynamic data on this page.
// In production Next.js serves the pre-rendered HTML; the DB is only hit at
// build time and then every `revalidate` seconds via background revalidation.
export const revalidate = 3600;

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

// Fetch contact links at render time (cached by unstable_cache; 10 min TTL).
// By awaiting here (not in a child Suspense boundary) Next.js can include
// the result in the pre-rendered HTML and avoid a DB round-trip on every hit.
export default async function OnlinePaymentPage() {
  const contactLinks = await getSupportContactLinks();

  return (
    <main>
      <OnlinePaymentLanding />
      <div id="contact">
        <ContactCTAClient
          defaultServiceType="ONLINE_PAYMENT"
          telegramLink={contactLinks.data?.telegram ?? null}
          whatsappLink={contactLinks.data?.whatsapp ?? null}
        />
      </div>
    </main>
  );
}
