import type { Metadata } from 'next';
import { Database, Grid2x2, PieChart } from 'lucide-react';

import { ObsSection } from '../_components/ObsSection';
import { SlowQueryTable } from '../_components/SlowQueryTable';
import { SourceBreakdown } from '../_components/SourceBreakdown';
import { SourceHeat } from '../_components/SourceHeat';
import b from '../_components/boards.module.css';

export const metadata: Metadata = { title: 'کوئری‌های کند · مشاهده‌پذیری' };

/** کوئری کند — زمان اجرا کنار منبع و ساعت فشار، نه به‌عنوان یک عدد تنها. */
export default function ObservabilityQueriesPage() {
  return (
    <div className={b.tab} data-tab="queries">
      <header className={b.intro}>
        <div>
          <span className={b.eyebrow}>OPERATIONS / QUERIES</span>
          <h2 className={b.title}>کندی را به مسیر واقعی وصل کن</h2>
          <p className={b.lead}>
            نوار هر ردیف نسبت به بدترین رکورد همین فهرست است، نه یک سقف دلخواه؛ چون سؤال واقعی
            «چقدر بدتر از بقیه» است.
          </p>
        </div>
        <p className={b.stamp} data-tone="warn">
          <strong>پنجرهٔ شش ساعته</strong>
          <span>مرتب‌شده با بدترین زمان اجرا</span>
        </p>
      </header>

      <div className={b.board}>
        <ObsSection
          className={`${b.span12} ${b.featured}`}
          icon={Database}
          title="کندترین مسیرها"
          hint="پیام کامل با شکست خط درست برای متن لاتین طولانی، بدون بریدن وسط شناسه."
        >
          <SlowQueryTable />
        </ObsSection>

        <ObsSection
          className={`${b.span5} ${b.recessed}`}
          icon={PieChart}
          title="منبع فشار"
          hint="کدام منبع بیشترین سهم لاگ را دارد."
        >
          <SourceBreakdown />
        </ObsSection>

        <ObsSection
          className={b.span7}
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
