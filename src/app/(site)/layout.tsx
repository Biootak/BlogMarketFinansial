import Header from '@/components/Header/Header';
import Footer from '@/components/Footer/Footer';
import type { Metadata } from 'next';
import { SiteSettingsProvider } from '@/components/SiteSettingsProvider';
import { getSystemSettingsData } from '@/data/getSystemSettings';

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

  return (
    <SiteSettingsProvider initialSettings={settings}>
      <Header />
      <main>{children}</main>
      <Footer />
    </SiteSettingsProvider>
  );
}
