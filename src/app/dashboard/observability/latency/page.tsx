import type { Metadata } from 'next';
import { Activity, ArrowUpLeft, Gauge, ServerCog, ShieldCheck, TimerReset } from 'lucide-react';

import styles from './latency.module.css';
import b from '../_components/boards.module.css';
import { DayStrip } from '../_components/DayStrip';
import { LatencyScale } from '../_components/LatencyScale';
import { ObsSection } from '../_components/ObsSection';
import { ServiceLadder } from '../_components/ServiceLadder';

export const metadata: Metadata = {
  title: 'تأخیر · مشاهده‌پذیری',
};

const focusItems = [
  { icon: Gauge, label: 'صدک‌ها', value: 'p50 / p95 / p99', note: 'شکل دم توزیع' },
  { icon: Activity, label: 'ریتم ترافیک', value: '۲۴ ساعت', note: 'انتخاب‌پذیر و زنده' },
  { icon: ServerCog, label: 'سرویس‌ها', value: 'پرریسک‌ها بالا', note: 'مرتب‌شده با ریسک' },
] as const;

export default function ObservabilityLatencyPage() {
  return (
    <div className={styles.page}>
      <header className={styles.commandBar}>
        <div className={styles.breadcrumb}>
          <span className={styles.eyebrow}>OBSERVABILITY / LATENCY</span>
          <span className={styles.slash}>/</span>
          <strong>مرکز تصمیم‌گیری</strong>
        </div>
        <div className={styles.commandActions}>
          <span className={styles.live}><i aria-hidden /> دادهٔ زنده</span>
          <button type="button" className={styles.actionButton}><TimerReset size={15} /> پنجرهٔ ۲۴ ساعته</button>
        </div>
      </header>

      <section className={styles.hero} aria-labelledby="latency-title">
        <div className={styles.heroCopy}>
          <p className={styles.kicker}>سیستم سالم است، اما دم توزیع را چک کن</p>
          <h1 id="latency-title">تأخیر را قبل از تبدیل شدن به حادثه ببین.</h1>
          <p className={styles.lede}>
            این صفحه برای خواندن سریع ساخته شده: اول وضعیت، بعد نقطهٔ فشار، سپس مسیر رسیدگی. عددها از همان snapshot عملیاتی می‌آیند، نه از دادهٔ نمایشی.
          </p>
          <a className={styles.nextAction} href="#services">
            <span><ArrowUpLeft size={16} /> برو به سرویس‌های پرریسک</span>
            <small>مسیر پیشنهادی بررسی</small>
          </a>
        </div>
        <div className={styles.heroAside}>
          <div className={styles.statusRing} aria-label="وضعیت پایدار"><ShieldCheck size={28} /><span>پایدار</span></div>
          <div><span className={styles.asideLabel}>پنجرهٔ داده</span><strong>۲۴ ساعت اخیر</strong><small>آخرین همگام‌سازی، همین حالا</small></div>
        </div>
      </section>

      <nav className={styles.focusNav} aria-label="بخش‌های اصلی">
        {focusItems.map(({ icon: Icon, label, value, note }, index) => (
          <a href={index === 0 ? '#percentiles' : index === 1 ? '#traffic' : '#services'} key={label} className={styles.focusItem}>
            <span className={styles.focusIndex}>۰{index + ۱}</span>
            <Icon size={17} aria-hidden />
            <span><strong>{label}</strong><small>{value} · {note}</small></span>
            <ArrowUpLeft size={15} className={styles.focusArrow} aria-hidden />
          </a>
        ))}
      </nav>

      <main className={styles.board}>
        <section id="percentiles" className={`${styles.primary} ${b.wide}`}>
          <ObsSection
            icon={Gauge}
            title="محور صدک‌ها"
            hint="p50، p95 و p99 روی یک محور مشترک؛ فاصلهٔ بین آن‌ها شکل واقعی تجربهٔ کاربر را لو می‌دهد."
          >
            <LatencyScale />
          </ObsSection>
        </section>

        <section id="traffic" className={`${styles.traffic} ${b.seven}`}>
          <ObsSection
            icon={Activity}
            title="بار سامانه در شبانه‌روز"
            hint="یک ساعت را انتخاب کن تا حجم، خطا و سهم آن از پنجره را بخوانی."
          >
            <DayStrip />
          </ObsSection>
        </section>

        <section id="services" className={`${styles.services} ${b.five}`}>
          <ObsSection
            icon={ServerCog}
            title="تأخیر به تفکیک سرویس"
            hint="پرریسک‌ترین سرویس‌ها بالا می‌آیند، نه آن‌هایی که فقط اسم بیشتری دارند."
          >
            <ServiceLadder limit={6} />
          </ObsSection>
        </section>
      </main>
    </div>
  );
}
