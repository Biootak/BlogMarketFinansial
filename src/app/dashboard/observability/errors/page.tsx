import type { Metadata } from 'next';
import { AlertTriangle, Layers3, Siren } from 'lucide-react';

import b from '../_components/boards.module.css';
import { ErrorLedger } from '../_components/ErrorLedger';
import { IncidentTimeline } from '../_components/IncidentTimeline';
import { LevelDistribution } from '../_components/LevelDistribution';
import { ObsSection } from '../_components/ObsSection';

export const metadata: Metadata = {
  title: 'خطاها · مشاهده‌پذیری',
};

export default function ObservabilityErrorsPage() {
  return (
    <>
      <ObsSection
        className={b.wide}
        icon={AlertTriangle}
        title="دفتر خطا"
        hint="رکوردهای هم‌شکل با هم گروه شده‌اند تا یک خطای تکراری، صفحه را پر نکند."
      >
        <ErrorLedger />
      </ObsSection>

      <ObsSection
        className={b.five}
        icon={Layers3}
        title="توزیع سطوح"
        hint="نسبت info و warn و error در کل حجم پنجره."
      >
        <LevelDistribution />
      </ObsSection>

      <ObsSection
        className={b.seven}
        icon={Siren}
        title="پنجره‌های بحرانی"
        hint="تجمع خطا در بازه‌های پیوسته."
      >
        <IncidentTimeline />
      </ObsSection>
    </>
  );
}
