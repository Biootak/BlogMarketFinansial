import type { Metadata } from 'next';
import { Activity, Grid2x2, Layers3, PieChart, ServerCog, Siren, Sparkles } from 'lucide-react';

import b from './_components/boards.module.css';
import { IncidentTimeline } from './_components/IncidentTimeline';
import { InsightStack } from './_components/InsightStack';
import { LevelDistribution } from './_components/LevelDistribution';
import { ObsSection } from './_components/ObsSection';
import { ServiceLadder } from './_components/ServiceLadder';
import { SourceBreakdown } from './_components/SourceBreakdown';
import { SourceHeat } from './_components/SourceHeat';
import { SystemVitals } from './_components/SystemVitals';

export const metadata: Metadata = {
  title: 'مرکز مشاهده‌پذیری',
  description: 'نمای زندهٔ سلامت سامانه بر پایهٔ لاگ‌های واقعی سیستم.',
};

/**
 * نمای کلی. حکم سامانه و پارتیتور ۲۴ ساعته در layout هستند، پس اینجا تکرار
 * نمی‌شوند؛ این صفحه به «کجا را نگاه کنم» پاسخ می‌دهد نه «چقدر ترافیک داشتیم».
 * وزن هر بلوک با اهمیتش تعیین شده، نه با تقارن.
 */
export default function ObservabilityOverviewPage() {
  return (
    <>
      <ObsSection
        index={1}
        className={b.lead}
        icon={ServerCog}
        title="پرخطرترین سرویس‌ها"
        hint="پنج سرویسی که همین حالا بیشترین ریسک را دارند؛ ترتیب از وضعیت و شمار خطای واقعی می‌آید."
      >
        <ServiceLadder limit={5} />
      </ObsSection>

      <ObsSection
        index={2}
        className={b.note}
        icon={Sparkles}
        title="یافته‌های خودکار"
        hint="هر جمله از همین snapshot ساخته شده؛ اگر شرطش برقرار نباشد اصلاً نمایش داده نمی‌شود."
      >
        <InsightStack />
      </ObsSection>

      <ObsSection
        index={3}
        className={b.full}
        icon={Activity}
        title="نشانه‌های حیاتی"
        hint="هشت عدد واقعی پنجرهٔ جاری، هرکدام با مقیاس نسبی خودش تا بزرگی عدد معنا پیدا کند."
      >
        <SystemVitals />
      </ObsSection>

      <ObsSection
        index={4}
        className={b.wide}
        icon={Grid2x2}
        title="نقشهٔ گرمای منابع"
        hint="پرحجم‌ترین منابع لاگ روی همان محور ۲۴ ساعتهٔ بالای صفحه؛ کلیک روی هر خانه مکان‌نما را جابه‌جا می‌کند."
      >
        <SourceHeat />
      </ObsSection>

      <ObsSection
        index={5}
        className={b.side}
        icon={Siren}
        title="پنجره‌های بحرانی"
        hint="بازه‌هایی که نرخ خطا از سه برابر میانگین شبانه‌روز گذشته است."
        tone="bad"
      >
        <IncidentTimeline />
      </ObsSection>

      <ObsSection
        index={6}
        className={b.wide}
        icon={PieChart}
        title="سهم منابع از ترافیک"
        hint="چه بخشی از حجم لاگ از کدام منبع می‌آید و چقدرش خطاست."
      >
        <SourceBreakdown />
      </ObsSection>

      <ObsSection
        index={7}
        className={b.side}
        icon={Layers3}
        title="توزیع سطوح لاگ"
        hint="نسبت info و warn و error در کل حجم پنجره."
      >
        <LevelDistribution />
      </ObsSection>
    </>
  );
}
