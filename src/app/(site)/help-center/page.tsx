import { getSystemSettingsData } from '@/data/getSystemSettings';
import { getSiteIdentity } from '@/lib/site-identity';
import type { Metadata } from 'next';
import { HelpCenterContent } from './HelpCenterContent';
import s from './help-center.module.css';

export async function generateMetadata(): Promise<Metadata> {
  const { siteName } = await getSiteIdentity();
  const name = siteName || 'پلتفرم مالی';
  return {
    title: `مرکز راهنما | ${name}`,
    description: `راهنمای کامل استفاده از خدمات ${name}، پرسش‌های متداول، راهنمای تصویری و پشتیبانی ۲۴/۷.`,
    alternates: { canonical: '/help-center' },
  };
}

export default async function HelpCenterPage() {
  const settings = await getSystemSettingsData();
  return (
    <div className={s.page}>
      <div className="container">
        <HelpCenterContent
          phone={settings.contactPhone ?? undefined}
          email={settings.contactEmail ?? undefined}
        />
      </div>
    </div>
  );
}
