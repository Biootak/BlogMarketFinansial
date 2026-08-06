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

export const metadata: Metadata = {
  title: 'مرکز مشاهده‌پذیری',
  description: 'نمای زندهٔ سلامت سامانه بر پایهٔ لاگ‌های واقعی سیستم.',
};

/**
 * نمای کلی با ترتیب incident-first: ابتدا سطح خطر و مقصد اقدام، بعد context
 * زمانی و در پایان تحلیل‌های زمینه‌ای. هیچ داده‌ای اینجا تولید نمی‌شود.
 */
export default function ObservabilityOverviewPage() {
  return (
    <div className={b.commandDeck}>
      <ObsSection
        className={b.lead}
        icon={ServerCog}
        title="اول کجا را نگاه کنم؟"
        hint="سرویس‌ها بر اساس وضعیت فعلی و تعداد خطای واقعی ۲۴ ساعت اخیر مرتب شده‌اند."
      >
        <ServiceLadder limit={5} />
      </ObsSection>

      <ObsSection
        className={b.signal}
        icon={Sparkles}
        title="نشانه‌های قابل اقدام"
        hint="این خلاصه فقط از snapshot دیتابیس ساخته می‌شود؛ چیزی برای پر کردن فضا نمایش داده نمی‌شود."
      >
        <InsightStack />
      </ObsSection>

      <ObsSection
        className={b.full}
        icon={Grid2x2}
        title="ریتم سامانه در ۲۴ ساعت"
        hint="حجم رویداد و سهم خطا را به‌صورت منبع‌محور ببینید، نه به شکل دیوار نمودارهای هم‌اندازه."
      >
        <SourceHeat />
      </ObsSection>

      <ObsSection
        className={b.contextWide}
        icon={Siren}
        title="پنجره‌های بحرانی"
        hint="بازه‌هایی که نرخ خطا از آستانهٔ سه‌برابری میانگین عبور کرده است."
      >
        <IncidentTimeline />
      </ObsSection>

      <ObsSection
        className={b.contextNarrow}
        icon={PieChart}
        title="سهم منابع"
        hint="حجم و خطای هر منبع در همان پنجرهٔ تحلیل."
      >
        <SourceBreakdown />
      </ObsSection>

      <ObsSection
        className={b.contextNarrow}
        icon={Layers3}
        title="ترکیب سطوح لاگ"
        hint="نسبت info، warn و error برای تشخیص تغییر کیفیت سیگنال."
      >
        <LevelDistribution />
      </ObsSection>
    </div>
  );
}
