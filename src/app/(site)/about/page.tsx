import React from 'react';
import SectionHero from '@/components/SectionHero/SectionHero';
import rightImg from '@/images/about-hero-right.png';
import SectionStatistic from './SectionStatistic';
import SectionSubscribe2 from '@/components/SectionSubscribe2/SectionSubscribe2';
import BgGlassmorphism from '@/components/BgGlassmorphism/BgGlassmorphism';
import BackgroundSection from '@/components/BackgroundSection/BackgroundSection';

const PageAbout = () => {
  return (
    <div className={'nc-PageAbout relative rtl'}>
      {/* ======== BG GLASS ======== */}
      <BgGlassmorphism />

      <div className="container py-6 space-y-12 lg:space-y-20">
        <SectionHero
          rightImg={rightImg}
          heading="درباره ما"
          btnText=""
          subHeading="ما بی‌طرف و مستقل هستیم و هر روز برنامه‌ها و محتوای متمایز و در سطح جهانی ایجاد می‌کنیم که میلیون‌ها نفر را در سراسر جهان آگاه، آموزش و سرگرم می‌کند."
        />

        <div className="relative py-12">
          <BackgroundSection />
          <SectionStatistic />
        </div>

        <SectionSubscribe2 />
      </div>
    </div>
  );
};

export default PageAbout;
