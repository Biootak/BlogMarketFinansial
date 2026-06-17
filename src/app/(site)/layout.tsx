import Header from '@/components/Header/Header';
import Footer from '@/components/Footer/Footer';
import type { Metadata } from 'next';
import { SiteSettingsProvider } from '@/components/SiteSettingsProvider';
import { getSystemSettingsData } from '@/data/getSystemSettings';
import { getActiveAdvertisements } from '@/actions/advertisementActions';
import { getRateListsWithCrypto } from '@/actions/rate-lists';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSystemSettingsData();

  return {
    title: settings.siteName || 'Market Financial',
    description: settings.siteDescription || 'پلتفرم مورد اعتماد شما در بازار مالی',
    icons: {
      icon: [
        {
          rel: 'icon',
          url: '/favicon.svg',
          type: 'image/svg+xml',
          sizes: 'any',
        },
      ],
    },
  };
}

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [settings, footerAdsResult, rateLists] = await Promise.all([
    getSystemSettingsData(),
    getActiveAdvertisements({
      limit: 1,
      position: 'FOOTER',
      orderBy: 'createdAt',
      orderDirection: 'desc',
    }),
    // داده‌ی نوار چرخشی و مگامنوی بازار — یک‌بار در سرور فچ می‌شه
    // و به Header و سایر بخش‌ها پاس داده می‌شه. dedup + crypto fallback.
    getRateListsWithCrypto(),
  ]);
  const footerAd = footerAdsResult.success && footerAdsResult.data?.[0] ? footerAdsResult.data[0] : null;
  const activeRateLists = (rateLists ?? []).filter((l) => l.isActive);

  return (
    <SiteSettingsProvider
      initialSettings={{
        siteName: settings.siteName,
        siteDescription: settings.siteDescription,
      }}
    >
      <Header activeRateLists={activeRateLists} />
      <main>{children}</main>
      <Footer footerAd={footerAd} />
    </SiteSettingsProvider>
  );
}
