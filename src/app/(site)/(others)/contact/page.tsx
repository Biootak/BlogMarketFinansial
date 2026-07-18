import type { Metadata } from 'next';
import { getSiteIdentity } from '@/lib/site-identity';
import ContactForm from './ContactForm';

export async function generateMetadata(): Promise<Metadata> {
  const { siteName } = await getSiteIdentity();
  return {
    title: `تماس با ما | ${siteName}`,
    description: 'با کارشناسان ما تماس بگیرید — پاسخگویی در کمتر از ۳۰ دقیقه.',
  };
}

export default function ContactPage() {
  return <ContactForm />;
}
