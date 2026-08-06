import type { Metadata } from 'next';
import { Activity, ScrollText, Sparkles } from 'lucide-react';

import { AuditTrail } from '../_components/AuditTrail';
import b from '../_components/boards.module.css';
import { InsightStack } from '../_components/InsightStack';
import { ObsSection } from '../_components/ObsSection';
import { SystemVitals } from '../_components/SystemVitals';

export const metadata: Metadata = {
  title: 'رد ممیزی · مشاهده‌پذیری',
  description: 'چهل رویداد آخر AuditLog با نقش عامل و نوع موجودیت.',
};

export default function ObservabilityAuditPage() {
  return (
    <>
      <ObsSection
        index={1}
        className={b.lead}
        icon={ScrollText}
        title="رد ممیزی پنجرهٔ جاری"
        hint="چهل رویداد آخر AuditLog با نقش عامل و نوع موجودیت. برای تاریخچهٔ کامل به صفحهٔ گزارش ممیزی بروید."
      >
        <AuditTrail />
      </ObsSection>

      <ObsSection
        index={2}
        className={b.note}
        icon={Sparkles}
        title="یافته‌های خودکار"
        hint="زمینهٔ عملیاتیِ همین پنجره، تا رویدادهای ممیزی را در کنار وضعیت سامانه بخوانید."
      >
        <InsightStack />
      </ObsSection>

      <ObsSection
        index={3}
        className={b.full}
        icon={Activity}
        title="نشانه‌های حیاتی"
        hint="شمار رویدادهای ممیزی در کنار حجم و خطای همان پنجره."
      >
        <SystemVitals />
      </ObsSection>
    </>
  );
}
