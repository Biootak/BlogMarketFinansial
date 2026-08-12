'use client';

/**
 * RequestsWorkspace — کارتابل درخواست‌های مشتری صرافی (premium glass).
 *
 * - KPI: در انتظار / در حال بررسی / تأییدشده این هفته / میانگین زمان
 * - فیلتر وضعیت + نوع با شمارنده، جستجو
 * - ردیف‌های درخواست: آیکون نوع، کد پیگیری، مشتری، وضعیت
 * - جزئیات در PanelDrawer + اقدام تأیید/رد با پیام (reviewExchangeRequest)
 */

import {
  type ExchangeRequestRow,
  type ExchangeRequestStats,
  getExchangeRequestStats,
  getExchangeRequests,
  reviewExchangeRequest,
} from '@/actions/exchange-ops';
import { KpiCard } from '@/components/Dashboard/primitives/KpiCard';
import { PanelDrawer } from '@/components/Dashboard/primitives/PanelDrawer';
import { StatGrid } from '@/components/Dashboard/primitives/StatGrid';
import {
  Building2,
  CheckCircle2,
  Clock,
  Inbox,
  Loader2,
  LockOpen,
  Search,
  ShieldCheck,
  TrendingUp,
  XCircle,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import s from './RequestsWorkspace.module.css';

const TYPE_FA: Record<string, string> = {
  ACCOUNT_NEW: 'باز کردن حساب جدید',
  ACCOUNT_UNFREEZE: 'رفع مسدودی حساب',
  TRANSFER_INITIATE: 'شروع انتقال',
  LIMIT_INCREASE: 'افزایش سقف تراکنش',
  OTHER: 'سایر',
};

const STATUS_FA: Record<string, string> = {
  PENDING: 'در انتظار بررسی',
  IN_REVIEW: 'در حال بررسی',
  APPROVED: 'تأییدشده',
  REJECTED: 'ردشده',
  CANCELLED: 'لغوشده',
};

const TYPE_ICON: Record<string, typeof Building2> = {
  ACCOUNT_NEW: Building2,
  ACCOUNT_UNFREEZE: LockOpen,
  TRANSFER_INITIATE: TrendingUp,
  LIMIT_INCREASE: TrendingUp,
  OTHER: Inbox,
};

function fmtDate(d: Date | null | undefined): string {
  if (!d) return '—';
  return new Intl.DateTimeFormat('fa-IR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(d));
}

interface Props {
  exchangeId: string;
  initial: ExchangeRequestRow[];
  stats: ExchangeRequestStats;
  staffRole: string;
}

type StatusFilter = 'all' | ExchangeRequestRow['status'];
type TypeFilter = 'all' | ExchangeRequestRow['type'];

export default function RequestsWorkspace({ exchangeId, initial, stats, staffRole }: Props) {
  const [rows, setRows] = useState<ExchangeRequestRow[]>(initial);
  const [kpi, setKpi] = useState(stats);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<ExchangeRequestRow | null>(null);
  const [resolution, setResolution] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canReview = ['OWNER', 'MANAGER', 'STAFF'].includes(staffRole);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (typeFilter !== 'all' && r.type !== typeFilter) return false;
      if (!q) return true;
      return (
        r.trackingCode.toLowerCase().includes(q) ||
        r.customerName.toLowerCase().includes(q) ||
        r.customerPhone.includes(q) ||
        TYPE_FA[r.type].includes(q)
      );
    });
  }, [rows, statusFilter, typeFilter, query]);

  const statusCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of rows) map.set(r.status, (map.get(r.status) ?? 0) + 1);
    return map;
  }, [rows]);

  const typeCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of rows) map.set(r.type, (map.get(r.type) ?? 0) + 1);
    return map;
  }, [rows]);

  async function refresh() {
    const [next, nextStats] = await Promise.all([
      getExchangeRequests(exchangeId, { limit: 60 }),
      getExchangeRequestStats(exchangeId),
    ]);
    setRows(next);
    setKpi(nextStats);
  }

  async function review(status: 'APPROVED' | 'REJECTED') {
    if (!selected) return;
    setBusy(status);
    setError(null);
    try {
      const res = await reviewExchangeRequest({
        requestId: selected.id,
        status,
        resolution: resolution.trim() || undefined,
      });
      if (!res.success) setError(res.error?.message ?? 'عملیات ناموفق بود');
      else {
        setSelected(null);
        setResolution('');
        await refresh();
      }
    } catch {
      setError('خطای غیرمنتظره');
    } finally {
      setBusy(null);
    }
  }

  const statusTabs: Array<{ key: StatusFilter; label: string }> = [
    { key: 'all', label: 'همه' },
    { key: 'PENDING', label: 'در انتظار' },
    { key: 'IN_REVIEW', label: 'در حال بررسی' },
    { key: 'APPROVED', label: 'تأییدشده' },
    { key: 'REJECTED', label: 'ردشده' },
  ];

  return (
    <div className={s.root}>
      <StatGrid>
        <KpiCard
          label="در انتظار بررسی"
          value={kpi.pending}
          icon={Clock}
          trend={kpi.pending > 0 ? 'up' : 'neutral'}
          info="اقدام شما لازم است"
        />
        <KpiCard
          label="در حال بررسی"
          value={kpi.inReview}
          icon={ShieldCheck}
          info="به کارکنان واگذار شده"
        />
        <KpiCard
          label="تأییدشده"
          value={kpi.approved}
          icon={CheckCircle2}
          trend={kpi.approved > 0 ? 'up' : 'neutral'}
          info="کل تأییدها"
        />
        <KpiCard
          label="درخواست ۷ روز اخیر"
          value={kpi.last7d}
          icon={TrendingUp}
          info="تعداد ایجادشده در هفتهٔ گذشته"
        />
      </StatGrid>

      <div className={s.toolbar}>
        <div className={s.filters} role="tablist" aria-label="فیلتر وضعیت درخواست">
          {statusTabs.map((t) => (
            <button
              key={t.key}
              className={`${s.pill} ${statusFilter === t.key ? s.pillActive : ''}`}
              onClick={() => setStatusFilter(t.key)}
            >
              {t.label}
              <span className={s.pillCount}>
                {t.key === 'all' ? rows.length : (statusCounts.get(t.key) ?? 0)}
              </span>
            </button>
          ))}
        </div>
        <div className={s.search}>
          <Search size={15} aria-hidden />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="جستجوی کد پیگیری، مشتری…"
            aria-label="جستجوی درخواست"
          />
        </div>
        <div className={s.typeFilters} role="tablist" aria-label="فیلتر نوع درخواست">
          {(['all', 'ACCOUNT_NEW', 'ACCOUNT_UNFREEZE', 'LIMIT_INCREASE'] as const).map((t) => (
            <button
              key={t}
              className={`${s.typePill} ${typeFilter === t ? s.typePillActive : ''}`}
              onClick={() => setTypeFilter(t)}
            >
              {t === 'all' ? 'همهٔ انواع' : TYPE_FA[t]}
              <span className={s.pillCount}>
                {t === 'all' ? rows.length : (typeCounts.get(t) ?? 0)}
              </span>
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className={s.error} role="alert">
          {error}
        </div>
      )}

      <div className={s.panel}>
        {filtered.length === 0 ? (
          <div className={s.empty}>
            <div className={s.emptyIcon}>
              <Inbox size={24} />
            </div>
            <b>درخواستی یافت نشد</b>
            <p>فیلتر یا جستجو را تغییر دهید.</p>
          </div>
        ) : (
          <div className={s.list}>
            {filtered.map((r) => {
              const Icon = TYPE_ICON[r.type] ?? Inbox;
              return (
                <div key={r.id} className={s.reqRow} onClick={() => setSelected(r)}>
                  <div className={s.reqIcon}>
                    <Icon size={18} aria-hidden />
                  </div>
                  <div className={s.grow}>
                    <div className={s.reqTitle}>
                      <b>{TYPE_FA[r.type]}</b>
                      <span className={s.tracking} dir="ltr">
                        {r.trackingCode}
                      </span>
                    </div>
                    <div className={s.reqMeta}>
                      {r.customerName} · <span dir="ltr">{r.customerPhone}</span>
                      {r.payload?.currency ? ` · ${String(r.payload.currency)}` : ''}
                      {r.note ? ` · «${r.note.slice(0, 40)}${r.note.length > 40 ? '…' : ''}»` : ''}
                    </div>
                  </div>
                  <span className={`${s.status} ${s[`status_${r.status}`] ?? ''}`}>
                    {STATUS_FA[r.status]}
                  </span>
                  {(r.status === 'PENDING' || r.status === 'IN_REVIEW') && canReview && (
                    <div className={s.rowActions} onClick={(e) => e.stopPropagation()}>
                      <button
                        className={`${s.miniBtn} ${s.miniApprove}`}
                        disabled={busy !== null}
                        onClick={() => {
                          setSelected(r);
                          setResolution('');
                          void review('APPROVED');
                        }}
                      >
                        تأیید
                      </button>
                      <button
                        className={`${s.miniBtn} ${s.miniReject}`}
                        disabled={busy !== null}
                        onClick={() => {
                          setSelected(r);
                          setResolution('');
                          void review('REJECTED');
                        }}
                      >
                        رد
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Detail drawer ──────────────────────── */}
      <PanelDrawer
        open={selected !== null}
        title={selected ? `${TYPE_FA[selected.type]} — ${selected.trackingCode}` : ''}
        onClose={() => setSelected(null)}
        footer={
          selected &&
          (selected.status === 'PENDING' || selected.status === 'IN_REVIEW') &&
          canReview ? (
            <div className={s.drawerFooter}>
              <button
                className={s.rejectBtn}
                disabled={busy !== null}
                onClick={() => review('REJECTED')}
              >
                {busy === 'REJECTED' ? (
                  <Loader2 size={15} className={s.spin} />
                ) : (
                  <XCircle size={15} />
                )}
                رد با پیام
              </button>
              <button
                className={s.approveBtn}
                disabled={busy !== null}
                onClick={() => review('APPROVED')}
              >
                {busy === 'APPROVED' ? (
                  <Loader2 size={15} className={s.spin} />
                ) : (
                  <CheckCircle2 size={15} />
                )}
                تأیید درخواست
              </button>
            </div>
          ) : undefined
        }
      >
        {selected && (
          <div className={s.detail}>
            <div className={s.detailGrid}>
              <div className={s.dField}>
                <span>وضعیت</span>
                <b>{STATUS_FA[selected.status]}</b>
              </div>
              <div className={s.dField}>
                <span>مشتری</span>
                <b>{selected.customerName}</b>
              </div>
              <div className={s.dField}>
                <span>شماره تماس</span>
                <b dir="ltr">{selected.customerPhone}</b>
              </div>
              <div className={s.dField}>
                <span>ارسال‌شده</span>
                <b>{fmtDate(selected.createdAt)}</b>
              </div>
              {selected.reviewedAt && (
                <div className={s.dField}>
                  <span>بررسی‌شده</span>
                  <b>{fmtDate(selected.reviewedAt)}</b>
                </div>
              )}
            </div>

            {selected.note && (
              <div className={s.note}>
                <span>توضیح مشتری</span>
                <p>{selected.note}</p>
              </div>
            )}
            {selected.resolution && (
              <div className={`${s.note} ${s.noteResolved}`}>
                <span>پاسخ صرافی</span>
                <p>{selected.resolution}</p>
              </div>
            )}

            {(selected.status === 'PENDING' || selected.status === 'IN_REVIEW') && canReview && (
              <label className={s.resolutionField}>
                <span>پیام تأیید / دلیل رد (اختیاری)</span>
                <textarea
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  rows={3}
                  placeholder="مثلاً: حساب دلاری با شمارهٔ … برای شما ایجاد شد"
                />
              </label>
            )}

            <div className={s.timeline}>
              <div className={s.tlItem}>
                <span className={s.tlDot} />
                <div>
                  <b>ثبت درخواست توسط مشتری</b>
                  <p>{fmtDate(selected.createdAt)}</p>
                </div>
              </div>
              {selected.reviewedAt && (
                <div className={s.tlItem}>
                  <span
                    className={`${s.tlDot} ${selected.status === 'REJECTED' ? s.tlDotRose : ''}`}
                  />
                  <div>
                    <b>{STATUS_FA[selected.status]}</b>
                    <p>{fmtDate(selected.reviewedAt)}</p>
                  </div>
                </div>
              )}
              {(selected.status === 'PENDING' || selected.status === 'IN_REVIEW') && (
                <div className={s.tlItem}>
                  <span className={`${s.tlDot} ${s.tlDotAmber}`} />
                  <div>
                    <b>در انتظار تصمیم صرافی</b>
                    <p>اقدام شما لازم است</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </PanelDrawer>
    </div>
  );
}
