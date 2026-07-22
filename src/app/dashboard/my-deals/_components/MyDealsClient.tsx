'use client';

/**
 * MyDealsClient — 2026 Deal Intelligence Dashboard
 *
 * Redesign: از لیست ساده → Deal Intelligence Dashboard
 * - KPI strip (total / pending / completed / volume)
 * - Sortable/filterable deal list با detail sheet
 * - Timeline view برای هر معامله
 * - Status visualization با SVG progress arc
 * - همه ۵ حالت: loading / empty / error / success / disabled
 */

import { type DealRow, getMyDeals } from '@/actions/currency-deals';
import { EmptyState } from '@/components/Dashboard/primitives/EmptyState';
import { PageHeader } from '@/components/Dashboard/primitives/PageHeader';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  AlertCircle,
  ArrowLeftRight,
  CheckCircle2,
  Clock,
  PackageSearch,
  TrendingUp,
  Wallet,
  XCircle,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import s from './MyDealsClient.module.css';

// ─── Types & Constants ────────────────────────────────────────────────────────

const STATUS_META: Record<string, { label: string; icon: React.ComponentType<{ size?: number; className?: string }>; color: string; cssKey: string }> = {
  PENDING:    { label: 'در انتظار',    icon: Clock,         color: 'var(--nova-amber)',   cssKey: 'pending'    },
  CONFIRMED:  { label: 'تأیید شده',   icon: CheckCircle2,  color: 'var(--nova-cyan)',    cssKey: 'confirmed'  },
  PROCESSING: { label: 'در حال انجام', icon: ArrowLeftRight, color: 'var(--at-info)',      cssKey: 'processing' },
  COMPLETED:  { label: 'تکمیل شده',   icon: CheckCircle2,  color: 'var(--nova-emerald)', cssKey: 'completed'  },
  CANCELLED:  { label: 'لغو شده',     icon: XCircle,       color: 'var(--nova-rose)',    cssKey: 'cancelled'  },
  DISPUTED:   { label: 'مورد اعتراض', icon: AlertCircle,   color: 'var(--nova-amber)',   cssKey: 'disputed'   },
  REFUNDED:   { label: 'بازگشت وجه',  icon: CheckCircle2,  color: 'var(--nova-emerald)', cssKey: 'refunded'   },
};

const CHANNEL_FA: Record<string, string> = {
  ONLINE: 'آنلاین',
  INPERSON: 'حضوری',
  PHONE: 'تلفنی',
};

const STATUS_FILTERS = ['ALL', 'PENDING', 'COMPLETED', 'CANCELLED'] as const;
type StatusFilter = typeof STATUS_FILTERS[number];

const PAGE_LIMIT = 12;

// ─── Formatters ──────────────────────────────────────────────────────────────

function fmtAmount(amount: string, currency: string): string {
  const n = Number(amount);
  if (Number.isNaN(n)) return `${amount} ${currency}`;
  return `${new Intl.NumberFormat('fa-IR').format(n)} ${currency}`;
}

function fmtDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('fa-IR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ─── KPI Arc SVG ─────────────────────────────────────────────────────────────
// Kinetic arc نشان‌دهنده درصد تکمیل معاملات
function CompletionArc({ pct }: { pct: number }) {
  const R = 20;
  const C = 2 * Math.PI * R;
  const dash = (pct / 100) * C;
  return (
    <svg className={s.arcSvg} viewBox="0 0 48 48" aria-hidden fill="none">
      <circle cx="24" cy="24" r={R} strokeWidth="3.5" className={s.arcTrack} />
      <circle
        cx="24" cy="24" r={R}
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${C - dash}`}
        strokeDashoffset={C * 0.25}
        className={s.arcFill}
        style={{ '--arc-pct': `${pct}` } as React.CSSProperties}
      />
      <text x="24" y="28" textAnchor="middle" className={s.arcText}>{Math.round(pct)}</text>
    </svg>
  );
}

// ─── Deal Detail Sheet ────────────────────────────────────────────────────────
function DealDetailSheet({ deal, onClose }: { deal: DealRow; onClose: () => void }) {
  const meta = STATUS_META[deal.status] ?? STATUS_META.PENDING;
  const Icon = meta.icon;

  const TIMELINE = [
    { status: 'PENDING',    label: 'ثبت درخواست' },
    { status: 'CONFIRMED',  label: 'تأیید صرافی' },
    { status: 'PROCESSING', label: 'در حال پردازش' },
    { status: 'COMPLETED',  label: 'تکمیل' },
  ];

  const ORDER = ['PENDING', 'CONFIRMED', 'PROCESSING', 'COMPLETED', 'CANCELLED'];
  const currentIdx = ORDER.indexOf(deal.status);

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent dir="rtl" side="left" className={s.detailSheet}>
        <SheetHeader className={s.detailHead}>
          <div className={s.detailStatusIcon} data-status={meta.cssKey} aria-hidden>
            <Icon size={20} />
          </div>
          <div>
            <SheetTitle className={s.detailTitle}>جزئیات معامله</SheetTitle>
            <p className={s.detailTracking} dir="ltr">{deal.trackingCode}</p>
          </div>
        </SheetHeader>

        <div className={s.detailBody}>
          {/* Amount visual */}
          <div className={s.detailAmountCard}>
            <div className={s.detailAmountFrom}>{fmtAmount(deal.fromAmount, deal.fromCurrency)}</div>
            <div className={s.detailAmountArrow} aria-hidden>
              <ArrowLeftRight size={18} />
            </div>
            <div className={s.detailAmountTo}>{fmtAmount(deal.toAmount, deal.toCurrency)}</div>
          </div>

          {/* Status timeline */}
          {deal.status !== 'CANCELLED' && deal.status !== 'DISPUTED' && (
            <div className={s.timeline} role="list" aria-label="مراحل معامله">
              {TIMELINE.map((step, i) => {
                const stepIdx = ORDER.indexOf(step.status);
                const isDone = stepIdx <= currentIdx;
                const isActive = stepIdx === currentIdx;
                return (
                  <div key={step.status} role="listitem" className={`${s.timelineStep} ${isDone ? s.timelineStepDone : ''} ${isActive ? s.timelineStepActive : ''}`}>
                    <div className={s.timelineDot} aria-hidden>
                      {isDone && !isActive && <CheckCircle2 size={11} />}
                      {isActive && <div className={s.timelinePulse} aria-hidden />}
                    </div>
                    {i < TIMELINE.length - 1 && (
                      <div className={`${s.timelineBar} ${isDone && !isActive ? s.timelineBarDone : ''}`} aria-hidden />
                    )}
                    <span className={s.timelineLabel}>{step.label}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Meta grid */}
          <dl className={s.metaGrid}>
            {[
              { term: 'صرافی', def: deal.exchangeName ?? '—' },
              { term: 'شهر', def: deal.exchangeCity ?? '—' },
              { term: 'کانال', def: CHANNEL_FA[deal.channel] ?? deal.channel },
              { term: 'وضعیت', def: meta.label },
              { term: 'تاریخ ثبت', def: fmtDate(deal.createdAt) },
              { term: 'آخرین بروزرسانی', def: fmtDate(deal.updatedAt) },
            ].map(({ term, def }) => (
              <div key={term} className={s.metaItem}>
                <dt className={s.metaTerm}>{term}</dt>
                <dd className={s.metaDef}>{def}</dd>
              </div>
            ))}
          </dl>

          {/* Note if exists */}
          {deal.note && (
            <div className={s.noteBox}>
              <p className={s.noteLabel}>یادداشت صرافی</p>
              <p className={s.noteText}>{deal.note}</p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function MyDealsClient() {
  const [deals, setDeals] = useState<DealRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [detailDeal, setDetailDeal] = useState<DealRow | null>(null);
  const pageRef = useRef(page);
  pageRef.current = page;

  const fetchDeals = useCallback(async (p: number) => {
    setLoading(true);
    setError(null);
    const result = await getMyDeals({ page: p, limit: PAGE_LIMIT });
    if (result.success && result.data) {
      setDeals(result.data.deals);
      setTotalPages(result.data.pagination.totalPages);
      setTotal(result.data.pagination.total);
    } else {
      setError(!result.success && result.error?.message ? result.error.message : 'خطایی رخ داد.');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchDeals(page);
  }, [fetchDeals, page]);

  // ── KPI calculations ──────────────────────────────────────────────────────
  const kpi = useMemo(() => {
    const pending   = deals.filter(d => d.status === 'PENDING').length;
    const completed = deals.filter(d => d.status === 'COMPLETED').length;
    const cancelled = deals.filter(d => d.status === 'CANCELLED').length;
    const completionPct = deals.length > 0 ? (completed / deals.length) * 100 : 0;
    return { pending, completed, cancelled, completionPct };
  }, [deals]);

  // ── Client-side status filter ──────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (statusFilter === 'ALL') return deals;
    return deals.filter(d => d.status === statusFilter);
  }, [deals, statusFilter]);

  return (
    <div className={s.page} dir="rtl">
      <PageHeader
        breadcrumb={[{ label: 'داشبورد', href: '/dashboard' }, { label: 'معاملات ارزی من' }]}
        eyebrow="پورتفولیو"
        title="معاملات ارزی من"
        description={
          loading ? 'در حال بارگذاری…'
          : total > 0 ? `${new Intl.NumberFormat('fa-IR').format(total)} معامله ثبت‌شده`
          : 'تاریخچه معاملات ارزی شما با صرافی‌های پلتفرم'
        }
        actions={
          <a href="/money-transfer" className={s.newBtn}>
            <ArrowLeftRight size={14} aria-hidden />
            معامله جدید
          </a>
        }
      />

      {/* ── KPI strip ── */}
      {!loading && deals.length > 0 && (
        <div className={s.kpiStrip} role="status" aria-label="خلاصه معاملات">
          <div className={s.kpiCard}>
            <div className={s.kpiIconWrap} data-color="brand" aria-hidden>
              <Wallet size={16} />
            </div>
            <div className={s.kpiBody}>
              <span className={s.kpiVal}>{new Intl.NumberFormat('fa-IR').format(total)}</span>
              <span className={s.kpiLabel}>کل معاملات</span>
            </div>
          </div>

          <div className={s.kpiCard}>
            <div className={s.kpiIconWrap} data-color="amber" aria-hidden>
              <Clock size={16} />
            </div>
            <div className={s.kpiBody}>
              <span className={s.kpiVal}>{new Intl.NumberFormat('fa-IR').format(kpi.pending)}</span>
              <span className={s.kpiLabel}>در انتظار</span>
            </div>
          </div>

          <div className={s.kpiCard}>
            <div className={s.kpiIconWrap} data-color="emerald" aria-hidden>
              <CheckCircle2 size={16} />
            </div>
            <div className={s.kpiBody}>
              <span className={s.kpiVal}>{new Intl.NumberFormat('fa-IR').format(kpi.completed)}</span>
              <span className={s.kpiLabel}>تکمیل شده</span>
            </div>
          </div>

          <div className={s.kpiCard}>
            <div className={s.kpiIconWrap} data-color="violet" aria-hidden>
              <TrendingUp size={16} />
            </div>
            <div className={s.kpiBody}>
              <div className={s.kpiArcWrap}>
                <CompletionArc pct={kpi.completionPct} />
              </div>
              <span className={s.kpiLabel}>نرخ تکمیل</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Filter tabs ── */}
      {!loading && deals.length > 0 && (
        <nav className={s.filterNav} role="tablist" aria-label="فیلتر وضعیت">
          {STATUS_FILTERS.map(f => {
            const count = f === 'ALL' ? deals.length : deals.filter(d => d.status === f).length;
            return (
              <button
                key={f}
                type="button"
                role="tab"
                aria-selected={statusFilter === f}
                className={`${s.filterBtn} ${statusFilter === f ? s.filterBtnActive : ''}`}
                onClick={() => setStatusFilter(f)}
              >
                {f === 'ALL' ? 'همه' : STATUS_META[f]?.label ?? f}
                {count > 0 && (
                  <span className={s.filterCount}>{new Intl.NumberFormat('fa-IR').format(count)}</span>
                )}
              </button>
            );
          })}
        </nav>
      )}

      {/* ── Loading skeleton ── */}
      {loading && (
        <ul className={s.list} aria-busy="true" aria-label="در حال بارگذاری">
          {Array.from({ length: 4 }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton
            <li key={i} className={s.skeleton} aria-hidden />
          ))}
        </ul>
      )}

      {/* ── Error ── */}
      {!loading && error && (
        <div className={s.errorBox} role="alert">
          <AlertCircle size={16} />
          <span>{error}</span>
          <button type="button" className={s.retryBtn} onClick={() => fetchDeals(page)} aria-label="تلاش مجدد">
            تلاش مجدد
          </button>
        </div>
      )}

      {/* ── Empty ── */}
      {!loading && !error && deals.length === 0 && (
        <EmptyState
          icon={PackageSearch}
          title="هنوز معامله‌ای ثبت نشده"
          description="با مراجعه به صفحه نرخ‌ها، اولین معامله ارزی خود را ثبت کنید."
          action={
            <a href="/money-transfer" className={s.emptyBtn}>
              مشاهده نرخ‌ها و صرافی‌ها
            </a>
          }
        />
      )}

      {/* ── Deal list ── */}
      {!loading && !error && filtered.length > 0 && (
        <ul className={s.list} aria-label="لیست معاملات">
          {filtered.map((deal) => {
            const meta = STATUS_META[deal.status] ?? STATUS_META.PENDING;
            const Icon = meta.icon;
            return (
              <li key={deal.id}>
                <button
                  type="button"
                  className={s.card}
                  onClick={() => setDetailDeal(deal)}
                  aria-label={`معامله ${deal.trackingCode} — ${meta.label}`}
                >
                  {/* Status accent line */}
                  <div className={s.cardAccent} data-status={meta.cssKey} aria-hidden />

                  <div className={s.cardInner}>
                    {/* Head row */}
                    <div className={s.cardHead}>
                      <code className={s.trackingCode}>{deal.trackingCode}</code>
                      <span className={s.statusBadge} data-status={meta.cssKey}>
                        <Icon size={11} aria-hidden />
                        {meta.label}
                      </span>
                    </div>

                    {/* Amount row — the focal element */}
                    <div className={s.amounts}>
                      <span className={s.fromAmount}>{fmtAmount(deal.fromAmount, deal.fromCurrency)}</span>
                      <span className={s.amountArrow} aria-hidden>
                        <ArrowLeftRight size={14} />
                      </span>
                      <span className={s.toAmount}>{fmtAmount(deal.toAmount, deal.toCurrency)}</span>
                    </div>

                    {/* Meta chips */}
                    <div className={s.chips}>
                      {deal.exchangeName && (
                        <span className={s.chip}>{deal.exchangeName}</span>
                      )}
                      <span className={s.chip}>{CHANNEL_FA[deal.channel] ?? deal.channel}</span>
                      <span className={s.chip}>{fmtDate(deal.createdAt)}</span>
                    </div>
                  </div>

                  <div className={s.cardChevron} aria-hidden>›</div>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/* ── Filtered empty ── */}
      {!loading && !error && deals.length > 0 && filtered.length === 0 && (
        <div className={s.filteredEmpty}>
          <span>هیچ معامله‌ای با این وضعیت یافت نشد</span>
          <button type="button" className={s.clearFilter} onClick={() => setStatusFilter('ALL')}>
            نمایش همه
          </button>
        </div>
      )}

      {/* ── Pagination ── */}
      {!loading && totalPages > 1 && (
        <nav className={s.pagination} aria-label="صفحه‌بندی">
          <button
            type="button"
            className={s.pageBtn}
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            aria-label="صفحه قبل"
          >
            ›
          </button>
          <span className={s.pageInfo}>
            {new Intl.NumberFormat('fa-IR').format(page)} از {new Intl.NumberFormat('fa-IR').format(totalPages)}
          </span>
          <button
            type="button"
            className={s.pageBtn}
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            aria-label="صفحه بعد"
          >
            ‹
          </button>
        </nav>
      )}

      {/* ── Detail Sheet ── */}
      {detailDeal && <DealDetailSheet deal={detailDeal} onClose={() => setDetailDeal(null)} />}
    </div>
  );
}
