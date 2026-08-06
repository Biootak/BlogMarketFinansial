import type { Metadata } from 'next';
import { Grid2x2, Layers3, PieChart, ServerCog, Siren, Sparkles } from 'lucide-react';

import b from './_components/boards.module.css';
import { IncidentTimeline } from './_components/IncidentTimeline';
import { InsightStack } from './_components/InsightStack';
import { LevelDistribution } from './_components/LevelDistribution';
import { ObsSection } from './_components/ObsSection';
import { ServiceLadder } from './_components/ServiceLadder';
import { SourceBreakdown } from './_components/SourceBreakdown';
import { SourceHeat } from './_components/SourceHeat';

export const metadata: Metadata = {
  title: 'مرکز مشاهده‌پذیری',
  description: 'نمای زندهٔ سلامت سامانه بر پایهٔ لاگ‌های واقعی سیستم.',
};

/**
 * نمای کلی. جریان شبانه‌روز و نشانه‌های حیاتی در deck (layout) هستند، پس اینجا
 * تکرار نمی‌شوند؛ این صفحه به «کجا را نگاه کنم» پاسخ می‌دهد نه «چقدر ترافیک
 * داشتیم». وزن هر board با اهمیتش تعیین شده، نه با تقارن.
 */
export default function ObservabilityOverviewPage() {
  return (
    <>
      <ObsSection
        className={b.eight}
        icon={ServerCog}
        title="پرخطرترین سرویس‌ها"
        hint="پنج سرویسی که همین حالا بیشترین ریسک را دارند؛ ترتیب از وضعیت و شمار خطای واقعی می‌آید."
      >
        <ServiceLadder limit={5} />
      </ObsSection>

      <ObsSection
        className={b.four}
        icon={Sparkles}
        title="یافته‌های خودکار"
        hint="هر جمله از همین snapshot ساخته شده؛ اگر شرطش برقرار نباشد اصلاً نمایش داده نمی‌شود."
      >
        <InsightStack />
      </ObsSection>

      <ObsSection
        className={b.seven}
        icon={Grid2x2}
        title="نقشهٔ گرمای منابع"
        hint="پرحجم‌ترین منابع لاگ در برابر ساعت‌های شبانه‌روز."
      >
        <SourceHeat />
      </ObsSection>

      <ObsSection
        className={b.five}
        icon={Siren}
        title="پنجره‌های بحرانی"
        hint="بازه‌هایی که نرخ خطا از سه برابر میانگین شبانه‌روز گذشته است."
      >
        <IncidentTimeline />
      </ObsSection>

      <ObsSection
        className={b.seven}
        icon={PieChart}
        title="سهم منابع از ترافیک"
        hint="چه بخشی از حجم لاگ از کدام منبع می‌آید و چقدرش خطاست."
      >
        <SourceBreakdown />
      </ObsSection>

      <ObsSection
        className={b.five}
        icon={Layers3}
        title="توزیع سطوح لاگ"
        hint="نسبت info و warn و error در کل حجم پنجره."
      >
        <LevelDistribution />
      </ObsSection>
    </>
  );
}
