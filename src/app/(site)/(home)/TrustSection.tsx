import { Clock, Globe, Lock, Shield, TrendingUp, Users, Zap } from 'lucide-react';
import s from './TrustSection.module.css';

/**
 * TrustSection — بخش اعتماد و آمار کلیدی
 *
 * شامل:
 *  - ۴ عدد کلیدی اعتمادساز (کاربران، کشورها، ارزها، آپتایم)
 *  - ۳ ویژگی trust (امنیت، سرعت، پشتیبانی)
 * Server Component — بدون client-side JS
 */

const STATS = [
  { icon: Users, value: '+۵', suffix: 'هزار', label: 'کاربر فعال ماهانه' },
  { icon: Globe, value: '+۱۰', suffix: 'کشور', label: 'پوشش جغرافیایی' },
  { icon: TrendingUp, value: '+۱۸', suffix: 'ارز', label: 'پوشش داده می‌شود' },
  { icon: Zap, value: '۹۹.۹', suffix: '٪', label: 'آپتایم سرویس' },
] as const;

const FEATURES = [
  {
    icon: Shield,
    title: 'امنیت بانکی',
    desc: 'تمام اطلاعات با رمزنگاری AES-256 محافظت می‌شوند و هرگز به اشخاص ثالث منتقل نمی‌شوند.',
  },
  {
    icon: Clock,
    title: 'به‌روزرسانی لحظه‌ای',
    desc: 'نرخ‌ها از منابع رسمی هر ۵ دقیقه آپدیت می‌شوند تا همیشه دقیق‌ترین اطلاعات را داشته باشید.',
  },
  {
    icon: Lock,
    title: 'پشتیبانی ۲۴ ساعته',
    desc: 'تیم پشتیبانی ما ۲۴ ساعت شبانه‌روز و ۷ روز هفته آماده پاسخگویی به سؤالات شماست.',
  },
] as const;

export default function TrustSection() {
  return (
    <section className={s.root} aria-labelledby="trust-title">
      <div className={s.bg} aria-hidden />

      <div className={s.inner}>
        <p className={s.tagline}>اعتماد هزاران کاربر افغانستانی</p>

        {/* Stats */}
        <ul className={s.statsGrid} aria-label="آمار پلتفرم">
          {STATS.map(({ icon: Icon, value, suffix, label }) => (
            <li key={label} className={s.statCard}>
              <div className={s.statIcon} aria-hidden>
                <Icon size={18} strokeWidth={1.75} />
              </div>
              <div>
                <span className={s.statValue} aria-label={`${value} ${suffix}`}>
                  {value}
                  <span className={s.statSuffix}>{suffix}</span>
                </span>
              </div>
              <p className={s.statLabel}>{label}</p>
            </li>
          ))}
        </ul>

        <div className={s.divider} aria-hidden />

        {/* Features */}
        <ul className={s.features} aria-label="ویژگی‌های کلیدی">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <li key={title} className={s.featureItem}>
              <div className={s.featureIcon} aria-hidden>
                <Icon size={16} strokeWidth={1.75} />
              </div>
              <div className={s.featureText}>
                <h3>{title}</h3>
                <p>{desc}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
