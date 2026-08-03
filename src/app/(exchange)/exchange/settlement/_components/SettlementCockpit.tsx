'use client';

/**
 * SettlementCockpit — ارکستریتور settlement page (P2026 redesign).
 *
 * ساختار:
 *   1. Cockpit header (KPI ribbon + filters)
 *   2. SettlementWaterfall (signature: gross → fee → net flow)
 *   3. SettlementLedger (signature: timeline با milestone ها)
 *   4. Filter + period grid (SettlementPeriodCard × N)
 *   5. Detail rail برای settlement انتخاب‌شده
 *
 * Client Component — برای filter و selection state.
 */

import { generateSettlementCsv } from '@/actions/settlement';
import { EmptyState } from '@/components/Dashboard/primitives';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Download, Filter, Receipt, Wallet } from 'lucide-react';
import { useMemo, useState, useTransition } from 'react';
import s from './SettlementCockpit.module.css';
import SettlementLedger from './SettlementLedger';
import SettlementPeriodCard from './SettlementPeriodCard';
import SettlementWaterfall from './SettlementWaterfall';
import { STATUS_META, type SettlementRow, type SettlementStatus } from './settlement-state';

const STATUS_FILTERS: Array<{ key: 'all' | SettlementStatus; label: string }> = [
  { key: 'all', label: 'همه' },
  { key: 'PENDING', label: 'در انتظار' },
  { key: 'APPROVED', label: 'تأیید شده' },
  { key: 'PAID', label: 'پرداخت شده' },
];

