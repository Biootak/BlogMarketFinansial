import type { Metadata } from 'next';
import { Database, Grid2x2, PieChart } from 'lucide-react';

import { ObsSection } from '../_components/ObsSection';
import { SlowQueryTable } from '../_components/SlowQueryTable';
import { SourceBreakdown } from '../_components/SourceBreakdown';
import { SourceHeat } from '../_components/SourceHeat';
import b from '../_components/boards.module.css';

export const metadata: Metadata = {
  title: 'کوئری‌های کند · مشاهده‌پذیری',
  description: 'کندترین مسیرهای شش ساعت اخیر، کنار منبع و ساعت فشار.',
};

/** کوئری کند — زمان اجرا کنار منبع و ساعت فشار، نه به‌عنوان یک عدد تنها. */
export default function ObservabilityQueriesPage() {
  return (
    <div className={b.tabLayout} data-tab="queries">
      <header className={b.tabIntro}>
        <div>
          <span className={b.tabEyebrow}>OPERATIONS / QUERIES</span>
          <h2 className={b.tabTitle}>کندی را به مسیر واقعی وصل کن</h2>
          <p className={b.tabLead}>
            نوار هر ردیف نسبت به بدترین رکورد همین فهرست است، نه یک سقف دلخواه؛ چون سؤال واقعی
            «چقدر بدتر از بقیه» است.
          </p>
        </div>
        <p className={b.tabStamp} data-tone="warn">
          <strong>پنجرهٔ شش ساعته</strong>
          <span>مرتب‌شده با بدترین زمان اجرا</span>
        </p>
      </header>

      <div className={b.tabGrid}>
        <ObsSection
          className={`${b.wide} ${b.featured}`}
          icon={Database}
          title="کندترین مسیرها"
          hint="پیام کامل با شکست خط درست برای متن لاتین طولانی، بدون بریدن وسط شناسه."
        >
          <SlowQueryTable />
        </ObsSection>

        <ObsSection
          className={`${b.five} ${b.recessed}`}
          icon={PieChart}
          title="منبع فشار"
          hint="کدام منبع بیشترین سهم لاگ را دارد."
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
