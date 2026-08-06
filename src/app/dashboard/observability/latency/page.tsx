import type { Metadata } from 'next';
import { Activity, Gauge, ServerCog } from 'lucide-react';

import b from '../_components/boards.module.css';
import { DayStrip } from '../_components/DayStrip';
import { LatencyScale } from '../_components/LatencyScale';
import { ObsSection } from '../_components/ObsSection';
import { ServiceLadder } from '../_components/ServiceLadder';

export const metadata: Metadata = {
  title: 'تأخیر · مشاهده‌پذیری',
};

export default function ObservabilityLatencyPage() {
  return (
    <>
      <ObsSection
        className={b.wide}
        icon={Gauge}
        title="محور صدک‌ها"
        hint="p50 و p95 و p99 روی یک محور مشترک تا کشیدگی دم توزیع دیده شود، نه سه عدد جدا افتاده."
      >
        <LatencyScale />
      </ObsSection>

      <ObsSection
        className={b.seven}
        icon={Activity}
        title="بار سامانه در شبانه‌روز"
        hint="حجم رویداد هر ساعت در کنار سهم خطای همان ساعت؛ ستونی و قابل انتخاب."
      >
        <DayStrip />
      </ObsSection>

      <ObsSection
        className={b.five}
        icon={ServerCog}
        title="تأخیر به تفکیک سرویس"
        hint="تأخیر هر سرویس در کنار در دسترس بودن و شمار خطای همان سرویس."
      >
        <ServiceLadder limit={6} />
      </ObsSection>
    </>
  );
}
