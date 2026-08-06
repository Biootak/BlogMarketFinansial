import type { Metadata } from 'next';
import { Activity, AlertTriangle, DatabaseZap, Gauge, Layers3, Radar, ScrollText, ServerCog, Siren, Sparkles } from 'lucide-react';

import b from './_components/boards.module.css';
import { AuditTrail } from './_components/AuditTrail';
import { ErrorLedger } from './_components/ErrorLedger';
import { IncidentTimeline } from './_components/IncidentTimeline';
import { InsightStack } from './_components/InsightStack';
import { LatencyScale } from './_components/LatencyScale';
import { LevelDistribution } from './_components/LevelDistribution';
import { ObsSection } from './_components/ObsSection';
import { ServiceLadder } from './_components/ServiceLadder';
import { SourceBreakdown } from './_components/SourceBreakdown';
import { SourceHeat } from './_components/SourceHeat';

export const metadata: Metadata = {
  title: 'اطلس عملیات | مشاهده‌پذیری',
  description: 'مرکز عملیاتی برای تشخیص سریع سلامت سرویس‌ها، خطا، latency و رویدادهای حساس.',
};

export default function ObservabilityOverviewPage() {
  return (
    <div className="obs-atlas" dir="rtl">
      <header className="obs-atlas__intro">
        <div className="obs-atlas__intro-mark" aria-hidden><Radar size={22} strokeWidth={1.6} /></div>
        <div>
          <p className="obs-atlas__kicker"><span className="obs-atlas__signal" aria-hidden /> عملیات زنده / پنجره ۲۴ ساعته</p>
          <h2 className="obs-atlas__title">از سیگنال تا اقدام، بدون سر و صدا</h2>
          <p className="obs-atlas__lede">این صفحه برای اسکن سریع ساخته شده: اول ریسک، بعد علت، بعد ردپای قابل پیگیری. تمام خروجی‌ها از snapshot واقعی مشاهده‌پذیری می‌آیند.</p>
        </div>
        <div className="obs-atlas__legend" aria-label="راهنمای رنگ‌ها">
          <span><i data-tone="ok" /> پایدار</span>
          <span><i data-tone="warn" /> نیازمند توجه</span>
          <span><i data-tone="bad" /> بحرانی</span>
        </div>
      </header>

      <div className="obs-atlas__grid">
        <ObsSection className={b.eight} icon={ServerCog} title="مهم‌ترین ریسک سرویس‌ها" hint="ترتیب بر اساس وضعیت واقعی سرویس و تعداد خطای ثبت‌شده است.">
          <ServiceLadder limit={5} />
        </ObsSection>
        <ObsSection className={b.four} icon={Sparkles} title="یافته‌های قابل اقدام" hint="فقط insightهایی نمایش داده می‌شوند که شرطشان در snapshot فعلی برقرار باشد.">
          <InsightStack />
        </ObsSection>

        <ObsSection className={b.seven} icon={AlertTriangle} title="دفتر خطا" hint="خطاها را بر اساس سطح و منبع فیلتر کن؛ بدون خروج از جریان کار.">
          <ErrorLedger />
        </ObsSection>
        <ObsSection className={b.five} icon={Gauge} title="شکل دمِ تأخیر" hint="p50، p95 و p99 روی یک محور مشترک، برای دیدن کشیدگی latency.">
          <LatencyScale />
        </ObsSection>

        <ObsSection className={b.seven} icon={DatabaseZap} title="نقشهٔ فشار منابع" hint="حجم رویدادها در طول شبانه‌روز و بین منابع واقعی سیستم.">
          <SourceHeat />
        </ObsSection>
        <ObsSection className={b.five} icon={Siren} title="پنجره‌های بحرانی" hint="بازه‌هایی که نرخ خطا از الگوی معمول پنجره بالاتر رفته است.">
          <IncidentTimeline />
        </ObsSection>

        <ObsSection className={b.seven} icon={Layers3} title="ترکیب ترافیک" hint="سهم منابع از حجم لاگ و نسبت خطا در هرکدام.">
          <SourceBreakdown />
        </ObsSection>
        <ObsSection className={b.five} icon={Activity} title="توزیع سطح رویداد" hint="نسبت info، warn، error و fatal در snapshot فعلی.">
          <LevelDistribution />
        </ObsSection>

        <ObsSection className={b.wide} icon={ScrollText} title="ردپای ممیزی" hint="آخرین اقدامات حساس، با actor و entity واقعی، برای بستن حلقهٔ پاسخگویی.">
          <AuditTrail />
        </ObsSection>
      </div>
    </div>
  );
}
