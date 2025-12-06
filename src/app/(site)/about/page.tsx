import BackgroundSection from '@/components/BackgroundSection/BackgroundSection';
import BgGlassmorphism from '@/components/BgGlassmorphism/BgGlassmorphism';
import SectionHero from '@/components/SectionHero/SectionHero';
import SectionSubscribe2 from '@/components/SectionSubscribe2/SectionSubscribe2';
import React from 'react';
import SectionStatistic from './SectionStatistic';

const PageAbout = () => {
  return (
    <div className={'nc-PageAbout relative rtl'}>
      {/* ======== BG GLASS ======== */}
      <BgGlassmorphism />

      <div className="container py-6 space-y-16 lg:space-y-28">
        <SectionHero
          rightImg="/images/about-hero-right.png"
          heading="👋 درباره ما"
          btnText=""
          subHeading="ما بی‌طرف و مستقل هستیم و هر روز برنامه‌ها و محتوای متمایز و در سطح جهانی ایجاد می‌کنیم که میلیون‌ها نفر را در سراسر جهان آگاه، آموزش و سرگرم می‌کند."
        />

        <div className="relative py-16">
          <BackgroundSection />
          <SectionStatistic />
        </div>

        <SectionSubscribe2 />
      </div>
    </div>
  );
};

export default PageAbout;
