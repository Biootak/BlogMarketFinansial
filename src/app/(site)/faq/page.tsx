import { getSystemSettingsData } from '@/data/getSystemSettings';
import { getSiteIdentity } from '@/lib/site-identity';
import { HelpCircle } from 'lucide-react';
import type { Metadata } from 'next';
import { FaqContent } from './FaqContent';
import s from './faq.module.css';

export async function generateMetadata(): Promise<Metadata> {
  const { siteName } = await getSiteIdentity();
  const name = siteName || 'پلتفرم مالی';
  return {
    title: `پرسش‌های متداول | ${name}`,
    description: `پاسخ پرسش‌های متداول درباره خدمات، احراز هویت، کیف پول، معاملات و امنیت در ${name}.`,
    alternates: { canonical: '/faq' },
  };
}

export default async function FaqPage() {
  const settings = await getSystemSettingsData();
  return (
    <div className={s.page}>
      <div className="container">
        {/* ── Page header ────────────────────────────────────── */}
        <header className={s.header}>
          <div className={s.eyebrow}>
            <HelpCircle size={13} strokeWidth={1.75} aria-hidden />
            پرسش‌های متداول
          </div>
          <h1 className={s.title}>
            پاسخ <span className={s.titleAccent}>سؤالات شما</span> در یک نگاه
          </h1>
          <p className={s.sub}>
            پاسخ پرسش‌های پرتکرار درباره خدمات، احراز هویت، کیف پول، معاملات، امنیت و پشتیبانی. اگر
            پاسخ خود را پیدا نکردید، تیم پشتیبانی ۲۴ ساعته آماده کمک به شماست.
          </p>
        </header>

        <FaqContent email={settings.contactEmail ?? undefined} />
      </div>
    </div>
  );
}
