import type { Metadata } from 'next';
import { Activity, Grid2x2, PieChart, ServerCog } from 'lucide-react';

import { DayStrip } from '../_components/DayStrip';
import { ObsSection } from '../_components/ObsSection';
import { ServiceLadder } from '../_components/ServiceLadder';
import { SourceBreakdown } from '../_components/SourceBreakdown';
import { SourceHeat } from '../_components/SourceHeat';
import b from '../_components/boards.module.css';

export const metadata: Metadata = {
  title: 'سرویس‌ها · مشاهده‌پذیری',
  description: 'مقایسهٔ وضعیت، روند و شاخص‌های هر سرویس بر پایهٔ لاگ‌های واقعی.',
};

/** سرویس‌ها — صفحهٔ مقایسه. نردبان کامل بالا، بعد زمینهٔ منبع و ساعت. */
export default function ObservabilityServicesPage() {
  return (
    <div className={b.tabLayout} data-tab="services">
      <header className={b.tabIntro}>
        <div>
          <span className={b.tabEyebrow}>OPERATIONS / SERVICES</span>
          <h2 className={b.tabTitle}>هر سرویس یک وضعیت، یک روند، یک تصمیم</h2>
          <p className={b.tabLead}>
            ردیف‌ها برای مقایسه ساخته شده‌اند نه برای پر کردن صفحه. ستون‌ها هم‌تراز‌اند تا چشم
            بتواند دو سرویس را بدون اسکرول کنار هم بخواند.
          </p>
        </div>
        <p className={b.tabStamp} data-tone="warn">
          <strong>مرتب‌سازی بر اساس ریسک</strong>
          <span>قطع، بعد کند، بعد سالم، آخر بی‌ترافیک</span>
        </p>
      </header>

      <div className={b.tabGrid}>
        <ObsSection
          className={`${b.wide} ${b.featured}`}
          icon={ServerCog}
          title="نردبان کامل سرویس‌ها"
          hint="وضعیت، روند بیست‌وچهار ساعت و چهار شاخص کلیدی هر سرویس در یک نمای مقایسه‌ای."
        >
          <ServiceLadder />
        </ObsSection>

        <ObsSection
          className={b.eight}
          icon={Grid2x2}
          title="توزیع ساعتی منابع"
          hint="فشار را در تقاطع منبع و ساعت پیدا کن، نه در مجموع‌های کلی."
        >
          <SourceHeat />
        </ObsSection>

        <ObsSection
          className={`${b.four} ${b.recessed}`}
          icon={PieChart}
          title="سهم منابع"
          hint="کدام منبع بیشترین حجم را دارد و چه سهمی از آن خطاست."
        >
          <SourceBreakdown />
        </ObsSection>

        <ObsSection
          className={b.wide}
          icon={Activity}
          title="ریتم شبانه‌روز"
          hint="ساعت را عوض کن تا نمودار کوچک هر سرویس هم روی همان لحظه قفل شود."
        >
          <DayStrip />
        </ObsSection>
      </div>
    </div>
  );
}
