/**
 * exchange/dashboard — landing page for exchange-staff workspace.
 *
 * version 2026-07-27 (v3): بازطراحی کامل — ساختار asymmetric بیشتر،
 * استفاده از همهٔ sub-components، اضافه شدن insight ribbon و performance band.
 *
 *  - یک server call واحد برای همهٔ aggregate (getExchangeDashboardData)
 *  - یک server call برای recent transactions (transactions صفحه)
 *  - sub-components همگی Server Component (no client JS)
 *  - 1 stagger reveal animation، 0 chart-lib، 0 hex
 *  - 12-column responsive bento با span های نامتقارن
 */

import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  BarChart3,
  Bell,
  History,
  LayoutGrid,
  ListChecks,
  Users,
  Banknote,
  LineChart,
  CircleDollarSign,
  PieChart,
  UserSquare2,
} from 'lucide-react';
import { getExchangeForUser } from '@/actions/exchanges';
import { getExchangeDashboardData } from '@/actions/exchange-dashboard';
import { getTransactions } from '@/actions/exchange-transactions';

import ExchangeHeroPulse from './_components/ExchangeHeroPulse';
import ExchangeKpiRow from './_components/ExchangeKpiRow';
import ExchangeCurrencyFlow from './_components/ExchangeCurrencyFlow';
import ExchangeWeeklyRhythm from './_components/ExchangeWeeklyRhythm';
import ExchangeTransactionMix from './_components/ExchangeTransactionMix';
import ExchangeTopCustomers from './_components/ExchangeTopCustomers';
import ExchangePendingQueue from './_components/ExchangePendingQueue';
import ExchangeAlerts from './_components/ExchangeAlerts';
import ExchangeQuickActions from './_components/ExchangeQuickActions';
import ExchangeRecentTransactions from './_components/ExchangeRecentTransactions';
import ExchangeRateSnapshot from './_components/ExchangeRateSnapshot';
import ExchangeCustomerSegmentation from './_components/ExchangeCustomerSegmentation';
import ExchangePerformanceBand from './_components/ExchangePerformanceBand';
import ExchangeCustomerActivity from './_components/ExchangeCustomerActivity';
import ExchangeInsightRibbon from './_components/ExchangeInsightRibbon';
import s from './_components/ExchangeDashboard.module.css';

export const metadata = {
  title: 'داشبورد صراف',
  description: 'نمای کلی فعالیت صراف در لحظه',
};

export const dynamic = 'force-dynamic';

