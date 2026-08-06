import type { Metadata } from 'next';
import { ScrollText, Sparkles } from 'lucide-react';
import b from '../_components/boards.module.css';
import { AuditTrail } from '../_components/AuditTrail';
import { InsightStack } from '../_components/InsightStack';
import { ObsSection } from '../_components/ObsSection';

export const metadata: Metadata = { title: 'رد ممیزی · مشاهده‌پذیری' };
export default function ObservabilityAuditPage() {
  return <div className={b.tabLayout} data-tab="audit"><div className={b.tabIntro}><div><span className={b.tabEyebrow}>OPERATIONS / AUDIT</span><h2 className={b.tabTitle}>هر تغییر باید قابل پیگیری باشد</h2><p className={b.tabLead}>رد ممیزی را مثل یک timeline بخوان: چه کسی، چه کاری، روی کدام موجودیت و چه زمانی.</p></div><div className={b.tabStamp}><strong>آخرین ۴۰ رویداد</strong><span>منبع: AuditLog</span></div></div><div className={b.tabGrid}><ObsSection className={`${b.eight} ${b.featured}`} icon={ScrollText} title="رد ممیزی پنجرهٔ جاری" hint="رویدادها با نقش عامل و نوع موجودیت، برای مرور سریع و دقیق."><AuditTrail /></ObsSection><ObsSection className={`${b.four} ${b.insightPanel}`} icon={Sparkles} title="یافته‌های خودکار" hint="زمینهٔ عملیاتی همین پنجره کنار رویدادهای ممیزی."><InsightStack /></ObsSection></div></div>;
}
