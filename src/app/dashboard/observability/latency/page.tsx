import type { Metadata } from 'next';
import { Activity, Gauge } from 'lucide-react';

import { DayStrip } from '../_components/DayStrip';
import { LatencyScale } from '../_components/LatencyScale';
import { ObsSection } from '../_components/ObsSection';

export const metadata: Metadata = {
  title: 'تأخیر · مشاهده‌پذیری',
};

export default function ObservabilityLatencyPage() {
  return (
    <>
      <ObsSection
        icon={Gauge}
        title="محور صدک‌ها"
        hint="p50 و p95 و p99 روی یک محور مشترک تا کشیدگی دم توزیع دیده شود، نه سه عدد جدا افتاده."
      >
        <LatencyScale />
      </ObsSection>

      <ObsSection
        icon={Activity}
        title="بار سامانه در شبانه‌روز"
        hint="حجم رویداد هر ساعت در کنار سهم خطای همان ساعت."
      >
        <DayStrip />
      </ObsSection>
    </>
  );
}
