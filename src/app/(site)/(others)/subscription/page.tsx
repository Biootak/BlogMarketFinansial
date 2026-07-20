import { getSiteIdentity } from '@/lib/site-identity';
import { Check, Gem } from 'lucide-react';
import type { Metadata } from 'next';
import s from './subscription.module.css';

export async function generateMetadata(): Promise<Metadata> {
  const { siteName } = await getSiteIdentity();
  return {
    title: `طرح‌های اشتراک | ${siteName}`,
    description: 'قیمت‌گذاری ساده و شفاف برای هر نوع کسب و کار — از استارتر تا پلاس.',
  };
}

interface PricingItem {
  name: string;
  pricing: string;
  per: string;
  desc: string;
  features: string[];
  isPopular: boolean;
}

const pricings: PricingItem[] = [
  {
    isPopular: false,
    name: 'استارتر',
    pricing: '۵',
    per: '/ ماه',
    desc: 'برای شروع کار و آشنایی با خدمات ما مناسب است.',
    features: ['گزارش‌دهی خودکار', 'پردازش سریع‌تر', 'سفارشی‌سازی پایه', 'پشتیبانی ایمیلی'],
  },
  {
    isPopular: true,
    name: 'پایه',
    pricing: '۱۵',
    per: '/ ماه',
    desc: 'محبوب‌ترین طرح ما — برای اکثر کسب‌وکارها ایده‌آل است.',
    features: [
      'همه امکانات استارتر',
      '۱۰۰ تراکنش در ماه',
      'گزارش‌های پیشرفته',
      'پشتیبانی اولویت‌دار',
      'API دسترسی',
    ],
  },
  {
    isPopular: false,
    name: 'پلاس',
    pricing: '۲۵',
    per: '/ ماه',
    desc: 'برای کسب‌وکارهای بزرگ با نیازهای پیشرفته.',
    features: [
      'همه امکانات پایه',
      'تراکنش نامحدود',
      'تجزیه و تحلیل پیشرفته',
      'ارزیابی اختصاصی شرکت',
      'مدیر حساب اختصاصی',
      'SLA 99.9٪',
    ],
  },
];

export default function SubscriptionPage() {
  return (
    <div>
      {/* ── Header ─────────────────────────────────────────────── */}
      <header className={s.header}>
        <div className={s.eyebrow}>
          <Gem size={13} strokeWidth={1.75} aria-hidden />
          طرح‌های اشتراک
        </div>
        <h1 className={s.title}>
          قیمت‌گذاری <span className={s.titleAccent}>ساده و شفاف</span>
        </h1>
        <p className={s.sub}>برای هر نوع کسب و کار — بدون هزینه پنهان</p>
      </header>

      {/* ── Pricing grid ───────────────────────────────────────── */}
      <section aria-label="طرح‌های اشتراک">
        <div className={s.grid}>
          {pricings.map((plan) => (
            <article
              key={plan.name}
              className={`${s.card} ${plan.isPopular ? s.cardPopular : ''}`}
              aria-label={`طرح ${plan.name}`}
            >
              {plan.isPopular && (
                <div className={s.popularBadge} aria-label="محبوب‌ترین طرح">
                  <Gem size={11} strokeWidth={1.75} aria-hidden />
                  محبوب
                </div>
              )}

              {/* Plan header */}
              <div className={s.planName}>{plan.name}</div>
              <div className={s.price}>
                <span className={s.priceNum}>${plan.pricing}</span>
                <span className={s.pricePer}>{plan.per}</span>
              </div>
              <p className={s.desc}>{plan.desc}</p>

              <div className={s.divider} />

              {/* Features */}
              <ul className={s.features}>
                {plan.features.map((feat) => (
                  <li key={feat} className={s.feature}>
                    <span className={s.featureCheck} aria-hidden>
                      <Check size={11} strokeWidth={2.5} />
                    </span>
                    {feat}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <button
                type="button"
                className={`${s.btn} ${plan.isPopular ? s.btnPrimary : s.btnGhost}`}
                aria-label={`ثبت نام در طرح ${plan.name}`}
              >
                ثبت نام
              </button>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
