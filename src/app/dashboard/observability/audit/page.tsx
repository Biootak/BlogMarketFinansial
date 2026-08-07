import type { Metadata } from 'next';
import { ScrollText, Siren, Sparkles } from 'lucide-react';

import { AuditTrail } from '../_components/AuditTrail';
import { IncidentTimeline } from '../_components/IncidentTimeline';
import { InsightStack } from '../_components/InsightStack';
import { ObsSection } from '../_components/ObsSection';
import b from '../_components/boards.module.css';

export const metadata: Metadata = { title: 'رد ممیزی · مشاهده‌پذیری' };

/**
 * رد ممیزی.
 * پنجره‌های بحرانی عمداً روی همین صفحه هستند: سؤال همیشگی بعد از یک حادثه
 * این است که «همان موقع چه کسی چه چیزی را عوض کرد».
 */
export default function ObservabilityAuditPage() {
  return (
    <div className={b.tab} data-tab="audit">
      <header className={b.intro}>
        <div>
          <span className={b.eyebrow}>OPERATIONS / AUDIT</span>
          <h2 className={b.title}>هر تغییر باید قابل پیگیری باشد</h2>
          <p className={b.lead}>
            رد ممیزی را مثل یک خط زمان بخوان: چه کسی، چه کاری، روی کدام موجودیت و چه زمانی. کلیدها
            خام و قابل جست‌وجو در دیتابیس‌اند، پس ترجمه نمی‌شوند.
          </p>
        </div>
        <p className={b.stamp} data-tone="info">
          <strong>آخرین رویدادها</strong>
          <span>منبع: جدول AuditLog</span>
        </p>
      </header>

      <div className={b.board}>
        <ObsSection
          className={`${b.span8} ${b.featured}`}
          icon={ScrollText}
          title="رد ممیزی پنجرهٔ جاری"
          hint="نقش عامل و نوع موجودیت کنار هر رویداد، برای مرور سریع و دقیق."
        >
          <AuditTrail />
        </ObsSection>

        <ObsSection
          className={`${b.span4} ${b.recessed}`}
          icon={Sparkles}
          title="یافته‌های خودکار"
          hint="زمینهٔ عملیاتی همین پنجره، کنار رویدادهای ممیزی."
        >
          <InsightStack />
        </ObsSection>

        <ObsSection
          className={b.span12}
          icon={Siren}
          title="تغییرات در کنار حوادث"
          hint="اگر بازهٔ بحرانی با یک تغییر هم‌زمان است، احتمالاً همان جواب است."
          tone="bad"
        >
          <IncidentTimeline />
        </ObsSection>
      </div>
    </div>
  );
}
