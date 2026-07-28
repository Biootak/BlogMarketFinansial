'use client';

/**
 * ReportsCockpit — ارکستریتور reports page (P2026 redesign).
 *
 * ساختار:
 *   1. KPI Ribbon (4 cells: total volume, fee, deals, avg)
 *   2. CurrencyConstellation (signature) — radial SVG از ارزها
 *   3. DailyVolumeStrip — heatmap 7 روز اخیر
 *   4. Two-column: TopCustomersRail | PnLByCurrency
 *   5. FilterBar
 *   6. TransactionsTable
 *
 * Client Component — هیچ server data fetching.
 */

import { useMemo, useState, useTransition } from 'react';
import { generateReportCsv } from '@/actions/reporting';
import { Coins, FileSpreadsheet, Layers, Percent, Receipt, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import CurrencyConstellation from './CurrencyConstellation';
import DailyVolumeStrip, { type DailyBucket } from './DailyVolumeStrip';
import FilterBar from './FilterBar';
import PnLByCurrency, { type PnLRow } from './PnLByCurrency';
import TopCustomersRail, { type TopCustomer } from './TopCustomersRail';
import TransactionsTable from './TransactionsTable';
import s from './ReportsCockpit.module.css';

interface ReportLite {
  totalVolume: number;
  totalFee: number;
  totalDeals: number;
  pnlByCurrency: PnLRow[];
  topCustomers: TopCustomer[];
  dailySummary: Array<{ date: string; volume: number; dealCount: number }>;
}

interface Props {
  exchangeId: string;
  report: ReportLite;
  txRows: Array<import('@/actions/exchange-transactions').TransactionRow>;
  txTotal: number;
}

const fmtCompact = (v: number): string =>
  new Intl.NumberFormat('fa-IR', {
    notation: 'compact',
    maximumFractionDigits: 2,
  }).format(v);

const fmtExact = (v: number): string =>
  new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 2 }).format(v);

