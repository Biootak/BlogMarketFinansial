import type { Metadata } from 'next';
import { ScrollText } from 'lucide-react';

import { AuditTrail } from '../_components/AuditTrail';
import { ObsSection } from '../_components/ObsSection';

export const metadata: Metadata = {
  title: 'رد ممیزی · مشاهده‌پذیری',
};

export default function ObservabilityAuditPage() {
  return (
    <ObsSection
      icon={ScrollText}
      title="رد ممیزی پنجرهٔ جاری"
      hint="چهل رویداد آخر AuditLog با نقش عامل و نوع موجودیت. برای تاریخچهٔ کامل به صفحهٔ گزارش ممیزی بروید."
    >
      <AuditTrail />
    </ObsSection>
  );
}
