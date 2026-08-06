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

export const metadata: Metadata = { title: 'مرکز مشاهده‌پذیری', description: 'نمای زندهٔ سلامت سامانه بر پایهٔ لاگ‌های واقعی سیستم.' };

export default function ObservabilityOverviewPage() {
  return (
    <div className={b.tabLayout} data-tab="overview">
      <div className={b.tabIntro}><div><span className={b.tabEyebrow}>OPERATIONS / OVERVIEW</span><h2 className={b.tabTitle}>اول آتش را پیدا کن، بعد نمودار را بخوان</h2><p className={b.tabLead}>این نمای کلی از مهم‌ترین نشانه‌ها شروع می‌کند: سرویس‌های پرریسک، یافته‌های قابل اقدام و پنجره‌های بحرانی.</p></div><div className={b.tabStamp}><strong>خوانش زنده</strong><span>بر پایهٔ snapshot فعلی سامانه</span></div></div>
      <div className={b.tabGrid}>
        <ObsSection className={`${b.eight} ${b.featured}`} icon={ServerCog} title="پرخطرترین سرویس‌ها" hint="پنج سرویس اول بر اساس وضعیت و شمار خطای واقعی."><ServiceLadder limit={5} /></ObsSection>
        <ObsSection className={`${b.four} ${b.insightPanel}`} icon={Sparkles} title="یافته‌های خودکار" hint="هر یافته یک مسیر بررسی دارد."><InsightStack /></ObsSection>
        <ObsSection className={b.seven} icon={Grid2x2} title="نقشهٔ گرمای منابع" hint="پرحجم‌ترین منابع لاگ در برابر ساعت‌های شبانه‌روز."><SourceHeat /></ObsSection>
        <ObsSection className={b.five} icon={Siren} title="پنجره‌های بحرانی" hint="بازه‌هایی که نرخ خطا از میانگین فاصله گرفته است."><IncidentTimeline /></ObsSection>
        <ObsSection className={b.seven} icon={PieChart} title="سهم منابع از ترافیک" hint="حجم هر منبع و سهم خطای آن."><SourceBreakdown /></ObsSection>
        <ObsSection className={b.five} icon={Layers3} title="توزیع سطوح لاگ" hint="نسبت info، warn و error در پنجره."><LevelDistribution /></ObsSection>
      </div>
    </div>
  );
}
