import type { Metadata } from 'next';
import { Database, Grid2x2, PieChart } from 'lucide-react';

import b from '../_components/boards.module.css';
import { ObsSection } from '../_components/ObsSection';
import { SlowQueryTable } from '../_components/SlowQueryTable';
import { SourceBreakdown } from '../_components/SourceBreakdown';
import { SourceHeat } from '../_components/SourceHeat';

export const metadata: Metadata = {
  title: 'کوئری‌های کند · مشاهده‌پذیری',
};

export default function ObservabilityQueriesPage() {
  return (
    <>
      <ObsSection
        className={b.wide}
        icon={Database}
        title="کندترین مسیرها"
        hint="شش ساعت اخیر، مرتب‌شده بر اساس بدترین زمان اجرا."
      >
        <SlowQueryTable />
      </ObsSection>

      <ObsSection
        className={b.five}
        icon={PieChart}
        title="منبع فشار"
        hint="کدام منبع بیشترین سهم لاگ را دارد؛ معمولاً همان‌جاست که کندی شروع می‌شود."
      >
        <SourceBreakdown />
      </ObsSection>

      <ObsSection
        className={b.seven}
        icon={Grid2x2}
        title="کندی در کدام ساعت"
        hint="نقشهٔ گرمای منبع در برابر ساعت — برای تطبیق کندی با پنجرهٔ ترافیک."
      >
        <SourceHeat />
      </ObsSection>
    </>
  );
}
