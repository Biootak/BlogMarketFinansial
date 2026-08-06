import type { Metadata } from 'next';
import { Activity, Gauge, ServerCog } from 'lucide-react';

import styles from './latency.module.css';
import b from '../_components/boards.module.css';
import { DayStrip } from '../_components/DayStrip';
import { LatencyScale } from '../_components/LatencyScale';
import { ObsSection } from '../_components/ObsSection';
import { ServiceLadder } from '../_components/ServiceLadder';

export const metadata: Metadata = {
  title: 'تأخیر · مشاهده‌پذیری',
};

export default function ObservabilityLatencyPage() {
  return (
    <div className={styles.page}>
      <header className={styles.intro}>
        <div>
          <span className={styles.eyebrow}>LATENCY / LIVE WINDOW</span>
          <h1 className={styles.title}>تأخیر را قبل از تبدیل شدن به حادثه ببین</h1>
          <p className={styles.lede}>
            صدک‌ها، ریتم ترافیک و سرویس‌های پرریسک در یک سطح عملیاتی. عدد بزرگ تزئینی نداریم، هر نشانه باید به یک تصمیم ختم شود.
          </p>
        </div>
        <div className={styles.window}>
          <span className={styles.windowDot} aria-hidden />
          <span>پنجرهٔ زنده</span>
          <strong>۲۴ ساعت اخیر</strong>
        </div>
      </header>

      <div className={styles.signalRow} aria-label="راهنمای خواندن صفحه">
        <span><i className={styles.signalGood} aria-hidden /> مسیر عادی</span>
        <span><i className={styles.signalWarn} aria-hidden /> دم توزیع</span>
        <span><i className={styles.signalBad} aria-hidden /> نقطهٔ نیازمند بررسی</span>
      </div>

      <div className={styles.primary}>
        <ObsSection
          className={b.wide}
          icon={Gauge}
          title="محور صدک‌ها"
          hint="p50، p95 و p99 روی یک محور مشترک؛ فاصلهٔ بین آن‌ها شکل واقعی تجربهٔ کاربر را لو می‌دهد."
        >
          <LatencyScale />
        </ObsSection>
      </div>

      <div className={styles.secondary}>
        <ObsSection
          className={b.seven}
          icon={Activity}
          title="بار سامانه در شبانه‌روز"
          hint="حجم رویداد هر ساعت در کنار سهم خطا؛ یک ساعت را انتخاب کن تا همان لحظه را بخوانی."
        >
          <DayStrip />
        </ObsSection>

        <ObsSection
          className={b.five}
          icon={ServerCog}
          title="تأخیر به تفکیک سرویس"
          hint="پرریسک‌ترین سرویس‌ها بالا می‌آیند، نه آن‌هایی که فقط اسم بیشتری دارند."
        >
          <ServiceLadder limit={6} />
        </ObsSection>
      </div>
    </div>
  );
}
