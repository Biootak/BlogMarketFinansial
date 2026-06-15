import Header from '@/components/Header/Header';
import Footer from '@/components/Footer/Footer';
import type { Metadata } from 'next';
import { SiteSettingsProvider } from '@/components/SiteSettingsProvider';
import { getSystemSettingsData } from '@/data/getSystemSettings';
import { getActiveAdvertisements } from '@/actions/advertisementActions';

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
  const settings = await getSystemSettingsData();
  const footerAdsResult = await getActiveAdvertisements({
    limit: 1,
    position: 'FOOTER',
    orderBy: 'createdAt',
    orderDirection: 'desc',
  });
  const footerAd = footerAdsResult.success && footerAdsResult.data?.[0] ? footerAdsResult.data[0] : null;

  return (
    <SiteSettingsProvider
      initialSettings={{
        siteName: settings.siteName,
        siteDescription: settings.siteDescription,
      }}
    >
      <Header />
      <main>{children}</main>
      <Footer footerAd={footerAd} />
    </SiteSettingsProvider>
  );
}
