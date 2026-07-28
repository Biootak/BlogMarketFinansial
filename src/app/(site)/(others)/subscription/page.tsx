import { getSiteIdentity } from '@/lib/site-identity';
import { PLANS } from '@/lib/subscription-plans';
import { Check, Gem } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import s from './subscription.module.css';

export async function generateMetadata(): Promise<Metadata> {
  const { siteName } = await getSiteIdentity();
  return {
    title: `طرح‌های اشتراک | ${siteName}`,
    description: 'قیمت‌گذاری ساده و شفاف برای هر نوع کسب و کار — از رایگان تا سازمانی.',
    alternates: { canonical: '/subscription' },
  };
}

const PLAN_SLUGS: Record<string, string> = {
  free: 'free',
  pro: 'pro',
  business: 'business',
};

function toFaPrice(rial: number): string {
  // plan prices are in ریال (rial) — convert to تومان by /10
  return (rial / 10).toLocaleString('fa-IR');
}

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
          {PLANS.map((plan) => {
            const slug = PLAN_SLUGS[plan.id];
            const isFree = plan.monthlyPrice === 0;
            return (
              <article
                key={plan.id}
                className={`${s.card} ${plan.highlight ? s.cardPopular : ''}`}
                aria-label={`طرح ${plan.name}`}
              >
                {plan.badge ? (
                  <div className={s.popularBadge} aria-label="نشان پلن">
                    {plan.highlight ? <Gem size={11} strokeWidth={1.75} aria-hidden /> : null}
                    {plan.badge}
                  </div>
                ) : null}

                {/* Plan header */}
                <div className={s.planName}>{plan.name}</div>
                <div className={s.price}>
                  {isFree ? (
                    <span className={s.priceNum}>رایگان</span>
                  ) : (
                    <>
                      <span className={s.priceNum}>
                        {toFaPrice(plan.monthlyPrice)}
                      </span>
                      <span className={s.pricePer}>تومان / ماه</span>
                    </>
                  )}
                </div>
                <p className={s.desc}>{plan.tagline}</p>

                <div className={s.divider} />

                {/* Features */}
                <ul className={s.features}>
                  {plan.features
                    .filter((f) => f.ok)
                    .slice(0, 5)
                    .map((feat) => (
                      <li key={feat.text} className={s.feature}>
                        <span className={s.featureCheck} aria-hidden>
                          <Check size={11} strokeWidth={2.5} />
                        </span>
                        {feat.text}
                      </li>
                    ))}
                </ul>

                {/* CTA — always links to the plan detail page */}
                <Link
                  href={`/subscription/${slug}`}
                  className={`${s.btn} ${plan.highlight ? s.btnPrimary : s.btnGhost}`}
                  aria-label={`مشاهده جزئیات طرح ${plan.name}`}
                >
                  {isFree ? 'شروع رایگان' : 'مشاهده و ثبت‌نام'}
                </Link>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