export default function ReportsCockpit({ exchangeId, report, txRows, txTotal }: Props) {
  const [exporting, setExporting] = useState(false);
  const [, startTransition] = useTransition();

  // ── KPI derived values ─────────────────────────────────────────
  const avgDeal = report.totalDeals > 0 ? report.totalVolume / report.totalDeals : 0;
  const feePct = report.totalVolume > 0 ? (report.totalFee / report.totalVolume) * 100 : 0;

  // ── Daily strip buckets (last 7 days from dailySummary) ────────
  const dailyBuckets: DailyBucket[] = useMemo(() => {
    return report.dailySummary
      .slice(-7)
      .map((d) => ({ date: new Date(d.date), volume: d.volume, dealCount: d.dealCount }));
  }, [report.dailySummary]);

  const topCurrency = report.pnlByCurrency[0];
  const primaryCurrency = topCurrency?.currency ?? 'AFN';

  const handleExport = () => {
    startTransition(async () => {
      setExporting(true);
      const result = await generateReportCsv(exchangeId);
      if (result.success) {
        const blob = new Blob([result.data.csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = result.data.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
      setExporting(false);
    });
  };

  return (
    <div className={s.root}>
      {/* ── 1. KPI Ribbon ──────────────────────────────────────────── */}
      <section className={s.ribbon} aria-label="KPI های کلیدی">
        <div className={s.cell} data-tone="emerald">
          <div className={s.cellHead}>
            <span className={s.cellIcon} data-tone="emerald" aria-hidden>
              <Layers size={13} strokeWidth={1.75} />
            </span>
            <span className={s.cellLabel}>حجم کل دوره</span>
          </div>
          <div className={s.cellValue}>
            <span className={s.cellNumber}>{fmtCompact(report.totalVolume)}</span>
            <span className={s.cellUnit}>{primaryCurrency}</span>
          </div>
          <span className={s.cellMeta}>
            {new Intl.NumberFormat('fa-IR').format(report.totalDeals)} معامله
          </span>
        </div>

        <div className={s.cell} data-tone="amber">
          <div className={s.cellHead}>
            <span className={s.cellIcon} data-tone="amber" aria-hidden>
              <Percent size={13} strokeWidth={1.75} />
            </span>
            <span className={s.cellLabel}>کارمزد کل</span>
          </div>
          <div className={s.cellValue}>
            <span className={s.cellNumber} data-tone="amber">
              {fmtCompact(report.totalFee)}
            </span>
            <span className={s.cellUnit}>IRR</span>
          </div>
          <span className={s.cellMeta}>
            <span className={s.cellMetaLabel}>نرخ مؤثر</span>{' '}
            {new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 2 }).format(feePct)}٪
          </span>
        </div>

        <div className={s.cell} data-tone="violet">
          <div className={s.cellHead}>
            <span className={s.cellIcon} data-tone="violet" aria-hidden>
              <Coins size={13} strokeWidth={1.75} />
            </span>
            <span className={s.cellLabel}>میانگین هر معامله</span>
          </div>
          <div className={s.cellValue}>
            <span className={s.cellNumber} data-tone="violet">
              {fmtCompact(avgDeal)}
            </span>
            <span className={s.cellUnit}>{primaryCurrency}</span>
          </div>
          <span className={s.cellMeta}>میانه ۳۰ روز</span>
        </div>

        <div className={s.cell} data-tone="muted">
          <div className={s.cellHead}>
            <span className={s.cellIcon} data-tone="muted" aria-hidden>
              <Users size={13} strokeWidth={1.75} />
            </span>
            <span className={s.cellLabel}>مشتریان فعال</span>
          </div>
          <div className={s.cellValue}>
            <span className={s.cellNumber}>
              {new Intl.NumberFormat('fa-IR').format(report.topCustomers.length)}
            </span>
            <span className={s.cellUnit}>نفر</span>
          </div>
          <span className={s.cellMeta}>۵ نفر برتر</span>
        </div>
      </section>

      {/* ── 2. Currency Constellation (signature) ─────────────────── */}
      <CurrencyConstellation
        pnlByCurrency={report.pnlByCurrency}
        totalDeals={report.totalDeals}
      />

      {/* ── 3. Daily Volume Strip ─────────────────────────────────── */}
      {dailyBuckets.length > 0 && (
        <DailyVolumeStrip buckets={dailyBuckets} currency={primaryCurrency} />
      )}

      {/* ── 4. Two-column: TopCustomers + PnLByCurrency ──────────── */}
      <div className={s.twoCol}>
        <TopCustomersRail customers={report.topCustomers} />
        <PnLByCurrency rows={report.pnlByCurrency} />
      </div>

      {/* ── 5. Toolbar + Transactions ─────────────────────────────── */}
      <section className={s.txSection} aria-label="جدول تراکنش‌ها">
        <header className={s.txHead}>
          <div className={s.txHeadLeft}>
            <span className={s.eyebrow}>
              <Receipt size={11} strokeWidth={1.75} aria-hidden />
              گزارش تفصیلی
            </span>
            <h2 className={s.txTitle}>تراکنش‌های صرافی</h2>
          </div>
          <div className={s.txHeadActions}>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={exporting}
              aria-label="خروجی CSV"
            >
              <FileSpreadsheet size={13} aria-hidden />
              {exporting ? 'در حال ساخت...' : 'خروجی CSV'}
            </Button>
          </div>
        </header>

        <FilterBar />

        <TransactionsTable rows={txRows} total={txTotal} />

        {/* summary footer */}
        <footer className={s.txFooter}>
          <span className={s.txFooterItem}>
            نمایش <strong>{new Intl.NumberFormat('fa-IR').format(txRows.length)}</strong>{' '}
            از <strong>{new Intl.NumberFormat('fa-IR').format(txTotal)}</strong> رکورد
          </span>
          <span className={s.txFooterItem}>
            <em className={s.txFooterCurrency}>IRR</em> واحد کارمزد
          </span>
        </footer>
      </section>
    </div>
  );
}
