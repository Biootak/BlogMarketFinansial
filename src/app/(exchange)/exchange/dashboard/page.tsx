/**
 * exchange/dashboard — landing page for exchange-staff workspace.
 *
 * version 2026-07-27: بازطراحی کامل — ساختار bento نامتقارن به جای
 * StatCard grid. همهٔ داده‌ها real از DB.
 *
 *  - یک server call واحد برای همهٔ aggregate (getExchangeDashboardData)
 *  - یک server call برای recent transactions (transactions صفحه)
 *  - sub-components همگی Server Component (no client JS)
 *  - 1 stagger reveal animation، 0 chart-lib، 0 hex
 */

import { redirect } from 'next/navigation';
import { Banknote, BarChart3, Bell, History, LayoutGrid, ListChecks, Users } from 'lucide-react';
import { getSession } from '@/lib/session';
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
import s from './_components/ExchangeDashboard.module.css';

export const metadata = {
  title: 'داشبورد صراف',
  description: 'نمای کلی فعالیت صراف در لحظه',
};

export const dynamic = 'force-dynamic';

export default async function ExchangeDashboardPage() {
  const session = await getSession();
  if (!session?.user) redirect('/auth/signin');

  const exchangeId = session.user.exchangeId;
  if (!exchangeId) redirect('/auth/onboarding');

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

      {/* ۲. KPI row */}
      <ExchangeKpiRow kpi={data.kpi} />

      {/* ۳. Quick actions */}
      <section aria-label="اقدام‌های پرکاربرد">
        <ExchangeQuickActions />
      </section>

      {/* ۴. Bento grid — primary 2-column */}
      <div className={s.bento}>
        <section className={s.panel} aria-label="جریان ارزها">
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

        <section className={s.panel} aria-label="ترکیب تراکنش‌ها">
          <header className={s.panelHead}>
            <h3 className={s.panelTitle}>
              <LayoutGrid size={16} aria-hidden />
              ترکیب تراکنش‌ها
            </h3>
            <p className={s.panelSub}>توزیع نوع در ۳۰ روز</p>
          </header>
          <div className={s.panelBody}>
            <ExchangeTransactionMix items={data.transactionMix} />
          </div>
        </section>
      </div>

      {/* ۵. Lower band — Alerts + Top customers */}
      <div className={s.bento}>
        <section className={s.panel} aria-label="هشدارها">
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
      </div>

      {/* ۶. Recent activity — full width */}
      <section className={s.panel} aria-label="آخرین تراکنش‌ها">
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
  );
}
