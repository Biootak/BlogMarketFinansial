import type { Metadata } from 'next';
import OnlinePaymentLanding from '@/components/online-payment/OnlinePaymentHero';
import ContactCTAClient from '@/components/online-payment/ContactCTAClient';
import { getSupportContactLinks } from '@/actions/serviceRequestActions';

// ISR: rebuild at most once per hour. No per-request dynamic data on this page.
// In production Next.js serves the pre-rendered HTML; the DB is only hit at
// build time and then every `revalidate` seconds via background revalidation.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'پرداخت آنلاین | خدمات مالی بین‌المللی برای افغانستان',
  description:
    'خدمات حواله بین‌المللی، پرداخت آنلاین، پرداخت شهریه، نقد کردن درآمد فریلنسری و خرید نرم‌افزار برای کاربران افغان. پاسخگویی در کمتر از ۳۰ دقیقه.',
  keywords: [
    'حواله افغانستان',
    'پرداخت آنلاین افغانستان',
    'ارسال پول از افغانستان',
    'حواله به افغانستان',
    'تبدیل افغانی به دلار',
    'پرداخت شهریه خارج',
    'نقد کردن درآمد فریلنسری',
    'خرید نرم‌افزار افغانستان',
    'حواله امارات',
    'حواله ترکیه',
  ],
  openGraph: {
    title: 'پرداخت آنلاین | خدمات مالی بین‌المللی برای افغانستان',
    description:
      'حواله بین‌المللی، پرداخت آنلاین و خدمات مالی برای کاربران افغان — پاسخگویی در کمتر از ۳۰ دقیقه',
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
          telegramLink={contactLinks.telegram ?? null}
          whatsappLink={contactLinks.whatsapp ?? null}
        />
      </div>
    </main>
  );
}
