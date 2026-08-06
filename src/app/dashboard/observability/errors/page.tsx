import type { Metadata } from 'next';
import { AlertTriangle, Layers3, Siren } from 'lucide-react';
import b from '../_components/boards.module.css';
import { ErrorLedger } from '../_components/ErrorLedger';
import { IncidentTimeline } from '../_components/IncidentTimeline';
import { LevelDistribution } from '../_components/LevelDistribution';
import { ObsSection } from '../_components/ObsSection';

export const metadata: Metadata = { title: 'خطاها · مشاهده‌پذیری' };
export default function ObservabilityErrorsPage() {
  return <div className={b.tabLayout} data-tab="errors"><div className={b.tabIntro}><div><span className={b.tabEyebrow}>OPERATIONS / ERRORS</span><h2 className={b.tabTitle}>خطاها را از نویز جدا کن</h2><p className={b.tabLead}>رکوردهای هم‌شکل گروه شده‌اند تا تکرارها پنهان نشوند و هر خطا وزن واقعی خودش را نشان بدهد.</p></div><div className={b.tabStamp} data-tone="bad"><strong>صف بررسی</strong><span>اولویت با خطاهای تکرارشونده</span></div></div><div className={b.tabGrid}><ObsSection className={`${b.wide} ${b.featured} ${b.alertSurface}`} icon={AlertTriangle} title="دفتر خطا" hint="گروه‌بندی بر اساس پیام و شدت، با مسیر رسیدگی روشن."><ErrorLedger /></ObsSection><ObsSection className={b.five} icon={Layers3} title="توزیع سطوح" hint="نسبت info، warn و error در کل پنجره."><LevelDistribution /></ObsSection><ObsSection className={b.seven} icon={Siren} title="پنجره‌های بحرانی" hint="تجمع خطا در بازه‌های پیوسته."><IncidentTimeline /></ObsSection></div></div>;
}
