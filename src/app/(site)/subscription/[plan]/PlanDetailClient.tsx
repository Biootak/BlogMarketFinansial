'use client';

import { getPlan, type PlanId } from '@/lib/subscription-plans';
import {
  ArrowLeft,
  Check,
  ChevronRight,
  CreditCard,
  RefreshCw,
  Shield,
  Sparkles,
  Star,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import s from './subscription-plan.module.css';

type PlanDetailClientProps = {
  planId: PlanId;
};

function toFaPrice(rial: number): string {
  // plan prices are in ریال (rial) — convert to تومان by /10
  return (rial / 10).toLocaleString('fa-IR');
}

export function PlanDetailClient({ planId }: PlanDetailClientProps) {
  const router = useRouter();
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly');

  const plan = getPlan(planId);

  if (!plan) {
    return (
      <div className={s.page}>
        <div className="container">
          <div className={s.hero}>
            <h1 className={s.planName}>پلن یافت نشد</h1>
            <p className={s.planTagline}>
              پلن انتخابی شما وجود ندارد یا حذف شده است. لطفاً از صفحه پلن‌ها یک گزینه دیگر انتخاب کنید.
            </p>
            <Link href="/subscription" className={s.purchaseCta}>
              <span>مشاهده پلن‌ها</span>
              <ArrowLeft size={14} strokeWidth={2} aria-hidden />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const price = billing === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice;
  const isFree = plan.monthlyPrice === 0;
  const yearlyDiscount = Math.round(
    (1 - plan.yearlyPrice / (plan.monthlyPrice * 12 || 1)) * 100,
  );

  const handleSubscribe = () => {
    // Free plan → signup; paid plan → checkout (mock)
    if (isFree) {
      router.push('/auth');
    } else {
      router.push(`/subscription/${plan.id}/checkout?billing=${billing}`);
    }
  };

  return (
    <div className={s.layout}>
      {/* Main content */}
      <div>
        <article className={s.hero}>
          <nav className={s.breadcrumb} aria-label="مسیر">
            <Link href="/">خانه</Link>
            <ChevronRight size={12} className={s.breadcrumbSep} aria-hidden />
            <Link href="/subscription">اشتراک‌ها</Link>
            <ChevronRight size={12} className={s.breadcrumbSep} aria-hidden />
            <span>{plan.name}</span>
          </nav>

          {plan.badge ? (
            <div
              className={`${s.badge} ${plan.highlight ? s.badgePopular : ''}`}
              aria-label="نشان پلن"
            >
              {plan.highlight ? <Star size={11} strokeWidth={2} aria-hidden /> : null}
              {plan.badge}
            </div>
          ) : null}

          <h1 className={s.planName}>پلن {plan.name}</h1>
          <p className={s.planTagline}>{plan.tagline}</p>

          {!isFree ? (
            <div className={s.billingToggle} role="tablist" aria-label="دوره پرداخت">
              <button
                type="button"
                onClick={() => setBilling('monthly')}
                className={`${s.billingOption} ${
                  billing === 'monthly' ? s.billingOptionActive : ''
                }`}
                aria-pressed={billing === 'monthly'}
              >
                ماهانه
              </button>
              <button
                type="button"
                onClick={() => setBilling('yearly')}
                className={`${s.billingOption} ${
                  billing === 'yearly' ? s.billingOptionActive : ''
                }`}
                aria-pressed={billing === 'yearly'}
              >
                سالانه
                {yearlyDiscount > 0 ? (
                  <span className={s.billingSave}>{toFaPrice(yearlyDiscount)}٪</span>
                ) : null}
              </button>
            </div>
          ) : null}

          <div className={s.priceRow}>
            {isFree ? (
              <span className={s.priceFree}>رایگان</span>
            ) : (
              <>
                <span className={s.priceValue}>{toFaPrice(price)}</span>
                <span className={s.priceCurrency}>تومان</span>
                <span className={s.pricePer}>
                  / {billing === 'monthly' ? 'ماه' : 'سال'}
                </span>
              </>
            )}
          </div>
        </article>

        {/* Features */}
        <article className={s.featuresCard}>
          <h2 className={s.featuresTitle}>
            <Sparkles size={15} strokeWidth={1.75} style={{ color: 'var(--ds-brand-600)' }} aria-hidden />
            همه امکانات این پلن
          </h2>
          <ul className={s.featuresList}>
            {plan.features.map((f, i) => (
              <li
                key={`${plan.id}-f-${i}`}
                className={`${s.featureItem} ${f.ok ? s.featureItemOk : s.featureItemNo}`}
              >
                <span
                  className={`${s.featureIcon} ${f.ok ? s.featureIconOk : s.featureIconNo}`}
                  aria-hidden
                >
                  {f.ok ? (
                    <Check size={11} strokeWidth={3} />
                  ) : (
                    <X size={11} strokeWidth={2.5} />
                  )}
                </span>
                <span>{f.text}</span>
              </li>
            ))}
          </ul>
        </article>

        {/* Compare hint */}
        <div className={s.compareHint}>
          <Sparkles size={14} strokeWidth={1.75} style={{ color: 'var(--ds-brand-600)' }} aria-hidden />
          <span>برای مقایسه کامل پلن‌ها در یک نگاه، جدول مقایسه را ببینید.</span>
          <Link href="/subscription">
            <span>جدول مقایسه</span>
            <ArrowLeft size={12} strokeWidth={2} aria-hidden />
          </Link>
        </div>
      </div>

      {/* Sidebar */}
      <aside className={s.sidebar} aria-label="خلاصه خرید">
        <div className={s.purchaseCard}>
          <div className={s.purchaseTitle}>خلاصه سفارش</div>

          <div className={s.purchaseRow}>
            <span>پلن</span>
            <strong>{plan.name}</strong>
          </div>

          {!isFree ? (
            <>
              <div className={s.purchaseRow}>
                <span>دوره</span>
                <strong>{billing === 'monthly' ? 'ماهانه' : 'سالانه'}</strong>
              </div>
              {billing === 'yearly' && yearlyDiscount > 0 ? (
                <div className={s.purchaseRow}>
                  <span>تخفیف سالانه</span>
                  <strong style={{ color: 'var(--ds-success-500, oklch(0.7 0.15 150))' }}>
                    {toFaPrice(yearlyDiscount)}٪
                  </strong>
                </div>
              ) : null}
              <div className={s.purchaseTotal}>
                <span className={s.purchaseTotalLabel}>قابل پرداخت</span>
                <span className={s.purchaseTotalValue}>
                  {toFaPrice(price)} <span style={{ fontSize: 'var(--ds-text-xs)' }}>تومان</span>
                </span>
              </div>
            </>
          ) : (
            <div className={s.purchaseTotal}>
              <span className={s.purchaseTotalLabel}>هزینه</span>
              <span className={s.purchaseTotalValue} style={{ color: 'var(--ds-success-500, oklch(0.7 0.15 150))' }}>
                رایگان
              </span>
            </div>
          )}

          <button
            type="button"
            onClick={handleSubscribe}
            className={s.purchaseCta}
            aria-label={isFree ? 'شروع رایگان' : 'ادامه فرایند پرداخت'}
          >
            {isFree ? (
              <>
                <span>شروع رایگان</span>
                <ArrowLeft size={14} strokeWidth={2} aria-hidden />
              </>
            ) : (
              <>
                <CreditCard size={15} strokeWidth={1.75} aria-hidden />
                <span>ادامه فرایند پرداخت</span>
              </>
            )}
          </button>

          <Link href="/subscription" className={`${s.purchaseCta} ${s.purchaseCtaSecondary}`}>
            <RefreshCw size={13} strokeWidth={1.75} aria-hidden />
            مقایسه با پلن‌های دیگر
          </Link>

          <p className={s.purchaseNote}>
            {isFree
              ? 'بدون نیاز به کارت بانکی. هر زمان بخواهید می‌توانید ارتقا دهید.'
              : 'لغو در هر زمان • ۷ روز ضمانت بازگشت وجه'}
          </p>
        </div>

        <div className={s.trust}>
          <div className={s.trustItem}>
            <Shield size={15} strokeWidth={1.75} className={s.trustIcon} aria-hidden />
            <span>
              <strong>پرداخت امن</strong> با درگاه بانکی معتبر
            </span>
          </div>
          <div className={s.trustItem}>
            <RefreshCw size={15} strokeWidth={1.75} className={s.trustIcon} aria-hidden />
            <span>
              <strong>۷ روز ضمانت</strong> بازگشت کامل وجه
            </span>
          </div>
          <div className={s.trustItem}>
            <Check size={15} strokeWidth={1.75} className={s.trustIcon} aria-hidden />
            <span>
              <strong>لغو آسان</strong> در هر زمان از داشبورد
            </span>
          </div>
        </div>
      </aside>
    </div>
  );
}
