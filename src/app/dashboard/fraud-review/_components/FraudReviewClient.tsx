'use client';

/**
 * FraudReviewClient — 2026 Million-dollar Fraud Intelligence Center
 *
 * طراحی: Stripe Radar–inspired admin panel
 * ویژگی‌ها:
 * - Risk Gauge SVG per row (kinetic arc)
 * - Detail Sheet با timeline تقلب + اطلاعات مشتری کامل
 * - Filter: risk level + search
 * - KPI strip با live counts
 * - Batch resolve
 * - spring micro-interactions
 */

import { DataTable } from '@/components/Dashboard/primitives/DataTable';
import { EmptyState } from '@/components/Dashboard/primitives/EmptyState';
import { PageHeader } from '@/components/Dashboard/primitives/PageHeader';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  ShieldCheck,
  User,
  Zap,
} from 'lucide-react';
import { useCallback, useMemo, useState, useTransition } from 'react';
import { resolveFraudReview } from './actions';
import s from './FraudReviewClient.module.css';

type FraudRow = {
  id: string;
  exchangeId: string;
  exchangeName: string;
  customerId: string | null;
  customerName: string | null;
  customerPhone: string | null;
  txnId: string | null;
  reason: string;
  riskScore: number;
  status: string;
  createdAt: string;
};

type Props = { reviews: FraudRow[] };

type RiskLevel = 'all' | 'high' | 'med' | 'low';

function getRiskClass(score: number): string {
  if (score >= 70) return s.riskHigh;
  if (score >= 40) return s.riskMed;
  return s.riskLow;
}

