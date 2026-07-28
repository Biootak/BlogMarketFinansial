/**
 * /exchanges/[slug]/loading — Skeleton P2026.
 * Mirrors HeroIdentity + LiveRatesBoard + TrustSection skeleton.
 */

import s from './loading.module.css';

export default function ExchangePublicLoading() {
  return (
    <div className={s.root} dir="rtl" aria-busy="true" aria-label="در حال بارگذاری">
      {/* Hero skeleton (dark) */}
      <div className={s.hero}>
        <div className={s.heroGrid} aria-hidden>
          <svg viewBox="0 0 800 480" preserveAspectRatio="xMidYMid slice">
            <rect width="100%" height="100%" fill="url(#lGrid)" />
            <defs>
              <pattern id="lGrid" width="48" height="48" patternUnits="userSpaceOnUse">
                <path d="M 48 0 L 0 0 0 48" fill="none" stroke="currentColor" strokeWidth="0.5" />
              </pattern>
            </defs>
          </svg>
        </div>
        <div className={s.heroInner}>
          <div className={s.heroLeft}>
            <div className={s.pillRow}>
              <div className={`${s.skel} ${s.skelPill}`} />
              <div className={`${s.skel} ${s.skelPillSm}`} />
            </div>
            <div className={s.identityRow}>
              <div className={`${s.skel} ${s.skelLogo}`} />
              <div className={s.identityText}>
                <div className={`${s.skel} ${s.skelName}`} />
                <div className={`${s.skel} ${s.skelMeta}`} />
                <div className={`${s.skel} ${s.skelMetaSm}`} />
              </div>
            </div>
            <div className={s.statsRow}>
              <div className={`${s.skel} ${s.skelStat}`} />
              <div className={`${s.skel} ${s.skelStat}`} />
              <div className={`${s.skel} ${s.skelStat}`} />
            </div>
          </div>
          <div className={s.heroRight}>
            <div className={s.rateCard}>
              <div className={`${s.skel} ${s.skelRateLabel}`} />
              <div className={`${s.skel} ${s.skelRateHero}`} />
              <div className={`${s.skel} ${s.skelRateSpark}`} />
              <div className={s.rateBottomRow}>
                <div className={`${s.skel} ${s.skelRateCol}`} />
                <div className={`${s.skel} ${s.skelRateCol}`} />
                <div className={`${s.skel} ${s.skelRateCol}`} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Rates skeleton */}
      <div className={s.section}>
        <div className={s.sectionHeader}>
          <div className={`${s.skel} ${s.skelTitle}`} />
          <div className={`${s.skel} ${s.skelSub}`} />
        </div>
        <div className={s.grid}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className={s.card}>
              <div className={s.cardHead}>
                <div className={`${s.skel} ${s.skelCoin}`} />
                <div className={`${s.skel} ${s.skelSpread}`} />
              </div>
              <div className={`${s.skel} ${s.skelSpark}`} />
              <div className={s.cardFoot}>
                <div className={`${s.skel} ${s.skelLine}`} />
                <div className={`${s.skel} ${s.skelLineSm}`} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
