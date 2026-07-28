/**
 * /exchanges/[slug]/loading — skeleton برای صفحهٔ عمومی صرافی
 */

import { Building2 } from 'lucide-react';
import s from './loading.module.css';

export default function ExchangePublicLoading() {
  return (
    <main className={s.root} dir="rtl" aria-busy="true" aria-label="در حال بارگذاری صرافی">
      {/* Hero skeleton */}
      <section className={s.hero}>
        <div className={s.heroInner}>
          <div className={s.heroLogo}>
            <Building2 size={36} strokeWidth={1.2} aria-hidden />
          </div>
          <div className={s.skelBar} style={{ inlineSize: '60%' }} />
          <div className={s.skelBar} style={{ inlineSize: '40%' }} />
          <div className={s.skelBar} style={{ inlineSize: '50%' }} />
        </div>
      </section>

      {/* Rates skeleton */}
      <section className={s.section}>
        <div className={s.skelBar} style={{ inlineSize: '180px', blockSize: '24px' }} />
        <div className={s.skelBar} style={{ inlineSize: '320px', blockSize: '12px', marginBlockEnd: '1.5rem' }} />
        <div className={s.rateGrid}>
          {Array.from({ length: 4 }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton
            <div key={i} className={s.rateCard}>
              <div className={s.skelBar} style={{ inlineSize: '40%', blockSize: '14px' }} />
              <div className={s.skelBar} style={{ inlineSize: '70%', blockSize: '24px', marginBlockStart: '0.5rem' }} />
              <div className={s.skelBar} style={{ inlineSize: '60%', blockSize: '14px', marginBlockStart: '0.5rem' }} />
            </div>
          ))}
        </div>
      </section>

      {/* Hours + Contact skeleton */}
      <section className={s.section}>
        <div className={s.twoCol}>
          <div className={s.skelBlock}>
            <div className={s.skelBar} style={{ inlineSize: '180px', blockSize: '20px' }} />
            <div style={{ blockSize: '1.5rem' }} />
            {Array.from({ length: 7 }).map((_, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton
              <div key={i} className={s.skelBar} style={{ inlineSize: '100%', blockSize: '18px', marginBlockEnd: '0.6rem' }} />
            ))}
          </div>
          <div className={s.skelBlock}>
            <div className={s.skelBar} style={{ inlineSize: '140px', blockSize: '20px' }} />
            <div style={{ blockSize: '1.5rem' }} />
            <div className={s.skelBar} style={{ inlineSize: '90%', blockSize: '18px', marginBlockEnd: '0.6rem' }} />
            <div className={s.skelBar} style={{ inlineSize: '85%', blockSize: '18px', marginBlockEnd: '0.6rem' }} />
            <div className={s.skelBar} style={{ inlineSize: '70%', blockSize: '18px' }} />
          </div>
        </div>
      </section>
    </main>
  );
}
