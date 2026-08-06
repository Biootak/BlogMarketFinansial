import type { Metadata } from 'next';
import { ScrollText, Sparkles } from 'lucide-react';

import { AuditTrail } from '../_components/AuditTrail';
import b from '../_components/boards.module.css';
import { InsightStack } from '../_components/InsightStack';
import { ObsSection } from '../_components/ObsSection';

export const metadata: Metadata = {
  title: 'رد ممیزی · مشاهده‌پذیری',
};

export default function ObservabilityAuditPage() {
  return (
    <>
      <ObsSection
        className={b.eight}
        icon={ScrollText}
        title="رد ممیزی پنجرهٔ جاری"
        hint="چهل رویداد آخر AuditLog با نقش عامل و نوع موجودیت. برای تاریخچهٔ کامل به صفحهٔ گزارش ممیزی بروید."
      >
        <AuditTrail />
      </ObsSection>

      <ObsSection
        className={b.four}
        icon={Sparkles}
        title="یافته‌های خودکار"
        hint="زمینهٔ عملیاتیِ همین پنجره، تا رویدادهای ممیزی را در کنار وضعیت سامانه بخوانید."
      >
        <InsightStack />
      </ObsSection>
    </>
  );
}
