import { ArrowLeft, BarChart2, SendHorizonal, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import s from './ServicesSection.module.css';

/**
 * ServicesSection — سه سرویس اصلی پلتفرم
 *
 * بخش «چرا Financial Market؟» — نمایش ۳ سرویس اصلی با
 * micro-interaction، elevation tiers و tokens-only.
 * Server Component — بدون client-side JS.
 */

const SERVICES = [
  {
    icon: TrendingUp,
    title: 'نرخ لحظه‌ای',
    description:
      'نرخ ارز افغانستان، ایران و بازارهای جهانی — به‌روزرسانی هر ۵ دقیقه از منابع معتبر.',
    href: '/money-transfer',
    cta: 'مشاهده نرخ‌ها',
    accent: 'emerald',
    stat: '۱۸+ ارز',
  },
  {
    icon: SendHorizonal,
    title: 'حواله امن',
    description:
      'انتقال پول بین افغانستان و ایران با امنیت بالا، کارمزد رقابتی و پشتیبانی ۲۴ ساعته.',
    href: '/customer/transfer',
    cta: 'شروع حواله',
    accent: 'amber',
    stat: 'بدون کارمزد',
  },
  {
    icon: BarChart2,
    title: 'تحلیل تخصصی',
    description: 'تحلیل‌های عمیق بازار، پیش‌بینی روند قیمت‌ها و اخبار اقتصادی توسط تیم متخصص.',
    href: '/financial-news',
    cta: 'خواندن تحلیل‌ها',
    accent: 'violet',
    stat: '+۵۰۰ مقاله',
  },
] as const;

export default function ServicesSection() {
  return (
    <section className={s.root} aria-labelledby="services-title">
      {/* Section header */}
      <div className={s.header}>
        <p className={s.eyebrow}>سرویس‌های ما</p>
        <h2 className={s.title} id="services-title">
          همه آنچه برای
          <span className={s.titleAccent}> بازار مالی </span>
          نیاز دارید
        </h2>
        <p className={s.subtitle}>
          از نرخ لحظه‌ای تا حواله امن — یک پلتفرم برای همه نیازهای مالی شما
        </p>
      </div>

      {/* Services grid */}
      <ul className={s.grid} aria-label="سرویس‌های پلتفرم">
        {SERVICES.map(({ icon: Icon, title, description, href, cta, accent, stat }) => (
          <li key={title} className={`${s.card} ${s[`accent_${accent}`]}`}>
            {/* Icon */}
            <div className={s.iconWrap} aria-hidden>
              <Icon size={20} strokeWidth={1.75} />
            </div>

            {/* بدنه کارت — در موبایل flex-col درون row */}
            <div className={s.cardBody}>
              {/* Stat badge */}
              <div className={s.statBadge}>{stat}</div>

              {/* Content */}
              <h3 className={s.cardTitle}>{title}</h3>
              <p className={s.cardDesc}>{description}</p>

              {/* CTA */}
              <Link href={href} className={s.cardCta} aria-label={`${cta} — ${title}`}>
                {cta}
                <ArrowLeft size={13} strokeWidth={1.75} className={s.ctaArrow} />
              </Link>
            </div>

            {/* Hover glow */}
            <div className={s.cardGlow} aria-hidden />
          </li>
        ))}
      </ul>
    </section>
  );
}