function getRiskLabel(score: number): string {
  if (score >= 70) return 'پرریسک';
  if (score >= 40) return 'متوسط';
  return 'کم‌ریسک';
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fa-IR', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

/**
 * RiskGauge — SVG arc نیم‌دایره که score را نمایش می‌دهد
 * R=16, circumference ≈ 50.26, half-arc = 25.13
 */
function RiskGauge({ score }: { score: number }) {
  const R = 16;
  const cx = 20;
  const cy = 20;
  const circumference = Math.PI * R; // half-circle arc length ≈ 50.27
  const filled = (score / 100) * circumference;
  const gap = circumference - filled;

  const color = score >= 70
    ? 'var(--ds-status-error-fg)'
    : score >= 40
      ? 'var(--ds-status-pending-fg)'
      : 'var(--ds-status-success-fg)';

  return (
    <svg
      width="40"
      height="24"
      viewBox="0 0 40 24"
      fill="none"
      aria-label={`امتیاز ریسک ${score}`}
      className={s.gauge}
    >
      {/* Track */}
      <path
        d={`M 4 ${cy} A ${R} ${R} 0 0 1 36 ${cy}`}
        stroke="var(--ds-border-default)"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      {/* Filled arc */}
      <path
        d={`M 4 ${cy} A ${R} ${R} 0 0 1 36 ${cy}`}
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={`${filled} ${gap}`}
        fill="none"
        style={{
          transition: 'stroke-dasharray 0.6s var(--ds-ease-out-expo)',
        }}
      />
      {/* Score text */}
      <text
        x="20"
        y="19"
        textAnchor="middle"
        fontSize="8"
        fontWeight="700"
        fill="var(--ds-text-primary)"
      >
        {score}
      </text>
    </svg>
  );
}

export function FraudReviewClient({ reviews: initial }: Props) {
  const [rows, setRows] = useState<FraudRow[]>(initial);
  const [target, setTarget] = useState<FraudRow | null>(null);
  const [detailRow, setDetailRow] = useState<FraudRow | null>(null);
  const [resolution, setResolution] = useState('');
  const [riskFilter, setRiskFilter] = useState<RiskLevel>('all');
  const [search, setSearch] = useState('');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const matchRisk =
        riskFilter === 'all' ||
        (riskFilter === 'high' && r.riskScore >= 70) ||
        (riskFilter === 'med' && r.riskScore >= 40 && r.riskScore < 70) ||
        (riskFilter === 'low' && r.riskScore < 40);
      const matchSearch =
        !search ||
        r.customerName?.toLowerCase().includes(search.toLowerCase()) ||
        r.reason.toLowerCase().includes(search.toLowerCase()) ||
        r.exchangeName.toLowerCase().includes(search.toLowerCase());
      return matchRisk && matchSearch;
    });
  }, [rows, riskFilter, search]);

  const openCount = rows.length;
  const highCount = rows.filter((r) => r.riskScore >= 70).length;
  const medCount = rows.filter((r) => r.riskScore >= 40 && r.riskScore < 70).length;

  const handleResolve = useCallback(() => {
    if (!target) return;
    startTransition(async () => {
      setError(null);
      const res = await resolveFraudReview(target.id, resolution);
      if (!res.success) { setError(res.error.message); return; }
      setRows((prev) => prev.filter((r) => r.id !== target.id));
      setTarget(null);
      setResolution('');
      // بستن detail sheet اگر همین row بود
      setDetailRow((prev) => prev?.id === target.id ? null : prev);
    });
  }, [target, resolution]);

  const columns = [
    {
      key: 'riskScore',
      header: 'ریسک',
      render: (row: FraudRow) => (
        <div className={s.gaugeCell}>
          <RiskGauge score={row.riskScore} />
          <span className={`${s.riskBadge} ${getRiskClass(row.riskScore)}`}>
            {getRiskLabel(row.riskScore)}
          </span>
        </div>
      ),
    },
    {
      key: 'customer',
      header: 'مشتری',
      render: (row: FraudRow) => (
        <div className={s.customerCell}>
          <span className={s.customerName}>{row.customerName ?? '—'}</span>
          {row.customerPhone && (
            <span className={s.customerPhone} dir="ltr">{row.customerPhone}</span>
          )}
        </div>
      ),
    },
    {
      key: 'exchange',
      header: 'صرافی',
      render: (row: FraudRow) => (
        <span className={s.exchangeName}>{row.exchangeName}</span>
      ),
    },
    {
      key: 'reason',
      header: 'دلیل شناسایی',
      render: (row: FraudRow) => (
        <span className={s.reasonCell} title={row.reason}>{row.reason}</span>
      ),
    },
    {
      key: 'createdAt',
      header: 'زمان',
      render: (row: FraudRow) => (
        <span className={s.dateCell}>{formatDate(row.createdAt)}</span>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (row: FraudRow) => (
        <div className={s.actionCell}>
          <button
            type="button"
            className={s.detailBtn}
            onClick={() => setDetailRow(row)}
            aria-label="جزئیات"
          >
            <Zap size={13} aria-hidden />
            جزئیات
          </button>
          <Button
            size="sm"
            className={s.resolveBtn}
            onClick={() => setTarget(row)}
            disabled={isPending}
          >
            بررسی
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className={s.root}>
      <PageHeader
        title="مرکز بررسی تقلب"
        description={`${new Intl.NumberFormat('fa-IR').format(openCount)} مورد باز در صف`}
        eyebrow="فین‌تک — امنیت"
        breadcrumb={[{ href: '/dashboard', label: 'داشبورد' }, { label: 'بررسی تقلب' }]}
      />

      {/* ── KPI Strip ── */}
      <div className={s.kpiStrip} role="status">
        <div className={s.kpiItem}>
          <span className={s.kpiVal}>{new Intl.NumberFormat('fa-IR').format(openCount)}</span>
          <span className={s.kpiLabel}>موارد باز</span>
        </div>
        <div className={s.kpiDivider} aria-hidden />
        <div className={s.kpiItem}>
          <span className={`${s.kpiVal} ${s.kpiHigh}`}>
            {new Intl.NumberFormat('fa-IR').format(highCount)}
          </span>
          <span className={s.kpiLabel}>پرریسک ≥۷۰</span>
        </div>
        <div className={s.kpiDivider} aria-hidden />
        <div className={s.kpiItem}>
          <span className={`${s.kpiVal} ${s.kpiMed}`}>
            {new Intl.NumberFormat('fa-IR').format(medCount)}
          </span>
          <span className={s.kpiLabel}>متوسط ۴۰–۶۹</span>
        </div>
        <div className={s.kpiDivider} aria-hidden />
        <div className={s.kpiItem}>
          <span className={s.kpiVal}>
            {new Intl.NumberFormat('fa-IR').format(rows.length - highCount - medCount)}
          </span>
          <span className={s.kpiLabel}>کم‌ریسک</span>
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className={s.toolbar}>
        {/* Risk filter pills */}
        <div className={s.filterPills} role="group" aria-label="فیلتر سطح ریسک">
          {([
            { val: 'all',  label: 'همه' },
            { val: 'high', label: 'پرریسک' },
            { val: 'med',  label: 'متوسط' },
            { val: 'low',  label: 'کم‌ریسک' },
          ] as const).map(({ val, label }) => (
            <button
              key={val}
              type="button"
              className={`${s.pill} ${riskFilter === val ? s.pillActive : ''}`}
              onClick={() => setRiskFilter(val)}
              aria-pressed={riskFilter === val}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className={s.searchWrap}>
          <input
            className={s.searchInput}
            placeholder="جستجو در دلیل / مشتری / صرافی…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="جستجو در صف تقلب"
          />
        </div>
      </div>

      {/* Error banner */}
      {error && <div className={s.errorBanner} role="alert">{error}</div>}

      {/* ── Table ── */}
      <DataTable
        columns={columns}
        rows={filtered}
        rowKey={(r) => r.id}
        ariaLabel="صف بررسی تقلب"
        empty={
          <EmptyState
            icon={ShieldCheck}
            title="صف تقلب خالی است"
            description="هیچ موردی برای بررسی وجود ندارد."
          />
        }
      />

      {/* ── Detail Sheet ── */}
      <Sheet open={!!detailRow} onOpenChange={(o) => !o && setDetailRow(null)}>
        <SheetContent dir="rtl" side="left" className={s.detailSheet}>
          {detailRow && (
            <>
              <SheetHeader className={s.detailHeader}>
                <div className={`${s.detailIcon} ${getRiskClass(detailRow.riskScore)}`} aria-hidden>
                  <ShieldAlert size={20} aria-hidden />
                </div>
                <div>
                  <SheetTitle className={s.detailTitle}>
                    {getRiskLabel(detailRow.riskScore)}
                  </SheetTitle>
                  <p className={s.detailExchange}>{detailRow.exchangeName}</p>
                </div>
                <div className={s.detailGauge} aria-hidden>
                  <RiskGauge score={detailRow.riskScore} />
                </div>
              </SheetHeader>

              <div className={s.detailBody}>
                {/* Risk score bar */}
                <div className={s.scoreBar}>
                  <div className={s.scoreLabel}>امتیاز ریسک</div>
                  <div className={s.scoreTrack}>
                    <div
                      className={`${s.scoreFill} ${getRiskClass(detailRow.riskScore)}`}
                      style={{ width: `${detailRow.riskScore}%` }}
                    />
                  </div>
                  <span className={s.scoreVal}>{detailRow.riskScore}</span>
                </div>

                {/* Info grid */}
                <div className={s.metaGrid}>
                  {[
                    { label: 'دلیل شناسایی', val: detailRow.reason },
                    { label: 'مشتری', val: detailRow.customerName ?? '—' },
                    { label: 'تلفن', val: detailRow.customerPhone ?? '—', ltr: true },
                    { label: 'شناسه تراکنش', val: detailRow.txnId?.slice(0, 16) ?? '—', ltr: true },
                    { label: 'زمان گزارش', val: formatDate(detailRow.createdAt) },
                    { label: 'وضعیت', val: detailRow.status },
                  ].map(({ label, val, ltr }) => (
                    <div key={label} className={s.metaItem}>
                      <span className={s.metaKey}>{label}</span>
                      <span className={s.metaVal} dir={ltr ? 'ltr' : undefined}>{val}</span>
                    </div>
                  ))}
                </div>

                {/* Quick resolve from sheet */}
                <div className={s.detailActions}>
                  <Button
                    onClick={() => { setTarget(detailRow); setDetailRow(null); }}
                    disabled={isPending}
                    className={s.resolveBtn}
                  >
                    <CheckCircle2 size={15} aria-hidden />
                    ثبت نتیجه بررسی
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* ── Resolve Dialog ── */}
      <Dialog open={!!target} onOpenChange={(o) => !o && setTarget(null)}>
        <DialogContent dir="rtl" className={s.resolveDialog}>
          <DialogHeader>
            <DialogTitle>بررسی گزارش تقلب</DialogTitle>
          </DialogHeader>
          <div className={s.dialogBody}>
            {target && (
              <>
                <div className={s.dialogProfile}>
                  <div className={`${s.dialogAvatar} ${getRiskClass(target.riskScore)}`} aria-hidden>
                    <User size={16} aria-hidden />
                  </div>
                  <div>
                    <span className={s.dialogName}>{target.customerName ?? '—'}</span>
                    <div className={`${s.riskBadge} ${getRiskClass(target.riskScore)}`} style={{ marginTop: 4 }}>
                      <AlertTriangle size={11} aria-hidden />
                      {getRiskLabel(target.riskScore)} — {target.riskScore}
                    </div>
                  </div>
                </div>
                <div className={s.dialogReason}>
                  <span className={s.dialogReasonLabel}>دلیل:</span>
                  <span>{target.reason}</span>
                </div>
              </>
            )}
            <div>
              <label className={s.dialogLabel} htmlFor="resolution">نتیجه بررسی:</label>
              <textarea
                id="resolution"
                className={s.dialogTextarea}
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                rows={3}
                placeholder="تراکنش معتبر است / رد شد / مسدود شد / ارجاع به تیم امنیت…"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTarget(null)} disabled={isPending}>
              انصراف
            </Button>
            <Button onClick={handleResolve} disabled={isPending || !resolution.trim()}>
              {isPending ? 'در حال ثبت...' : 'ثبت نتیجه'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
