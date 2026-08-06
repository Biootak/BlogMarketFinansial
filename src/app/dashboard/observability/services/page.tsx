import type { Metadata } from 'next';
import { Grid2x2, PieChart, ServerCog } from 'lucide-react';

import b from '../_components/boards.module.css';
import { ObsSection } from '../_components/ObsSection';
import { ServiceLadder } from '../_components/ServiceLadder';
import { SourceBreakdown } from '../_components/SourceBreakdown';
import { SourceHeat } from '../_components/SourceHeat';

export const metadata: Metadata = {
  title: 'سرویس‌ها · مشاهده‌پذیری',
};

export default function ObservabilityServicesPage() {
  return (
    <>
      <ObsSection
        className={b.wide}
        icon={ServerCog}
        title="نردبان سرویس‌ها"
        hint="وضعیت هر سرویس از لاگ‌های همان منبع در پانزده دقیقهٔ اخیر محاسبه می‌شود؛ نوار کوچک، حجم واقعی هر ساعت است."
      >
        <ServiceLadder />
      </ObsSection>

      <ObsSection
        className={b.seven}
        icon={Grid2x2}
        title="توزیع ساعتی منابع"
        hint="برای دیدن اینکه فشار روی کدام منبع و در کدام ساعت بوده است."
      >
        <SourceHeat />
      </ObsSection>

      <ObsSection
        className={b.five}
        icon={PieChart}
        title="سهم منابع از ترافیک"
        hint="سهم هر منبع از کل حجم پنجره، در کنار سهم خطای خودش."
      >
        <SourceBreakdown />
      </ObsSection>
    </>
  );
}
