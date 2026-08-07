<<<<<<< HEAD
import { Activity, ArrowUpLeft, Gauge, ServerCog, ShieldCheck, TimerReset } from 'lucide-react';
import type { Metadata } from 'next';
=======
import type { Metadata } from 'next';
import { Activity, ArrowLeft, Gauge, ServerCog } from 'lucide-react';
>>>>>>> cc577b44f17b1f7d6d64006fdcd7dcb18ca2898f

import { DayStrip } from '../_components/DayStrip';
import { LatencyScale } from '../_components/LatencyScale';
import { ObsSection } from '../_components/ObsSection';
import { ServiceLadder } from '../_components/ServiceLadder';
import b from '../_components/boards.module.css';
import styles from './latency.module.css';

export const metadata: Metadata = { title: 'تأخیر · مشاهده‌پذیری' };

/** ریل تمرکز — امضای ساختاری همین صفحه، نه یک الگوی مشترک. */
const FOCUS = [
  {
    href: '#percentiles',
    label: 'صدک‌ها',
    detail: 'شکل دم توزیع، نه فقط میانگین',
    icon: Gauge,
  },
  {
    href: '#traffic',
    label: 'ریتم ترافیک',
    detail: 'بیست‌وچهار سطل انتخاب‌پذیر',
    icon: Activity,
  },
  {
    href: '#services',
    label: 'سرویس‌ها',
    detail: 'پرریسک‌ها بالای فهرست',
    icon: ServerCog,
  },
] as const;

/**
 * تأخیر.
 * تنها صفحه‌ای که یک ریل ناوبری داخلی دارد، چون سه بلوکش یک ترتیب بررسی
 * مشخص می‌سازند: اول شکل توزیع، بعد لحظهٔ فشار، بعد سرویس مقصر.
 */
