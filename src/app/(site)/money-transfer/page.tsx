import type { Metadata } from 'next';
import { getExchangeRates } from '@/actions/exchange-rates';
import { getRateLists } from '@/actions/rate-lists';
import { ExchangeRateTableView } from './ExchangeRateTableView';
import ContactCTA from '@/components/online-payment/ContactCTA';
import FAQ from './FAQ';
import RateListGrid from './RateListGrid';
import HeroConverter from './HeroConverter';
import LiveTicker from './LiveTicker';
import TrustStrip from './TrustStrip';
import FeatureList from './FeatureList';
import RateComparisonSection from './RateComparisonSection';

export const metadata: Metadata = {
  title: 'صرافی آنلاین | انتقال ارز سریع و مطمئن',
  description: 'بهترین نرخ‌های حواله ارزی برای انتقال سریع و امن پول در سراسر جهان',
};

// Dynamically rendered on demand — the shared site header reads auth(), which
// opts the whole (site) tree out of static generation (see (home)/page.tsx).
export default async function MoneyTransferPage() {
  const exchangeRates = await getExchangeRates();
  const rateLists = await getRateLists();
  const activeRateLists = rateLists.filter((list) => list.isActive);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50/50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 overflow-x-hidden">
      {/* Hero + Live Converter (one cohesive unit) */}
      <HeroConverter rates={exchangeRates} />

      {/* Live ticker — thin full-width strip right under the hero */}
      <div className="mt-3 sm:mt-4">
        <LiveTicker rates={exchangeRates} />
      </div>

      <div className="container py-6 sm:py-10 lg:py-14 space-y-10 sm:space-y-16 px-4 sm:px-6">
        {/* Provider Comparison — real-time quotes from TGJU/USDT/FX × Wise/Remitly/etc.
            Single most important decision-support section after the converter. */}
        <section aria-labelledby="mt-compare-title">
          <RateComparisonSection />
        </section>

        {/* Trust Strip — company-wide numeric metrics */}
        <section aria-label="اعتمادسازی">
          <TrustStrip />
        </section>

        {/* Exchange Rates Section */}
        <section id="rates" className="mt-section">
          <ExchangeRateTableView exchangeRates={exchangeRates} />
        </section>

        {/* Rate Lists Section */}
        <section className="mt-section">
          <RateListGrid rateLists={activeRateLists} initialCount={10} />
        </section>

        {/* Contact CTA Section */}
        <section id="contact">
          <ContactCTA defaultServiceType="INTERNATIONAL_TRANSFER" />
        </section>

        {/* Services Section */}
        <section id="services" className="mt-section">
          <FeatureList />
        </section>

        {/* FAQ Section */}
        <section id="faq" className="mt-section">
          <FAQ />
        </section>
      </div>
    </div>
  );
}
