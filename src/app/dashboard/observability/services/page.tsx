import { Grid2x2, PieChart, ServerCog } from 'lucide-react';
import type { Metadata } from 'next';
import { ObsSection } from '../_components/ObsSection';
import { ServiceLadder } from '../_components/ServiceLadder';
import { SourceBreakdown } from '../_components/SourceBreakdown';
import { SourceHeat } from '../_components/SourceHeat';
import b from '../_components/boards.module.css';

export const metadata: Metadata = { title: 'سرویس‌ها · مشاهده‌پذیری' };
export default function ObservabilityServicesPage() {
  return (
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
      </div>
    </div>
  );
}
