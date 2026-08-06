import type { Metadata } from 'next';
import { AlertTriangle, Layers3, Siren, Sparkles } from 'lucide-react';

import b from '../_components/boards.module.css';
import { ErrorLedger } from '../_components/ErrorLedger';
import { IncidentTimeline } from '../_components/IncidentTimeline';
import { InsightStack } from '../_components/InsightStack';
import { LevelDistribution } from '../_components/LevelDistribution';
import { ObsSection } from '../_components/ObsSection';

export const metadata: Metadata = {
  title: 'خطاها · مشاهده‌پذیری',
  description: 'دفتر خطای گروه‌بندی‌شده و پنجره‌های بحرانی پنجرهٔ جاری.',
};

export default function ObservabilityErrorsPage() {
  return (
    <>
      <ObsSection
        index={1}
        className={b.full}
        icon={AlertTriangle}
        title="دفتر خطا"
        hint="رکوردهای هم‌شکل با هم گروه شده‌اند تا یک خطای تکراری، صفحه را پر نکند. جست‌وجو روی پیام و منبع کار می‌کند."
        tone="bad"
      >
        <ErrorLedger />
      </ObsSection>

      <ObsSection
        index={2}
        className={b.wide}
        icon={Siren}
        title="پنجره‌های بحرانی"
        hint="تجمع خطا در بازه‌های پیوسته؛ آستانه از خود داده می‌آید نه از عدد ثابت."
        tone="bad"
      >
        <IncidentTimeline />
      </ObsSection>

      <ObsSection
        index={3}
        className={b.side}
        icon={Layers3}
        title="توزیع سطوح"
        hint="نسبت info و warn و error در کل حجم پنجره."
      >
        <LevelDistribution />
      </ObsSection>

      <ObsSection
        index={4}
        className={b.full}
        icon={Sparkles}
        title="یافته‌های خودکار"
        hint="همان زمینهٔ عملیاتی، تا خطاها را در کنار وضعیت سرویس‌ها بخوانید."
      >
        <InsightStack />
      </ObsSection>
    </>
  );
}
