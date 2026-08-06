import type { Metadata } from 'next';
import { Activity, Grid2x2, Layers3, Layers, PieChart } from 'lucide-react';

import b from '../_components/boards.module.css';
import { LevelDistribution } from '../_components/LevelDistribution';
import { ObsSection } from '../_components/ObsSection';
import { ServiceLadder } from '../_components/ServiceLadder';
import { SourceBreakdown } from '../_components/SourceBreakdown';
import { SourceHeat } from '../_components/SourceHeat';
import { SystemVitals } from '../_components/SystemVitals';

export const metadata: Metadata = {
  title: 'سرویس‌ها · مشاهده‌پذیری',
  description: 'وضعیت، تأخیر و در دسترس بودن هر سرویس بر پایهٔ لاگ‌های همان منبع.',
};

/**
 * سرویس‌ها — این زیرمسیر در ناوبری فرعی لینک داشت ولی صفحه‌ای برایش وجود
 * نداشت (۴۰۴). حالا فهرست کامل سرویس‌ها با همان نردبان ریسک، در کنار تفکیک
 * منبع و توزیع سطوح، اینجا خوانده می‌شود.
 */
export default function ObservabilityServicesPage() {
  return (
    <>
      <ObsSection
        index={1}
        className={b.full}
        icon={Layers}
        title="همهٔ سرویس‌ها به ترتیب ریسک"
        hint="وضعیت هر سرویس از شمار خطا و هشدار پانزده دقیقهٔ اخیر همان منبع محاسبه می‌شود؛ «بی‌ترافیک» یعنی هیچ لاگی نداشته، نه اینکه سالم است."
      >
        <ServiceLadder />
      </ObsSection>

      <ObsSection
        index={2}
        className={b.wide}
        icon={Grid2x2}
        title="ردپای ساعتی هر منبع"
        hint="کدام سرویس در کدام ساعت شلوغ بوده؛ روی همان محور ۲۴ ساعتهٔ بالای صفحه قفل است."
      >
        <SourceHeat />
      </ObsSection>

      <ObsSection
        index={3}
        className={b.side}
        icon={Layers3}
        title="توزیع سطوح لاگ"
        hint="سهم هر سطح از کل حجم پنجره — نسبت warn به info معیار خوبی برای نویز است."
      >
        <LevelDistribution />
      </ObsSection>

      <ObsSection
        index={4}
        className={b.wide}
        icon={PieChart}
        title="سهم منابع از ترافیک"
        hint="پرحجم‌ترین منبع همیشه پرخطرترین نیست؛ ستون خطا را کنار سهم حجم بخوانید."
      >
        <SourceBreakdown />
      </ObsSection>

      <ObsSection
        index={5}
        className={b.side}
        icon={Activity}
        title="نشانه‌های حیاتی"
        hint="اعداد پنجرهٔ جاری برای زمینه‌دادن به فهرست بالا."
      >
        <SystemVitals />
      </ObsSection>
    </>
  );
}
