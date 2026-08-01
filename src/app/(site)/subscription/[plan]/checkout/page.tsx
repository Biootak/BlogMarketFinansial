import { auth } from '@/auth';
import { getPlan } from '@/lib/subscription-plans';
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { CheckoutClient } from './CheckoutClient';
import s from './checkout.module.css';

type Params = Promise<{ plan: string }>;
type SearchParams = Promise<{ billing?: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { plan: rawPlan } = await params;
  const plan = getPlan(rawPlan);
  return {
    title: plan ? `پرداخت — پلن ${plan.name} | اشتراک` : 'پرداخت | اشتراک',
    robots: { index: false },
  };
}

/**
 * /subscription/[plan]/checkout — صفحهٔ پرداخت پلن اشتراک.
 *
 * 2026-08-01: قبلاً PlanDetailClient به /subscription/[plan]/checkout لینک
 * می‌داد ولی این مسیر صفحه نداشت → 404 روی «ادامه فرایند پرداخت» (دکمهٔ مرده).
 * حالا این صفحه checkout واقعی است که:
 *   - پلن + دورهٔ صورتحساب را از URL می‌خواند
 *   - خلاصهٔ سفارش را از PLANS (pure data) می‌سازد
 *   - با server action `changePlan` (واقعی — SubscriptionEvent + audit log
 *     + idempotency + rate-limit) پرداخت را ثبت می‌کند
 *   - بعد از موفقیت به داشبورد اشتراک redirect می‌کند تا کاربر تاریخچه را ببیند
 */
export default async function CheckoutPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { plan: rawPlan } = await params;
  const sp = await searchParams;
  const billing = sp.billing === 'yearly' ? 'yearly' : 'monthly';

  const plan = getPlan(rawPlan);
  if (!plan) notFound();

  // پلن رایگان به checkout نمی‌رسد — CTA همان /auth است.
  if (plan.monthlyPrice === 0) {
    redirect('/subscription');
  }

  const session = await auth();
  if (!session?.user) {
    redirect(`/auth?callbackUrl=/subscription/${plan.id}/checkout?billing=${billing}`);
  }

  const price = billing === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
  const yearlyDiscount = Math.round((1 - plan.yearlyPrice / (plan.monthlyPrice * 12 || 1)) * 100);

  const userEmail = session.user.email ?? '';

  return (
    <main className={s.page} dir="rtl">
      <div className={s.inner}>
        {/* ── Header ── */}
        <header className={s.head}>
          <span className={s.eyebrow}>پرداخت امن</span>
          <h1 className={s.title}>تکمیل اشتراک</h1>
          <p className={s.sub}>
            پلن {plan.name} · {billing === 'yearly' ? 'سالانه' : 'ماهانه'}
          </p>
        </header>

        {/* ── Checkout layout ── */}
        <div className={s.layout}>
          {/* Order summary */}
          <section className={s.summary} aria-label="خلاصه سفارش">
            <div className={s.summaryHeader}>
              <div className={s.planName}>
                <span className={s.planNameDot} aria-hidden />
                پلن {plan.name}
              </div>
              <span className={s.planBadge}>{plan.badge ?? ''}</span>
            </div>

            <dl className={s.rows}>
              <div className={s.row}>
                <dt className={s.rowLabel}>دوره صورتحساب</dt>
                <dd className={s.rowValue}>
                  {billing === 'yearly' ? 'سالانه' : 'ماهانه'}
                  {billing === 'yearly' && yearlyDiscount > 0 ? (
                    <span className={s.saveBadge}>{yearlyDiscount}٪ تخفیف</span>
                  ) : null}
                </dd>
              </div>
              <div className={s.row}>
                <dt className={s.rowLabel}>واحد پول</dt>
                <dd className={s.rowValue} dir="ltr">
                  {plan.currency}
                </dd>
              </div>
            </dl>

            <div className={s.total}>
              <span className={s.totalLabel}>مبلغ قابل پرداخت</span>
              <span className={s.totalValue}>
                {new Intl.NumberFormat('fa-IR').format(price / 100)}
                <span className={s.totalUnit}>{plan.currency}</span>
              </span>
            </div>

            <p className={s.note}>
              با تکمیل پرداخت، پلن بلافاصله فعال می‌شود و فاکتور در داشبورد «اشتراک من» ثبت می‌شود.
            </p>
          </section>

          {/* Payment form */}
          <section className={s.pay} aria-label="فرم پرداخت">
            <CheckoutClient
              planId={plan.id}
              planName={plan.name}
              billing={billing}
              priceDisplay={new Intl.NumberFormat('fa-IR').format(price / 100)}
              currency={plan.currency}
              userEmail={userEmail}
            />
          </section>
        </div>
      </div>
    </main>
  );
}
