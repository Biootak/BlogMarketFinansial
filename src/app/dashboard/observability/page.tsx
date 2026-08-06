import type { Metadata } from 'next';
import { Activity, Grid2x2, PieChart, ServerCog, Siren } from 'lucide-react';

import { DayStrip } from './_components/DayStrip';
import { IncidentTimeline } from './_components/IncidentTimeline';
import { ObsSection } from './_components/ObsSection';
import { ServiceLadder } from './_components/ServiceLadder';
import { SourceBreakdown } from './_components/SourceBreakdown';
import { SourceHeat } from './_components/SourceHeat';

export const metadata: Metadata = {
  title: 'مرکز مشاهده‌پذیری',
  description: 'نمای زندهٔ سلامت سامانه بر پایهٔ لاگ‌های واقعی سیستم.',
};

export default function ObservabilityOverviewPage() {
  return (
    <>
      <ObsSection
        icon={Activity}
        title="جریان شبانه‌روز"
        hint="هر ستون یک ساعت است؛ ارتفاع یعنی حجم رویداد و بخش سرخ یعنی خطا. روی ستون کلیک یا با Tab حرکت کنید تا خوانش همان ساعت باز شود."
      >
        <DayStrip />
      </ObsSection>

      <ObsSection
        icon={Siren}
        title="پنجره‌های بحرانی"
        hint="بازه‌هایی که نرخ خطا از سه برابر میانگین شبانه‌روز گذشته است."
      >
        <IncidentTimeline />
      </ObsSection>

      <ObsSection
        icon={Grid2x2}
        title="نقشهٔ گرمای منابع"
        hint="پرحجم‌ترین منابع لاگ در برابر ساعت‌های شبانه‌روز."
      >
        <SourceHeat />
      </ObsSection>

      <ObsSection
        icon={ServerCog}
        title="پرخطرترین سرویس‌ها"
        hint="پنج سرویسی که همین حالا بیشترین ریسک را دارند."
      >
        <ServiceLadder limit={5} />
      </ObsSection>

      <ObsSection
        icon={PieChart}
        title="سهم منابع از ترافیک"
        hint="چه بخشی از حجم لاگ از کدام منبع می‌آید و چقدرش خطاست."
      >
        <SourceBreakdown />
      </ObsSection>
    </>
  );
}
