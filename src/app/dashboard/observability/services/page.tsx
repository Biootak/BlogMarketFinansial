import type { Metadata } from 'next';
import { Grid2x2, ServerCog } from 'lucide-react';

import { ObsSection } from '../_components/ObsSection';
import { ServiceLadder } from '../_components/ServiceLadder';
import { SourceHeat } from '../_components/SourceHeat';

export const metadata: Metadata = {
  title: 'سرویس‌ها · مشاهده‌پذیری',
};

export default function ObservabilityServicesPage() {
  return (
    <>
      <ObsSection
        icon={ServerCog}
        title="نردبان سرویس‌ها"
        hint="وضعیت هر سرویس از لاگ‌های همان منبع در پانزده دقیقهٔ اخیر محاسبه می‌شود؛ نوار کوچک، حجم واقعی هر ساعت است."
      >
        <ServiceLadder />
      </ObsSection>

      <ObsSection
        icon={Grid2x2}
        title="توزیع ساعتی منابع"
        hint="برای دیدن اینکه فشار روی کدام منبع و در کدام ساعت بوده است."
      >
        <SourceHeat />
      </ObsSection>
    </>
  );
}
