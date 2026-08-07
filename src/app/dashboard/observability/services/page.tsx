<<<<<<< HEAD
import { Grid2x2, PieChart, ServerCog } from 'lucide-react';
import type { Metadata } from 'next';
=======
import type { Metadata } from 'next';
import { Activity, Grid2x2, PieChart, ServerCog } from 'lucide-react';

import { DayStrip } from '../_components/DayStrip';
>>>>>>> cc577b44f17b1f7d6d64006fdcd7dcb18ca2898f
import { ObsSection } from '../_components/ObsSection';
import { ServiceLadder } from '../_components/ServiceLadder';
import { SourceBreakdown } from '../_components/SourceBreakdown';
import { SourceHeat } from '../_components/SourceHeat';
import b from '../_components/boards.module.css';

export const metadata: Metadata = { title: 'سرویس‌ها · مشاهده‌پذیری' };

/** سرویس‌ها — صفحهٔ مقایسه. نردبان کامل بالا، بعد زمینهٔ منبع و ساعت. */
export default function ObservabilityServicesPage() {
  return (
<<<<<<< HEAD
    <div className={b.tabLayout} data-tab="services">
      <div className={b.tabIntro}>
        <div>
          <span className={b.tabEyebrow}>OPERATIONS / SERVICES</span>
          <h2 className={b.tabTitle}>هر سرویس یک وضعیت، یک روند، یک تصمیم</h2>
          <p className={b.tabLead}>
            ردیف‌ها برای مقایسه ساخته شده‌اند، نه برای پر کردن صفحه. پرریسک‌ترین مورد همیشه بالاتر
            می‌آید.
          </p>
        </div>
        <div className={b.tabStamp}>
          <strong>مرتب‌سازی: ریسک</strong>
          <span>down، degraded، healthy</span>
        </div>
      </div>
      <div className={b.tabGrid}>
        <ObsSection
          className={`${b.wide} ${b.featured}`}
          icon={ServerCog}
          title="نردبان سرویس‌ها"
          hint="وضعیت، روند ۲۴ ساعت و شاخص‌های هر سرویس در یک نمای مقایسه‌ای."
        >
          <ServiceLadder />
        </ObsSection>
        <ObsSection
          className={b.seven}
          icon={Grid2x2}
          title="توزیع ساعتی منابع"
          hint="فشار را بین منبع و ساعت پیدا کن."
        >
          <SourceHeat />
        </ObsSection>
        <ObsSection
          className={b.five}
          icon={PieChart}
          title="سهم منابع از ترافیک"
          hint="سهم حجم و خطا برای هر منبع."
        >
          <SourceBreakdown />
        </ObsSection>
=======
    <div className={b.tab} data-tab="services">
      <header className={b.intro}>
        <div>
          <span className={b.eyebrow}>OPERATIONS / SERVICES</span>
          <h2 className={b.title}>هر سرویس یک وضعیت، یک روند، یک تصمیم</h2>
          <p className={b.lead}>
            ردیف‌ها برای مقایسه ساخته شده‌اند نه برای پر کردن صفحه. ستون‌ها هم‌تراز‌اند تا چشم
            بتواند دو سرویس را بدون اسکرول کنار هم بخواند.
          </p>
        </div>
        <p className={b.stamp} data-tone="warn">
          <strong>مرتب‌سازی بر اساس ریسک</strong>
          <span>قطع، بعد کند، بعد سالم، آخر بی‌ترافیک</span>
        </p>
      </header>

      <div className={b.board}>
        <ObsSection
          className={`${b.span12} ${b.featured}`}
          icon={ServerCog}
          title="نردبان کامل سرویس‌ها"
          hint="وضعیت، روند بیست‌وچهار ساعت و چهار شاخص کلیدی هر سرویس در یک نمای مقایسه‌ای."
        >
          <ServiceLadder />
        </ObsSection>

        <ObsSection
          className={b.span8}
          icon={Grid2x2}
          title="توزیع ساعتی منابع"
          hint="فشار را در تقاطع منبع و ساعت پیدا کن، نه در مجموع‌های کلی."
        >
          <SourceHeat />
        </ObsSection>

        <ObsSection
          className={`${b.span4} ${b.recessed}`}
          icon={PieChart}
          title="سهم منابع"
          hint="کدام منبع بیشترین حجم را دارد و چه سهمی از آن خطاست."
        >
          <SourceBreakdown />
        </ObsSection>

        <ObsSection
          className={b.span12}
          icon={Activity}
          title="ریتم شبانه‌روز"
          hint="ساعت را عوض کن تا نمودار کوچک هر سرویس هم روی همان لحظه قفل شود."
        >
          <DayStrip />
        </ObsSection>
>>>>>>> cc577b44f17b1f7d6d64006fdcd7dcb18ca2898f
      </div>
    </div>
  );
}
