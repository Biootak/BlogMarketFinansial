import Footer from '@/components/Footer/Footer';
import Header from '@/components/Header/Header';
import { SiteSettingsProvider } from '@/components/SiteSettingsProvider';
import { getSystemSettingsData } from '@/data/getSystemSettings';
import type { Metadata } from 'next';

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
    <SiteSettingsProvider
      initialSettings={{
        siteName: settings.siteName,
        siteDescription: settings.siteDescription,
      }}
    >
      <a href="#main-content" className="skip-to-main">
        پرش به محتوای اصلی
      </a>
      <Header />
      <main id="main-content">{children}</main>
      <Footer />
    </SiteSettingsProvider>
  );
}
