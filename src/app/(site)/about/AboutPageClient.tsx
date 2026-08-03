'use client';

/**
 * AboutPageClient — بخش‌های interactive صفحه About
 * - Stats با AnimatedNumber (count-up)
 * - IntersectionObserver برای reveal
 */

import AnimatedNumber from '@/components/Sections/effects/AnimatedNumber';
import { Lightbulb, Shield, Target } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import s from './AboutPage.module.css';

/* ---------------------------------------------------------------------- */
/*  Types                                                                  */
/* ---------------------------------------------------------------------- */

export interface AboutStats {
  postCount: number;
  userCount: number;
  countries: number;
  authorCount: number;
}

interface ValueItem {
  icon: typeof Target;
  title: string;
  desc: string;
}

/* ---------------------------------------------------------------------- */
/*  Constants                                                               */
/* ---------------------------------------------------------------------- */

const VALUES: ValueItem[] = [
  {
    icon: Target,
    title: 'بی‌طرفی و استقلال',
    desc: 'محتوای ما بدون وابستگی به نهادهای مالی تولید می‌شود',
  },
  {
    icon: Shield,
    title: 'امنیت و اعتماد',
    desc: 'اطلاعات کاربران با بالاترین استاندارد امنیتی محافظت می‌شود',
  },
  {
    icon: Lightbulb,
    title: 'آموزش و آگاهی',
    desc: 'هر روز محتوای تخصصی برای بهبود سواد مالی شما منتشر می‌کنیم',
  },
];

/* ---------------------------------------------------------------------- */
/*  StatCard                                                                */
/* ---------------------------------------------------------------------- */

function StatCard({
  value,
  label,
  suffix,
  index,
}: {
  value: number;
  label: string;
  suffix?: string;
  index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { rootMargin: '-40px' },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`${s.statCard} ${visible ? s.inView : ''}`}
      style={{ transitionDelay: `${index * 80}ms` }}
    >
      <span className={s.statNum}>
        {visible ? (
          <AnimatedNumber value={value} duration={1.4} format="persian-separator" suffix={suffix} />
        ) : (
          '—'
        )}
      </span>
      <span className={s.statLabel}>{label}</span>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/*  AboutPageClient (exported for server page to use)                      */
/* ---------------------------------------------------------------------- */

export default function AboutPageClient({ stats }: { stats: AboutStats }) {
  return (
    <div className={s.root}>
      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className={s.hero}>
        <div className={s.heroBg} aria-hidden>
          <div className={`${s.heroOrb} ${s.heroOrb1}`} />
          <div className={`${s.heroOrb} ${s.heroOrb2}`} />
        </div>
        <div className={s.heroInner}>
          <div className={s.heroEyebrow}>
            <span className={s.heroEyebrowDot} />
            درباره ما
          </div>
          <h1 className={s.heroTitle}>
            پلتفرم مالی <span className={s.heroTitleAccent}>مورد اعتماد</span>
            <br />
            افغانستان و ایران
          </h1>
          <p className={s.heroBody}>
            ما بی‌طرف و مستقل هستیم و هر روز برنامه‌ها و محتوای متمایز و در سطح جهانی ایجاد می‌کنیم که
            میلیون‌ها نفر را در سراسر جهان آگاه، آموزش و سرگرم می‌کند.
          </p>
        </div>
      </section>

      {/* ── Stats ────────────────────────────────────────────────── */}
      <section className={s.statsSection} aria-label="آمار پلتفرم">
        <div className={s.statsSectionInner}>
          <h2 className={s.statsTitle}>حقایق سریع</h2>
          <p className={s.statsSub}>تا به امروز با هم چه ساختیم</p>
          <div className={s.statsGrid}>
            <StatCard value={stats.postCount} label="مقاله منتشر شده" index={0} />
            <StatCard value={stats.userCount} label="کاربر فعال" index={1} />
            <StatCard value={stats.authorCount} label="نویسنده متخصص" index={2} />
            <StatCard value={stats.countries} label="کشور تحت پوشش" suffix="+" index={3} />
          </div>
        </div>
      </section>

      {/* ── Mission ──────────────────────────────────────────────── */}
      <section className={s.missionSection} aria-label="ماموریت ما">
        <div className={s.missionInner}>
          {/* Text */}
          <div className={s.missionText}>
            <span className={s.missionEyebrow}>ماموریت ما</span>
            <h2 className={s.missionTitle}>آگاهی مالی را دموکراتیک می‌کنیم</h2>
            <p className={s.missionBody}>
              در دنیایی که اطلاعات مالی اغلب پیچیده و دردسترس نیست، ما تلاش می‌کنیم تا بهترین
              تحلیل‌ها، نرخ‌های لحظه‌ای و راهنمایی‌های کاربردی را به زبان ساده ارائه دهیم.
            </p>
            <p className={s.missionBody}>
              از نرخ ارز افغانی گرفته تا تحلیل بازار کریپتو — همه چیز در یک پلتفرم واحد، با کیفیت
              بالا و بدون وابستگی به هیچ نهاد مالی.
            </p>
          </div>

          {/* Values */}
          <div className={s.values}>
            {VALUES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className={s.valueItem}>
                <div className={s.valueIcon}>
                  <Icon size={18} strokeWidth={1.5} />
                </div>
                <div>
                  <div className={s.valueTitle}>{title}</div>
                  <div className={s.valueDesc}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
