import { Activity, ArrowLeft, Gauge, ServerCog } from 'lucide-react';
import type { Metadata } from 'next';

import { DayStrip } from '../_components/DayStrip';
import { LatencyScale } from '../_components/LatencyScale';
import { ObsSection } from '../_components/ObsSection';
import { ServiceLadder } from '../_components/ServiceLadder';
import b from '../_components/boards.module.css';
import styles from './latency.module.css';

export const metadata: Metadata = {
  title: 'تأخیر · مشاهده‌پذیری',
  description: 'صدک‌های تأخیر، ریتم بار شبانه‌روز و تأخیر به تفکیک سرویس.',
};

/** ریل تمرکز — امضای ساختاری همین صفحه، نه یک الگوی مشترک. */
const FOCUS = [
  { href: '#percentiles', label: 'صدک‌ها', detail: 'شکل دم توزیع، نه فقط میانگین', icon: Gauge },
  { href: '#traffic', label: 'ریتم ترافیک', detail: 'بیست‌وچهار سطل انتخاب‌پذیر', icon: Activity },
  { href: '#services', label: 'سرویس‌ها', detail: 'پرریسک‌ها بالای فهرست', icon: ServerCog },
] as const;

/**
 * تأخیر.
 *
 * تنها صفحه‌ای که یک ریل ناوبری داخلی دارد، چون سه بلوکش یک ترتیب بررسی
 * مشخص می‌سازند: اول شکل توزیع، بعد لحظهٔ فشار، بعد سرویس مقصر.
 *
 * نسخهٔ قبلی این فایل یک hero مستقل با h1 و «وضعیت: پایدار» ثابت داشت که
 * هیچ ربطی به داده نداشت — یک تزئین hard-coded روی صفحهٔ پایش. حذف شد.
 */
export default function ObservabilityLatencyPage() {
  return (
    <div className={b.tabLayout} data-tab="latency">
      <header className={b.tabIntro}>
        <div>
          <span className={b.tabEyebrow}>OPERATIONS / LATENCY</span>
          <h2 className={b.tabTitle}>تأخیر را قبل از تبدیل شدن به حادثه ببین</h2>
          <p className={b.tabLead}>
            میانگین دروغ می‌گوید. آنچه کاربر حس می‌کند فاصلهٔ بین p95 و p99 است، و همین فاصله محور اصلی
            این صفحه است.
          </p>
        </div>
        <p className={b.tabStamp} data-tone="info">
          <strong>مقیاس ریشه‌ای</strong>
          <span>تا p50 و p95 روی هم نیفتند</span>
        </p>
      </header>

      <nav className={styles.focus} aria-label="ترتیب بررسی این صفحه">
        {FOCUS.map(({ href, label, detail, icon: Icon }) => (
          <a key={href} href={href} className={styles.focusItem}>
            <Icon size={16} strokeWidth={1.7} aria-hidden="true" />
            <span className={styles.focusText}>
              <strong>{label}</strong>
              <small>{detail}</small>
            </span>
            <ArrowLeft
              size={14}
              strokeWidth={1.8}
              className={styles.focusArrow}
              aria-hidden="true"
            />
          </a>
        ))}
      </nav>

      <div className={b.tabGrid}>
        <ObsSection
          id="percentiles"
          className={`${b.wide} ${b.featured}`}
          icon={Gauge}
          title="محور صدک‌ها"
          hint="p50 و p95 و p99 روی یک محور مشترک؛ فاصلهٔ بینشان شکل واقعی تجربهٔ کاربر را لو می‌دهد."
        >
          <LatencyScale />
        </ObsSection>

        <ObsSection
          id="traffic"
          className={b.seven}
          icon={Activity}
          title="بار سامانه در شبانه‌روز"
          hint="یک ساعت را انتخاب کن تا حجم، خطا و سهم آن از پنجره را بخوانی."
        >
          <DayStrip />
        </ObsSection>

        <ObsSection
          id="services"
          className={b.five}
          icon={ServerCog}
          title="تأخیر به تفکیک سرویس"
          hint="پرریسک‌ترین‌ها بالا می‌آیند، نه آن‌هایی که اسم بیشتری دارند."
        >
          <ServiceLadder limit={6} />
        </ObsSection>
      </div>
    </div>
  );
}
