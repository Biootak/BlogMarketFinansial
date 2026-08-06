import type { Metadata } from 'next';
import { Database, Grid2x2, PieChart } from 'lucide-react';

import b from '../_components/boards.module.css';
import { ObsSection } from '../_components/ObsSection';
import { SlowQueryTable } from '../_components/SlowQueryTable';
import { SourceBreakdown } from '../_components/SourceBreakdown';
import { SourceHeat } from '../_components/SourceHeat';

export const metadata: Metadata = {
  title: 'کوئری‌های کند · مشاهده‌پذیری',
  description: 'کندترین مسیرهای شش ساعت اخیر و منبع فشار.',
};

export default function ObservabilityQueriesPage() {
  return (
    <>
      <ObsSection
        index={1}
        className={b.full}
        icon={Database}
        title="کندترین مسیرها"
        hint="شش ساعت اخیر، مرتب‌شده بر اساس بدترین زمان اجرا. ستون مدت اول آمده چون همان چیزی است که تصمیم می‌سازد."
        tone="warn"
      >
        <SlowQueryTable />
      </ObsSection>

      <ObsSection
        index={2}
        className={b.wide}
        icon={Grid2x2}
        title="کندی در کدام ساعت"
        hint="نقشهٔ گرمای منبع روی محور مشترک — برای تطبیق کندی با پنجرهٔ ترافیک."
      >
        <SourceHeat />
      </ObsSection>

      <ObsSection
        index={3}
        className={b.side}
        icon={PieChart}
        title="منبع فشار"
        hint="کدام منبع بیشترین سهم لاگ را دارد؛ معمولاً همان‌جاست که کندی شروع می‌شود."
      >
        <SourceBreakdown />
      </ObsSection>
    </>
  );
}
