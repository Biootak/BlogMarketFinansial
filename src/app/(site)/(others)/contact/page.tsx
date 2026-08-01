import { getSystemSettingsData } from '@/data/getSystemSettings';
import { getSiteIdentity } from '@/lib/site-identity';
import type { Metadata } from 'next';
import ContactForm from './ContactForm';

export async function generateMetadata(): Promise<Metadata> {
  const { siteName } = await getSiteIdentity();
  return {
    title: `تماس با ما | ${siteName}`,
    description: 'با کارشناسان ما تماس بگیرید — پاسخگویی در کمتر از ۳۰ دقیقه.',
  };
}

export default async function ContactPage() {
  const settings = await getSystemSettingsData();
  return (
    <ContactForm
      address={settings.contactAddress ?? 'دبی، امارات متحده عربی'}
      email={settings.contactEmail ?? 'support@financialmarket.page'}
      phone={settings.contactPhone ?? ''}
    />
  );
}