export default async function ExchangeDashboardPage() {
  const membership = await getExchangeForUser();
  if (!membership) redirect('/auth/onboarding');

  const exchangeId = membership.exchange.id;

  // موازی: aggregate + recent
  const [data, recentResp] = await Promise.all([
    getExchangeDashboardData(exchangeId),
    getTransactions(exchangeId, { limit: 8 }),
  ]);
  const recent = recentResp.rows;

  if (!data) redirect('/auth/onboarding');

  return (
    <div className={s.root}>
      {/* ۱. Hero pulse — signature moment */}
      <ExchangeHeroPulse
        todayVolume={data.kpi.todayVolume}
        yesterdayVolume={data.kpi.yesterdayVolume}
        primaryCurrency={data.primaryCurrency}
        exchangeName={data.exchangeName}
        city={data.city}
        sparkline={data.weeklyRhythm.map((d) => ({ volume: d.volume, count: d.count }))}
        nowIso={new Date().toISOString()}
      />

      {/* ۲. KPI row — 4 compact tiles */}
      <ExchangeKpiRow kpi={data.kpi} />

      {/* ۳. Performance band — comparison rows */}
      <section className={s.perfSection} aria-label="مقایسهٔ ادوار">
        <ExchangePerformanceBand
          metrics={data.performance}
          primaryCurrency={data.primaryCurrency}
        />
      </section>

      {/* ۴. Quick actions — 4 magnetic cards */}
      <section aria-label="اقدام‌های پرکاربرد">
        <ExchangeQuickActions />
      </section>

      {/* ۵. Insight ribbon — 4 quick insights */}
      <section aria-label="نکات برجسته">
        <ExchangeInsightRibbon
          currencyFlow={data.currencyFlow}
          topCustomers={data.topCustomers}
          weeklyRhythm={data.weeklyRhythm}
          primaryCurrency={data.primaryCurrency}
        />
      </section>

      {/* ۶. Bento row 1 — Currency flow (wide) + Pending queue (narrow) */}
      <div className={s.bento}>
        <section className={s.panel} aria-label="جریان ارزها" data-span="wide">
          <header className={s.panelHead}>
            <h3 className={s.panelTitle}>
              <Banknote size={16} aria-hidden />
              جریان ارزها
            </h3>
            <p className={s.panelSub}>تجمیع ۳۰ روز اخیر</p>
          </header>
          <div className={s.panelBody}>
            <ExchangeCurrencyFlow
              items={data.currencyFlow}
              primaryCurrency={data.primaryCurrency}
            />
          </div>
        </section>

        <section className={s.panel} aria-label="صف در انتظار">
          <header className={s.panelHead}>
            <h3 className={s.panelTitle}>
              <ListChecks size={16} aria-hidden />
              قدیمی‌ترین در انتظارها
            </h3>
            <p className={s.panelSub}>پنج مورد اول</p>
          </header>
          <div className={s.panelBody}>
            <ExchangePendingQueue items={data.pendingQueue} />
          </div>
        </section>
      </div>

      {/* ۷. Bento row 2 — Weekly rhythm (wide) + Transaction mix (narrow) */}
      <div className={s.bentoReverse}>
        <section className={s.panel} aria-label="ریتم هفتگی">
          <header className={s.panelHead}>
            <h3 className={s.panelTitle}>
              <BarChart3 size={16} aria-hidden />
              ریتم هفتگی
            </h3>
            <p className={s.panelSub}>تعداد تراکنش هر روز</p>
          </header>
          <div className={s.panelBody}>
            <ExchangeWeeklyRhythm data={data.weeklyRhythm} />
          </div>
        </section>

        <section className={s.panel} aria-label="ترکیب تراکنش‌ها" data-span="wide">
          <header className={s.panelHead}>
            <h3 className={s.panelTitle}>
              <PieChart size={16} aria-hidden />
              ترکیب تراکنش‌ها
            </h3>
            <p className={s.panelSub}>توزیع نوع در ۳۰ روز</p>
          </header>
          <div className={s.panelBody}>
            <ExchangeTransactionMix items={data.transactionMix} />
          </div>
        </section>
      </div>

      {/* ۸. Bento row 3 — Rate snapshot (wide) + Customer activity (narrow) */}
      <div className={s.bento}>
        <section className={s.panel} aria-label="نرخ‌های فعال" data-span="wide">
          <header className={s.panelHead}>
            <h3 className={s.panelTitle}>
              <CircleDollarSign size={16} aria-hidden />
              نرخ‌های فعال
            </h3>
            <p className={s.panelSub}>۶ نرخ برتر</p>
          </header>
          <div className={s.panelBody}>
            <ExchangeRateSnapshot items={data.rateSnapshot} />
          </div>
        </section>

        <section className={s.panel} aria-label="فعالیت مشتریان">
          <header className={s.panelHead}>
            <h3 className={s.panelTitle}>
              <UserSquare2 size={16} aria-hidden />
              فعالیت مشتریان
            </h3>
            <p className={s.panelSub}>۷ و ۳۰ روز اخیر</p>
          </header>
          <div className={s.panelBody}>
            <ExchangeCustomerActivity data={data.customerActivity} />
          </div>
        </section>
      </div>

      {/* ۹. Bento row 4 — Customer segmentation (wide) + Alerts (narrow) */}
      <div className={s.bentoReverse}>
        <section className={s.panel} aria-label="ساختار مشتریان">
          <header className={s.panelHead}>
            <h3 className={s.panelTitle}>
              <LayoutGrid size={16} aria-hidden />
              ساختار مشتریان
            </h3>
            <p className={s.panelSub}>وضعیت و KYC</p>
          </header>
          <div className={s.panelBody}>
            <ExchangeCustomerSegmentation data={data.customerSegmentation} />
          </div>
        </section>

        <section className={s.panel} aria-label="هشدارها" data-span="wide">
          <header className={s.panelHead}>
            <h3 className={s.panelTitle}>
              <Bell size={16} aria-hidden />
              هشدارها
            </h3>
            <p className={s.panelSub}>نیاز به اقدام</p>
          </header>
          <div className={s.panelBody}>
            <ExchangeAlerts alerts={data.alerts} />
          </div>
        </section>
      </div>

      {/* ۱۰. Top customers + Recent activity side-by-side */}
      <div className={s.bentoFocus}>
        <section className={s.panel} aria-label="مشتریان فعال">
          <header className={s.panelHead}>
            <h3 className={s.panelTitle}>
              <Users size={16} aria-hidden />
              مشتریان فعال
            </h3>
            <p className={s.panelSub}>پنج برتر ۳۰ روز اخیر</p>
          </header>
          <div className={s.panelBody}>
            <ExchangeTopCustomers items={data.topCustomers} />
          </div>
        </section>

        <section className={s.panel} aria-label="آخرین تراکنش‌ها" data-span="wide">
          <header className={s.panelHead}>
            <h3 className={s.panelTitle}>
              <History size={16} aria-hidden />
              آخرین تراکنش‌ها
            </h3>
            <p className={s.panelSub}>{recent.length} مورد اخیر</p>
          </header>
          <div className={s.panelBody}>
            <ExchangeRecentTransactions transactions={recent} limit={8} />
          </div>
        </section>
      </div>

      {/* ۱۱. Footer link to insights page */}
      <footer className={s.footer} aria-label="پاورقی">
        <Link href="/exchange/dashboard/insights" className={s.footerLink}>
          <LineChart size={14} aria-hidden />
          <span>مشاهدهٔ بینش‌های تفصیلی</span>
        </Link>
        <span className={s.footerSep} aria-hidden>
          ·
        </span>
        <span className={s.footerTime}>
          آخرین به‌روزرسانی:&nbsp;
          <span dir="ltr">
            {new Intl.DateTimeFormat('fa-IR', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            }).format(new Date())}
          </span>
        </span>
      </footer>
    </div>
  );
}
