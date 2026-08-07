import type { Metadata } from 'next';
import { Activity, Grid2x2, Layers3, PieChart, ServerCog, Siren, Sparkles } from 'lucide-react';

import { DayStrip } from './_components/DayStrip';
import { IncidentTimeline } from './_components/IncidentTimeline';
import { InsightStack } from './_components/InsightStack';
import { LevelDistribution } from './_components/LevelDistribution';
import { ObsSection } from './_components/ObsSection';
import { ServiceLadder } from './_components/ServiceLadder';
import { SourceBreakdown } from './_components/SourceBreakdown';
import { SourceHeat } from './_components/SourceHeat';
import b from './_components/boards.module.css';

export const metadata: Metadata = {
  title: 'مرکز مشاهده‌پذیری',
  description: 'نمای زندهٔ سلامت سامانه بر پایهٔ لاگ‌های واقعی سیستم.',
};

/**
 * نمای کلی.
 * ترتیب مدخل‌ها یک استدلال است، نه یک چیدمان: اول «کجا آتش گرفته»، بعد
 * «چه چیزی خودکار پیدا شده»، بعد «کِی اتفاق افتاده»، و آخر «از کجا آمده».
 */
export default function ObservabilityOverviewPage() {
  return (
    <div className={b.tab} data-tab="overview">
      <header className={b.intro}>
        <div>
          <span className={b.eyebrow}>OPERATIONS / OVERVIEW</span>
          <h2 className={b.title}>اول آتش را پیدا کن، بعد نمودار را بخوان</h2>
          <p className={b.lead}>
            این نما از مهم‌ترین نشانه‌ها شروع می‌کند: سرویس‌های پرریسک، یافته‌های قابل اقدام و
            پنجره‌هایی که فشار در آن‌ها متمرکز شده است.
          </p>
        </div>
        <p className={b.stamp} data-tone="info">
          <strong>خوانش زنده</strong>
          <span>همهٔ اعداد از snapshot جاری سامانه می‌آیند</span>
        </p>
      </header>

      <div className={b.board}>
        <ObsSection
          className={`${b.span8} ${b.featured}`}
          icon={ServerCog}
          title="پرخطرترین سرویس‌ها"
          hint="پنج سرویس اول بر اساس وضعیت و شمار خطای واقعی؛ ردیف بالا فوری‌ترین است."
        >
          <ServiceLadder limit={5} />
        </ObsSection>

        <ObsSection
          className={`${b.span4} ${b.recessed}`}
          icon={Sparkles}
          title="یافته‌های خودکار"
          hint="هر یافته از یک عدد واقعی مشتق شده و یک مسیر بررسی دارد."
        >
          <InsightStack />
        </ObsSection>

        <ObsSection
          className={b.span12}
          icon={Activity}
          title="نوار روز"
          hint="یک ساعت را انتخاب کن؛ سرصفحه، ماتریس گرما و نمودارهای نردبان همگی روی همان لحظه قفل می‌شوند."
        >
          <DayStrip />
        </ObsSection>

        <ObsSection
          className={b.span7}
          icon={Grid2x2}
          title="نقشهٔ گرمای منابع"
          hint="پرحجم‌ترین منابع لاگ در برابر ساعت‌های شبانه‌روز."
        >
          <SourceHeat />
        </ObsSection>

        <ObsSection
          className={b.span5}
          icon={Siren}
          title="پنجره‌های بحرانی"
          hint="بازه‌هایی که نرخ خطا سه برابر میانگین پنجره شده است."
          tone="bad"
        >
          <IncidentTimeline />
        </ObsSection>

        <ObsSection
          className={b.span7}
          icon={PieChart}
          title="سهم منابع از ترافیک"
          hint="حجم هر منبع و سهم خطای آن روی یک ریل مشترک."
        >
          <SourceBreakdown />
        </ObsSection>

        <ObsSection
          className={b.span5}
          icon={Layers3}
          title="توزیع سطوح لاگ"
          hint="نسبت info و warn و error در کل پنجره."
        >
          <LevelDistribution />
        </ObsSection>
      </div>
    </div>
  );
}
