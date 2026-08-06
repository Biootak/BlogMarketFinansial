import type { Metadata } from 'next';
import { Activity, Gauge, ServerCog, Sparkles } from 'lucide-react';

import b from '../_components/boards.module.css';
import { InsightStack } from '../_components/InsightStack';
import { LatencyScale } from '../_components/LatencyScale';
import { ObsSection } from '../_components/ObsSection';
import { ServiceLadder } from '../_components/ServiceLadder';
import { SystemVitals } from '../_components/SystemVitals';

export const metadata: Metadata = {
  title: 'تأخیر · مشاهده‌پذیری',
  description: 'صدک‌های تأخیر و کشیدگی دم توزیع بر پایهٔ نمونه‌های واقعی duration.',
};

export default function ObservabilityLatencyPage() {
  return (
    <>
      <ObsSection
        index={1}
        className={b.full}
        icon={Gauge}
        title="شانهٔ توزیع تأخیر"
        hint="p50 و p95 و p99 روی یک محور مشترک؛ پهنای ناحیهٔ سایه‌دار بین p95 و p99 همان چیزی است که بدترین درصد کاربران تجربه می‌کنند."
      >
        <LatencyScale />
      </ObsSection>

      <ObsSection
        index={2}
        className={b.lead}
        icon={ServerCog}
        title="تأخیر به تفکیک سرویس"
        hint="تأخیر هر سرویس در کنار در دسترس بودن و شمار خطای همان سرویس."
      >
        <ServiceLadder limit={6} />
      </ObsSection>

      <ObsSection
        index={3}
        className={b.note}
        icon={Sparkles}
        title="یافته‌های خودکار"
        hint="اگر صدک‌ها مشتق‌شده باشند همین‌جا صریح گفته می‌شود؛ عدد بی‌منبع قابل استناد نیست."
      >
        <InsightStack />
      </ObsSection>

      <ObsSection
        index={4}
        className={b.full}
        icon={Activity}
        title="نشانه‌های حیاتی"
        hint="حجم، خطا، حافظه و عمر پروسه — زمینهٔ لازم برای تفسیر صدک‌ها."
      >
        <SystemVitals />
      </ObsSection>
    </>
  );
}
