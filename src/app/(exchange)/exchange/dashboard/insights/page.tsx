/**
 * exchange/dashboard/insights — sub-page.
 *
 * نمای عمیق‌تر از analytics داشبورد: عملکرد ادوار، فعالیت مشتریان، آمار
 * تفصیلی. داده‌ها همگی از `getExchangeDashboardData` می‌آیند (single roundtrip).
 *
 * Server Component.
 */

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, BarChart3, TrendingUp, Users, Activity, Grid3x3 } from 'lucide-react';
import { getExchangeForUser } from '@/actions/exchanges';
import { getExchangeDashboardData } from '@/actions/exchange-dashboard';
import ExchangePerformanceBand from '../_components/ExchangePerformanceBand';
import ExchangeCustomerActivity from '../_components/ExchangeCustomerActivity';
import ExchangeCurrencyFlow from '../_components/ExchangeCurrencyFlow';
import ExchangeWeeklyRhythm from '../_components/ExchangeWeeklyRhythm';
import ExchangeTransactionMix from '../_components/ExchangeTransactionMix';
import ExchangeCustomerSegmentation from '../_components/ExchangeCustomerSegmentation';
import ExchangeActivityHeatmap from '../_components/ExchangeActivityHeatmap';
import s from '../_components/ExchangeDashboard.module.css';

export const metadata = {
  title: 'بینش‌های صراف',
  description: 'تحلیل عمیق‌تر فعالیت صراف',
};

export const dynamic = 'force-dynamic';

export default async function ExchangeInsightsPage() {
  const membership = await getExchangeForUser();
  if (!membership) redirect('/auth/onboarding');
  const exchangeId = membership.exchange.id;

  const data = await getExchangeDashboardData(exchangeId);
  if (!data) redirect('/auth/onboarding');

  return (
    <div className={s.root}>
      {/* Header */}
      <header className={s.pageHeader}>
        <nav aria-label="مسیر">
          <Link href="/exchange/dashboard" className={s.crumb}>
            <ChevronRight size={12} aria-hidden style={{ transform: 'scaleX(-1)' }} />
            داشبورد
          </Link>
          <span className={s.crumbSep} aria-hidden>
            /
          </span>
          <span className={s.crumbCurrent}>بینش‌ها</span>
        </nav>
        <h1 className={s.pageTitle}>بینش‌های عملکردی</h1>
        <p className={s.pageSub}>
          مقایسهٔ ادوار، الگوی فعالیت مشتریان، و توزیع تفصیلی تراکنش‌ها در یک نما.
        </p>
      </header>

      {/* Performance band — full width */}
      <section className={s.insightsPanel} aria-label="مقایسهٔ ادوار">
        <header className={s.panelHead}>
          <h2 className={s.panelTitle}>
            <TrendingUp size={16} aria-hidden />
            عملکرد در ادوار مختلف
          </h2>
          <p className={s.panelSub}>مقایسهٔ امروز، هفته و ماه با دورهٔ قبل</p>
        </header>
        <div className={s.panelBody}>
          <ExchangePerformanceBand
            metrics={data.performance}
            primaryCurrency={data.primaryCurrency}
          />
        </div>
      </section>

      {/* Customer activity + segmentation — 2 columns asymmetric */}
      <div className={s.bentoTrio}>
        <section className={s.panel} aria-label="فعالیت مشتریان" data-span="2">
          <header className={s.panelHead}>
            <h2 className={s.panelTitle}>
              <Users size={16} aria-hidden />
              فعالیت مشتریان
            </h2>
            <p className={s.panelSub}>شاخص‌های کلیدی ۷ و ۳۰ روز اخیر</p>
          </header>
          <div className={s.panelBody}>
            <ExchangeCustomerActivity data={data.customerActivity} />
          </div>
        </section>

        <section className={s.panel} aria-label="ساختار مشتریان">
          <header className={s.panelHead}>
            <h2 className={s.panelTitle}>
              <BarChart3 size={16} aria-hidden />
              ساختار
            </h2>
            <p className={s.panelSub}>وضعیت و KYC</p>
          </header>
          <div className={s.panelBody}>
            <ExchangeCustomerSegmentation data={data.customerSegmentation} />
          </div>
        </section>
      </div>

      {/* Currency flow + Weekly rhythm */}
      <div className={s.bentoFocus}>
        <section className={s.panel} aria-label="جریان ارزها">
          <header className={s.panelHead}>
            <h2 className={s.panelTitle}>
              <Activity size={16} aria-hidden />
              جریان ارزها
            </h2>
            <p className={s.panelSub}>۳۰ روز اخیر</p>
          </header>
          <div className={s.panelBody}>
            <ExchangeCurrencyFlow
              items={data.currencyFlow}
              primaryCurrency={data.primaryCurrency}
            />
          </div>
        </section>

        <section className={s.panel} aria-label="ریتم هفتگی">
          <header className={s.panelHead}>
            <h2 className={s.panelTitle}>
              <BarChart3 size={16} aria-hidden />
              ریتم هفتگی
            </h2>
            <p className={s.panelSub}>تعداد تراکنش هر روز</p>
          </header>
          <div className={s.panelBody}>
            <ExchangeWeeklyRhythm data={data.weeklyRhythm} />
          </div>
        </section>
      </div>

      {/* Transaction mix — full width for legend visibility */}
      <section className={s.panel} aria-label="ترکیب تراکنش‌ها">
        <header className={s.panelHead}>
          <h2 className={s.panelTitle}>
            <BarChart3 size={16} aria-hidden />
            ترکیب تراکنش‌ها
          </h2>
          <p className={s.panelSub}>توزیع نوع در ۳۰ روز</p>
        </header>
        <div className={s.panelBody}>
          <ExchangeTransactionMix items={data.transactionMix} />
        </div>
      </section>

      {/* Activity heatmap — full width for the 7×24 grid */}
      <section className={s.insightsPanel} aria-label="heatmap فعالیت">
        <header className={s.panelHead}>
          <h2 className={s.panelTitle}>
            <Grid3x3 size={16} aria-hidden />
            heatmap فعالیت ۳۰ روز
          </h2>
          <p className={s.panelSub}>
            توزیع تراکنش‌ها بر اساس روز هفته و ساعت — اوج ساعت با کادر طلایی مشخص است
          </p>
        </header>
        <div className={s.panelBody}>
          <ExchangeActivityHeatmap data={data.activityHeatmap} />
        </div>
      </section>
    </div>
  );
}
