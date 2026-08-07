import { Database, Grid2x2, PieChart } from 'lucide-react';
import type { Metadata } from 'next';
import { ObsSection } from '../_components/ObsSection';
import { SlowQueryTable } from '../_components/SlowQueryTable';
import { SourceBreakdown } from '../_components/SourceBreakdown';
import { SourceHeat } from '../_components/SourceHeat';
import b from '../_components/boards.module.css';

export const metadata: Metadata = { title: 'کوئری‌های کند · مشاهده‌پذیری' };
export default function ObservabilityQueriesPage() {
  return (
    <div className={b.tabLayout} data-tab="queries">
      <div className={b.tabIntro}>
        <div>
          <span className={b.tabEyebrow}>OPERATIONS / QUERIES</span>
          <h2 className={b.tabTitle}>کندی را به مسیر واقعی وصل کن</h2>
          <p className={b.tabLead}>
            به‌جای یک عدد جدا، زمان اجرا را کنار منبع، ساعت فشار و سهم ترافیک می‌خوانیم.
          </p>
        </div>
        <div className={b.tabStamp}>
          <strong>پنجره: ۶ ساعت</strong>
          <span>مرتب‌شده با بدترین زمان اجرا</span>
        </div>
      </div>
      <div className={b.tabGrid}>
        <ObsSection
          className={`${b.wide} ${b.featured}`}
          icon={Database}
          title="کندترین مسیرها"
          hint="مسیرهای سنگین در اول صف، با خوانایی مناسب برای پیام‌های طولانی."
        >
          <SlowQueryTable />
        </ObsSection>
        <ObsSection
          className={b.five}
          icon={PieChart}
          title="منبع فشار"
          hint="کدام منبع بیشترین سهم لاگ را دارد؟"
        >
          <SourceBreakdown />
        </ObsSection>
        <ObsSection
          className={b.seven}
          icon={Grid2x2}
          title="کندی در کدام ساعت"
          hint="تطبیق زمان اجرای کند با پنجرهٔ ترافیک."
        >
          <SourceHeat />
        </ObsSection>
      </div>
    </div>
  );
}
