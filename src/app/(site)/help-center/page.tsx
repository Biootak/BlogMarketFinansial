import { getSiteIdentity } from '@/lib/site-identity';
import type { Metadata } from 'next';
import s from './help-center.module.css';
import { HelpCenterContent } from './HelpCenterContent';

export async function generateMetadata(): Promise<Metadata> {
  const { siteName } = await getSiteIdentity();
  const name = siteName || 'پلتفرم مالی';
  return {
    title: `مرکز راهنما | ${name}`,
    description: `راهنمای کامل استفاده از خدمات ${name}، پرسش‌های متداول، راهنمای تصویری و پشتیبانی ۲۴/۷.`,
    alternates: { canonical: '/help-center' },
  };
}

export default function HelpCenterPage() {
  return (
    <div className={s.page}>
      <div className="container">
        <HelpCenterContent />
      </div>
    </div>
  );
}