export default function ObservabilityLatencyPage() {
  return (
<<<<<<< HEAD
    <div className={styles.page}>
      <header className={styles.commandBar}>
        <div className={styles.breadcrumb}>
          <span className={styles.eyebrow}>OBSERVABILITY / LATENCY</span>
          <span className={styles.slash}>/</span>
          <strong>مرکز تصمیم‌گیری</strong>
        </div>
        <div className={styles.commandActions}>
          <span className={styles.live}>
            <i aria-hidden /> دادهٔ زنده
          </span>
          <button type="button" className={styles.actionButton}>
            <TimerReset size={15} /> پنجرهٔ ۲۴ ساعته
          </button>
=======
    <div className={b.tab} data-tab="latency">
      <header className={b.intro}>
        <div>
          <span className={b.eyebrow}>OPERATIONS / LATENCY</span>
          <h2 className={b.title}>تأخیر را قبل از تبدیل شدن به حادثه ببین</h2>
          <p className={b.lead}>
            میانگین دروغ می‌گوید. آنچه کاربر حس می‌کند فاصلهٔ بین p95 و p99 است، و همین فاصله
            محور اصلی این صفحه است.
          </p>
>>>>>>> cc577b44f17b1f7d6d64006fdcd7dcb18ca2898f
        </div>
        <p className={b.stamp} data-tone="info">
          <strong>مقیاس ریشه‌ای</strong>
          <span>تا p50 و p95 روی هم نیفتند</span>
        </p>
      </header>

<<<<<<< HEAD
      <section className={styles.hero} aria-labelledby="latency-title">
        <div className={styles.heroCopy}>
          <p className={styles.kicker}>سیستم سالم است، اما دم توزیع را چک کن</p>
          <h1 id="latency-title">تأخیر را قبل از تبدیل شدن به حادثه ببین.</h1>
          <p className={styles.lede}>
            این صفحه برای خواندن سریع ساخته شده: اول وضعیت، بعد نقطهٔ فشار، سپس مسیر رسیدگی. عددها از
            همان snapshot عملیاتی می‌آیند، نه از دادهٔ نمایشی.
          </p>
          <a className={styles.nextAction} href="#services">
            <span>
              <ArrowUpLeft size={16} /> برو به سرویس‌های پرریسک
            </span>
            <small>مسیر پیشنهادی بررسی</small>
          </a>
        </div>
        <div className={styles.heroAside}>
          <div className={styles.statusRing} aria-label="وضعیت پایدار">
            <ShieldCheck size={28} />
            <span>پایدار</span>
          </div>
          <div>
            <span className={styles.asideLabel}>پنجرهٔ داده</span>
            <strong>۲۴ ساعت اخیر</strong>
            <small>آخرین همگام‌سازی، همین حالا</small>
          </div>
        </div>
      </section>

      <nav className={styles.focusNav} aria-label="بخش‌های اصلی">
        {focusItems.map(({ icon: Icon, label, value, note }, index) => (
          <a
            href={index === 0 ? '#percentiles' : index === 1 ? '#traffic' : '#services'}
            key={label}
            className={styles.focusItem}
          >
            <span className={styles.focusIndex}>۰{index + 1}</span>
            <Icon size={17} aria-hidden />
            <span>
              <strong>{label}</strong>
              <small>
                {value} · {note}
              </small>
            </span>
            <ArrowUpLeft size={15} className={styles.focusArrow} aria-hidden />
=======
      <nav className={styles.focus} aria-label="ترتیب بررسی این صفحه">
        {FOCUS.map(({ href, label, detail, icon: Icon }) => (
          <a key={href} href={href} className={styles.focusItem}>
            <Icon size={16} strokeWidth={1.7} aria-hidden="true" />
            <span className={styles.focusText}>
              <strong>{label}</strong>
              <small>{detail}</small>
            </span>
            <ArrowLeft size={14} strokeWidth={1.8} className={styles.focusArrow} aria-hidden="true" />
>>>>>>> cc577b44f17b1f7d6d64006fdcd7dcb18ca2898f
          </a>
        ))}
      </nav>

<<<<<<< HEAD
      <main className={styles.board}>
        <ObsSection
          id="percentiles"
          className={`${styles.primary} ${b.wide}`}
          icon={Gauge}
          title="محور صدک‌ها"
          hint="p50، p95 و p99 روی یک محور مشترک؛ فاصلهٔ بین آن‌ها شکل واقعی تجربهٔ کاربر را لو می‌دهد."
        >
          <LatencyScale />
        </ObsSection>
        <ObsSection
          id="traffic"
          className={`${styles.traffic} ${b.seven}`}
=======
      <div className={b.board}>
        <ObsSection
          id="percentiles"
          className={`${b.span12} ${b.featured}`}
          icon={Gauge}
          title="محور صدک‌ها"
          hint="p50 و p95 و p99 روی یک محور مشترک؛ فاصلهٔ بینشان شکل واقعی تجربهٔ کاربر را لو می‌دهد."
        >
          <LatencyScale />
        </ObsSection>

        <ObsSection
          id="traffic"
          className={b.span7}
>>>>>>> cc577b44f17b1f7d6d64006fdcd7dcb18ca2898f
          icon={Activity}
          title="بار سامانه در شبانه‌روز"
          hint="یک ساعت را انتخاب کن تا حجم، خطا و سهم آن از پنجره را بخوانی."
        >
          <DayStrip />
        </ObsSection>
<<<<<<< HEAD
        <ObsSection
          id="services"
          className={`${styles.services} ${b.five}`}
          icon={ServerCog}
          title="تأخیر به تفکیک سرویس"
          hint="پرریسک‌ترین سرویس‌ها بالا می‌آیند، نه آن‌هایی که فقط اسم بیشتری دارند."
        >
          <ServiceLadder limit={6} />
        </ObsSection>
      </main>
=======

        <ObsSection
          id="services"
          className={b.span5}
          icon={ServerCog}
          title="تأخیر به تفکیک سرویس"
          hint="پرریسک‌ترین‌ها بالا می‌آیند، نه آن‌هایی که اسم بیشتری دارند."
        >
          <ServiceLadder limit={6} />
        </ObsSection>
      </div>
>>>>>>> cc577b44f17b1f7d6d64006fdcd7dcb18ca2898f
    </div>
  );
}
