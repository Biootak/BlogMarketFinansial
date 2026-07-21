/**
 * /transfer — صفحه درخواست حواله ارزی
 * P1-4: inline styles به CSS module منتقل شدند (توکن‌ها به جای hex/oklch hardcode)
 */

import TransferRequestCTA from '@/components/money-transfer/TransferRequestCTA';
import { loadActiveTransferProviders } from '@/lib/money-transfer/providers';
import type { Metadata } from 'next';
import s from './transfer.module.css';

export const metadata: Metadata = {
  title: 'درخواست حواله | انتقال ارز',
  description: 'ثبت درخواست حواله ارزی به افغانستان، ایران و سراسر جهان با بهترین نرخ',
};

export default async function TransferPage() {
  const activeProviders = await loadActiveTransferProviders();

  return (
    <main className={s.page}>
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className={s.hero} aria-labelledby="transfer-hero-title">
        {/* Ambient layers */}
        <div className={s.heroAmbient} aria-hidden />
        {/* Hairline top border */}
        <div className={s.heroHairline} aria-hidden />

        <div className={s.heroInner}>
          {/* Pill badge */}
          <div className={s.heroBadge}>
            <span className={s.heroBadgeDot} aria-hidden />
            سرویس رسمی انتقال ارز
          </div>

          <h1 id="transfer-hero-title" className={s.heroTitle}>
            ارسال پول به افغانستان
            <span className={s.heroTitleAccent}>با بهترین نرخ روز</span>
          </h1>

          <p className={s.heroDesc}>
            بدون کارمزد پنهان، با شفافیت کامل. تیم ما در کمتر از ۳۰ دقیقه پاسخ می‌دهد.
          </p>

          {/* Stats strip */}
          <div className={s.heroStats}>
            {[
              {
                value: `${new Intl.NumberFormat('fa-IR').format(activeProviders.length)}+`,
                label: 'صرافی فعال',
              },
              { value: '۲۴/۷', label: 'پشتیبانی آنلاین' },
              { value: '۹۸٪', label: 'رضایت مشتریان' },
            ].map((stat) => (
              <div key={stat.label} className={s.heroStat}>
                <div className={s.heroStatValue}>{stat.value}</div>
                <div className={s.heroStatLabel}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Main form ──────────────────────────────────────────────────────── */}
      <section className={s.formSection} aria-label="فرم درخواست حواله">
        <TransferRequestCTA />
      </section>
    </main>
  );
}