const fmtNum = (v: number): string =>
  new Intl.NumberFormat('fa-IR', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(v / 100);

const fmtExact = (v: number): string => new Intl.NumberFormat('fa-IR').format(v / 100);

interface Props {
  initialRows: SettlementRow[];
}

export default function SettlementCockpit({ initialRows }: Props) {
  const { toast } = useToast();
  const [csvPending, startCsv] = useTransition();
  const [filter, setFilter] = useState<'all' | SettlementStatus>('all');
  const [selectedId, setSelectedId] = useState<string | null>(initialRows[0]?.id ?? null);

  // Dead-button fix: «خروجی CSV» قبلاً بدون onClick بود. حالا generateSettlementCsv
  // (server action واقعی) را صدا می‌زند و فایل دانلود می‌شود.
  const exchangeId = initialRows[0]?.exchangeId ?? '';
  const handleExportCsv = () => {
    if (!exchangeId) return;
    startCsv(async () => {
      const res = await generateSettlementCsv(exchangeId, {
        status: filter === 'all' ? undefined : filter,
        limit: 500,
      });
      if (!res.success) {
        toast({ title: 'خطا', description: res.error.message, variant: 'destructive' });
        return;
      }
      const blob = new Blob([res.data.csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = res.data.filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    });
  };

  // filtered rows (client-side)
  const rows = useMemo(
    () => (filter === 'all' ? initialRows : initialRows.filter((r) => r.status === filter)),
    [initialRows, filter],
  );

  // totals over all rows (full set — waterfall یک عدد کل می‌خواهد)
  const totals = useMemo(() => {
    let totalVolume = 0;
    let platformFee = 0;
    let exchangeNet = 0;
    let pending = 0;
    let approved = 0;
    let paid = 0;
    for (const r of initialRows) {
      totalVolume += Number(r.totalVolume);
      platformFee += Number(r.platformFee);
      exchangeNet += Number(r.exchangeNet);
      if (r.status === 'PENDING') pending += 1;
      if (r.status === 'APPROVED') approved += 1;
      if (r.status === 'PAID') paid += 1;
    }
    return { totalVolume, platformFee, exchangeNet, pending, approved, paid };
  }, [initialRows]);

  // ledger entries (last 8 periods)
  const ledgerEntries = useMemo(
    () =>
      initialRows.slice(0, 8).map((r) => ({
        id: r.id,
        periodStart: r.periodStart,
        periodEnd: r.periodEnd,
        status: r.status as SettlementStatus,
        net: Number(r.exchangeNet),
        currency: r.currency,
      })),
    [initialRows],
  );

  const selectedRow = useMemo(
    () => initialRows.find((r) => r.id === selectedId) ?? null,
    [initialRows, selectedId],
  );

  const primaryCurrency = initialRows[0]?.currency ?? 'AFN';

  return (
    <div className={s.root}>
      {/* ── 1. KPI Ribbon ──────────────────────────────────────────────── */}
      <section className={s.ribbon} aria-label="خلاصهٔ کلی">
        <div className={s.ribbonCell} data-tone="emerald">
          <div className={s.cellHead}>
            <span className={s.cellIcon} data-tone="emerald" aria-hidden>
              <Wallet size={13} strokeWidth={1.75} />
            </span>
            <span className={s.cellLabel}>حجم کل معاملات</span>
          </div>
          <div className={s.cellValue}>
            <span className={s.cellNumber}>{fmtNum(totals.totalVolume)}</span>
            <span className={s.cellUnit}>{primaryCurrency}</span>
          </div>
          <span className={s.cellMeta}>
            {new Intl.NumberFormat('fa-IR').format(initialRows.length)} دوره
          </span>
        </div>

        <div className={s.ribbonCell} data-tone="amber">
          <div className={s.cellHead}>
            <span className={s.cellIcon} data-tone="amber" aria-hidden>
              <Filter size={13} strokeWidth={1.75} />
            </span>
            <span className={s.cellLabel}>کارمزد پلتفرم</span>
          </div>
          <div className={s.cellValue}>
            <span className={s.cellNumber} data-tone="amber">
              {fmtNum(totals.platformFee)}
            </span>
            <span className={s.cellUnit}>{primaryCurrency}</span>
          </div>
          <span className={s.cellMeta}>
            از{' '}
            {totals.totalVolume > 0
              ? new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 1 }).format(
                  (totals.platformFee / totals.totalVolume) * 100,
                )
              : '۰'}
            ٪ کل
          </span>
        </div>

        <div className={s.ribbonCell} data-tone="violet">
          <div className={s.cellHead}>
            <span className={s.cellIcon} data-tone="violet" aria-hidden>
              <Receipt size={13} strokeWidth={1.75} />
            </span>
            <span className={s.cellLabel}>درآمد خالص</span>
          </div>
          <div className={s.cellValue}>
            <span className={s.cellNumber} data-tone="violet">
              {fmtNum(totals.exchangeNet)}
            </span>
            <span className={s.cellUnit}>{primaryCurrency}</span>
          </div>
          <span className={s.cellMeta}>پس از کسر کارمزد</span>
        </div>

        <div className={s.ribbonCell} data-tone="muted">
          <div className={s.cellHead}>
            <span className={s.cellLabel}>توزیع وضعیت</span>
          </div>
          <div className={s.distribution}>
            {[
              { key: 'PAID', count: totals.paid, tone: 'emerald' as const },
              { key: 'APPROVED', count: totals.approved, tone: 'violet' as const },
              { key: 'PENDING', count: totals.pending, tone: 'amber' as const },
            ].map((d) => {
              const total = totals.paid + totals.approved + totals.pending;
              const pct = total > 0 ? (d.count / total) * 100 : 0;
              const meta = STATUS_META[d.key];
              return (
                <div key={d.key} className={s.distRow} data-tone={d.tone}>
                  <span className={s.distLabel}>{meta?.label ?? d.key}</span>
                  <span className={s.distBar} aria-hidden>
                    <span
                      className={s.distBarFill}
                      data-tone={d.tone}
                      style={{ width: `${Math.max(2, pct)}%` }}
                    />
                  </span>
                  <span className={s.distCount}>
                    {new Intl.NumberFormat('fa-IR').format(d.count)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 2. Waterfall (signature) ────────────────────────────────────── */}
      <SettlementWaterfall
        totalVolume={totals.totalVolume}
        platformFee={totals.platformFee}
        exchangeNet={totals.exchangeNet}
        currency={primaryCurrency}
      />

      {/* ── 3. Ledger (signature) ──────────────────────────────────────── */}
      <SettlementLedger entries={ledgerEntries} currency={primaryCurrency} />

      {/* ── 4. Filter + Period grid ────────────────────────────────────── */}
      <section className={s.gridSection} aria-label="دوره‌های تسویه">
        <header className={s.gridHead}>
          <div className={s.gridHeadLeft}>
            <h2 className={s.gridTitle}>همهٔ دوره‌ها</h2>
            <p className={s.gridSub}>
              روی هر دوره کلیک کنید تا جزئیات کامل آن در پایین نمایش داده شود.
            </p>
          </div>
          <div className={s.gridFilters} role="tablist" aria-label="فیلتر وضعیت">
            {STATUS_FILTERS.map((f) => {
              const isActive = filter === f.key;
              const count =
                f.key === 'all'
                  ? initialRows.length
                  : initialRows.filter((r) => r.status === f.key).length;
              return (
                <button
                  key={f.key}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  className={s.filterPill}
                  data-active={isActive || undefined}
                  onClick={() => setFilter(f.key)}
                >
                  <span>{f.label}</span>
                  <span className={s.filterCount}>
                    {new Intl.NumberFormat('fa-IR').format(count)}
                  </span>
                </button>
              );
            })}
          </div>
        </header>

        {rows.length === 0 ? (
          <div className={s.emptyWrap}>
            <EmptyState
              title="دوره‌ای با این فیلتر یافت نشد"
              description="فیلتر دیگری انتخاب کنید تا همهٔ دوره‌ها نمایش داده شوند."
            />
          </div>
        ) : (
          <div className={s.cardGrid}>
            {rows.map((row, i) => (
              <SettlementPeriodCard
                key={row.id}
                row={row}
                selected={selectedId === row.id}
                onSelect={() => setSelectedId(row.id)}
                index={i}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── 5. Detail rail (selected period) ──────────────────────────── */}
      {selectedRow && (
        <section className={s.detail} aria-label="جزئیات دورهٔ انتخاب‌شده">
          <header className={s.detailHead}>
            <span className={s.eyebrow}>
              <span className={s.eyebrowDot} aria-hidden />
              جزئیات دوره
            </span>
            <h3 className={s.detailTitle}>
              {new Intl.DateTimeFormat('fa-IR', { month: 'long', day: 'numeric' }).format(
                new Date(selectedRow.periodStart),
              )}
              {' — '}
              {new Intl.DateTimeFormat('fa-IR', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              }).format(new Date(selectedRow.periodEnd))}
            </h3>
            <span className={s.detailId}>
              شناسه: <span className={s.detailIdVal}>{selectedRow.id.slice(-12)}</span>
            </span>
          </header>

          <div className={s.detailGrid}>
            <div className={s.detailStat}>
              <span className={s.detailStatLabel}>حجم کل</span>
              <span className={s.detailStatValue} data-tone="emerald">
                {fmtExact(Number(selectedRow.totalVolume))}{' '}
                <em className={s.detailStatCurrency}>{selectedRow.currency}</em>
              </span>
            </div>
            <div className={s.detailStat}>
              <span className={s.detailStatLabel}>تعداد معاملات</span>
              <span className={s.detailStatValue}>
                {new Intl.NumberFormat('fa-IR').format(selectedRow.dealCount)}
              </span>
            </div>
            <div className={s.detailStat}>
              <span className={s.detailStatLabel}>کارمزد پلتفرم</span>
              <span className={s.detailStatValue} data-tone="amber">
                {fmtExact(Number(selectedRow.platformFee))}{' '}
                <em className={s.detailStatCurrency}>{selectedRow.currency}</em>
              </span>
            </div>
            <div className={s.detailStat} data-focal>
              <span className={s.detailStatLabel}>خالص دریافتی</span>
              <span className={s.detailStatValue} data-tone="violet" data-focal>
                {fmtExact(Number(selectedRow.exchangeNet))}{' '}
                <em className={s.detailStatCurrency}>{selectedRow.currency}</em>
              </span>
            </div>
          </div>

          <footer className={s.detailFooter}>
            <span className={s.detailNote}>
              {selectedRow.note || 'یادداشتی برای این دوره ثبت نشده.'}
            </span>
            <div className={s.detailActions}>
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={handleExportCsv}
                disabled={csvPending || !exchangeId}
                aria-busy={csvPending || undefined}
              >
                <Download size={13} aria-hidden />
                {csvPending ? 'در حال ساخت…' : 'خروجی CSV'}
              </Button>
            </div>
          </footer>
        </section>
      )}
    </div>
  );
}
