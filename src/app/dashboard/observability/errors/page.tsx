import type { Metadata } from 'next';
import { AlertTriangle, Layers3, Siren } from 'lucide-react';

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
        icon={AlertTriangle}
        title="دفتر خطا"
        hint="رکوردهای هم‌شکل با هم گروه شده‌اند تا یک خطای تکراری، صفحه را پر نکند."
      >
        <ErrorLedger />
      </ObsSection>

      <ObsSection
        icon={Layers3}
        title="توزیع سطوح"
        hint="نسبت info و warn و error در کل حجم پنجره."
      >
        <LevelDistribution />
      </ObsSection>

      <ObsSection
        icon={Siren}
        title="پنجره‌های بحرانی"
        hint="تجمع خطا در بازه‌های پیوسته."
      >
        <IncidentTimeline />
      </ObsSection>
    </>
  );
}
