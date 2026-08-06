import type { Metadata } from 'next';
import { Database, PieChart } from 'lucide-react';

import { ObsSection } from '../_components/ObsSection';
import { SlowQueryTable } from '../_components/SlowQueryTable';
import { SourceBreakdown } from '../_components/SourceBreakdown';

export const metadata: Metadata = {
  title: 'کوئری‌های کند · مشاهده‌پذیری',
};

export default function ObservabilityQueriesPage() {
  return (
    <>
      <ObsSection
        icon={Database}
        title="کندترین مسیرها"
        hint="شش ساعت اخیر، مرتب‌شده بر اساس بدترین زمان اجرا."
      >
        <SlowQueryTable />
      </ObsSection>

      <ObsSection
        icon={PieChart}
        title="منبع فشار"
        hint="کدام منبع بیشترین سهم لاگ را دارد؛ معمولاً همان‌جاست که کندی شروع می‌شود."
      >
        <SourceBreakdown />
      </ObsSection>
    </>
  );
}
