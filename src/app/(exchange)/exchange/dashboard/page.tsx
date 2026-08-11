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

import { getExchangeDashboardData } from '@/actions/exchange-dashboard';
import { getTransactions } from '@/actions/exchange-transactions';
import { getExchangeForUser } from '@/actions/exchanges';
import { PageHeader, Section, StatusTimeline } from '@/components/Dashboard/primitives';
import { BookmarkButton } from '@/components/Dashboard/primitives/BookmarkButton';
import {
  Banknote,
  BarChart3,
  Bell,
  CircleDollarSign,
  History,
  LayoutGrid,
  LineChart,
  ListChecks,
  PieChart,
  UserSquare2,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import ExchangeAlerts from './_components/ExchangeAlerts';
import ExchangeCurrencyFlow from './_components/ExchangeCurrencyFlow';
import ExchangeCustomerActivity from './_components/ExchangeCustomerActivity';
import ExchangeCustomerSegmentation from './_components/ExchangeCustomerSegmentation';
import s from './_components/ExchangeDashboard.module.css';
import ExchangeHeroPulse from './_components/ExchangeHeroPulse';
import ExchangeInsightRibbon from './_components/ExchangeInsightRibbon';
import ExchangeKpiRow from './_components/ExchangeKpiRow';
import ExchangePendingQueue from './_components/ExchangePendingQueue';
import ExchangePerformanceBand from './_components/ExchangePerformanceBand';
import ExchangeQuickActions from './_components/ExchangeQuickActions';
import ExchangeRateSnapshot from './_components/ExchangeRateSnapshot';
import ExchangeRecentTransactions from './_components/ExchangeRecentTransactions';
import ExchangeTopCustomers from './_components/ExchangeTopCustomers';
import ExchangeTransactionMix from './_components/ExchangeTransactionMix';
import ExchangeWeeklyRhythm from './_components/ExchangeWeeklyRhythm';

export const metadata = {
  title: 'داشبورد صراف',
  description: 'نمای کلی فعالیت صراف در لحظه',
};

export const dynamic = 'force-dynamic';

export default async function ExchangeDashboardPage() {
  const membership = await getExchangeForUser();
  // 2026-08-10: کاربر لاگین‌شده بدون عضویت صرافی نباید به /auth برگردد —
  // (الف) از قبل لاگین است و (ب) با auto-redirect فرانت‌اند یک حلقهٔ بی‌پایان
  // /exchange/dashboard → /auth → /exchange/dashboard می‌سازد. /forbidden
  // خروجی امن است (middleware آن را نمی‌گیرد).
  if (!membership) redirect('/forbidden');

  const exchangeId = membership.exchange.id;

  // موازی: aggregate + recent
  const [data, recentResp] = await Promise.all([
    getExchangeDashboardData(exchangeId),
    getTransactions(exchangeId, { limit: 8 }),
  ]);
  const recent = recentResp.rows;

  if (!data) redirect('/forbidden');

  return (
    <div className={s.root}>
      {/* ۰. PageHeader — unified breadcrumb + title */}
      <PageHeader
        title="داشبورد صراف"
        description="نمای کلی فعالیت صرافی در لحظه"
        icon="layout-dashboard"
        accent="indigo"
        variant="compact"
        meta={[
          { label: 'حجم امروز', value: data.kpi.todayVolume },
          { label: 'تراکنش‌ها', value: data.kpi.todayCount },
          { label: 'مشتریان فعال', value: data.kpi.activeCustomers },
        ]}
        actions={<BookmarkButton pageKey="exchange-dashboard" />}
      />

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

      {/* ۱۱. Activity Feed — recent transactions as timeline */}
      <Section title="فعالیت‌های اخیر" subtitle="آخرین تراکنش‌ها" data-testid="activity-feed">
        <StatusTimeline
          items={recent.slice(0, 5).map((t) => ({
            icon:
              t.kind === 'DEPOSIT' ? 'wallet' : t.kind === 'WITHDRAWAL' ? 'creditCard' : 'activity',
            label: `${t.customer?.fullName ?? 'مشتری'} — ${t.kind}`,
            description: `${t.amount} ${t.currency}`,
            timestamp: t.createdAt,
            tone:
              t.status === 'COMPLETED' ? 'success' : t.status === 'PENDING' ? 'warning' : 'danger',
            href: `/exchange/transactions/${t.id}`,
          }))}
          emptyMessage="هنوز تراکنشی ثبت نشده"
        />
      </Section>

      {/* ۱۲. Footer link to insights page */}
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
