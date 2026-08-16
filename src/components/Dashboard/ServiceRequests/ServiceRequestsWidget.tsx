'use client';

/**
 * ServiceRequestsWidget — 2026-07-04 redesign
 *
 * Compact summary tile used at the bottom of /dashboard for ADMIN/OWNER.
 * Reuses the `at-srq-widget*` CSS classes that ship with the redesigned
 * service-requests page so the visual language stays hairline-only,
 * emerald-first, no glassmorphism — fully consistent with the rest of
 * the dashboard's Atelier 2026 system.
 *
 * Layout:
 *   ┌────────────────────────────────────────────────────────────┐
 *   │ Header: ico + title + KPI subline    | "مشاهده همه" link   │
 *   ├────────────────────────────────────────────────────────────┤
 *   │ Mini-KPI strip: pending · today · urgent                   │
 *   ├────────────────────────────────────────────────────────────┤
 *   │ List of 5 latest pending requests (avatar · name · meta ·  │
 *   │ amount · status badge)                                     │
 *   ├────────────────────────────────────────────────────────────┤
 *   │ Footer: "مشاهده همه درخواست‌ها"                            │
 *   └────────────────────────────────────────────────────────────┘
 */

import { getServiceRequestStats, getServiceRequests } from '@/actions/serviceRequestActions';
import CountUp from '@/components/Dashboard/primitives/CountUp';
import { motion } from '@/lib/motion-shim';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  HiOutlineArrowLeft,
  HiOutlineBolt,
  HiOutlineCalendarDays,
  HiOutlineClipboardDocumentList,
  HiOutlineClock,
} from 'react-icons/hi2';

interface ServiceRequest {
  id: string;
  trackingCode: string;
  fullName: string;
  serviceType: string;
  amount: string;
  currency: string;
  status: string;
  urgency: string;
  contactMethod: string;
  createdAt: Date;
}

interface Stats {
  total: number;
  pending: number;
  todayCount: number;
  pendingUrgent: number;
}

const serviceTypeLabels: Record<string, string> = {
  INTERNATIONAL_TRANSFER: 'حواله',
  ONLINE_PAYMENT: 'پرداخت آنلاین',
  TUITION_PAYMENT: 'شهریه',
  FREELANCE_INCOME: 'فریلنس',
  SOFTWARE_PURCHASE: 'نرم‌افزار',
  GIFT_CARD: 'گیفت کارت',
  CURRENCY_BUY: 'خرید ارز',
  CURRENCY_SELL: 'فروش ارز',
  CRYPTO_BUY: 'کریپتو خرید',
  CRYPTO_SELL: 'کریپتو فروش',
  PAYPAL_TRANSFER: 'پی‌پال',
  MOBILE_TOPUP: 'شارژ موبایل',
  BILL_PAYMENT: 'قبض',
  OTHER: 'سایر',
};

const statusLabels: Record<string, string> = {
  PENDING: 'در انتظار',
  IN_PROGRESS: 'در حال انجام',
  COMPLETED: 'تکمیل شده',
  CANCELLED: 'لغو شده',
};

const statusClass: Record<string, string> = {
  PENDING: 'is-pending',
  IN_PROGRESS: 'is-progress',
  COMPLETED: 'is-completed',
  CANCELLED: 'is-cancelled',
};

/**
 * Persian-aware initial: pick the first base-letter character from
 * the full name so RTL names like "علی محمدی" render as "ع" not " ".
 */
function getInitial(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '؟';
  // Try to grab the first non-whitespace, non-punctuation code-point
  for (const ch of trimmed) {
    if (/\s/.test(ch)) continue;
    return ch;
  }
  return trimmed[0] ?? '؟';
}

export default function ServiceRequestsWidget() {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      const [requestsResult, statsResult] = await Promise.all([
        getServiceRequests({ limit: 5, status: 'PENDING' }),
        getServiceRequestStats(),
      ]);

      if (cancelled) return;

      if (requestsResult.success && requestsResult.data) {
        // getServiceRequests returns an envelope: { data: { requests: ServiceRequest[], pagination } }
        const envelope = requestsResult.data as unknown as {
          requests: ServiceRequest[];
        };
        setRequests(envelope.requests ?? []);
      }
      if (statsResult.success && statsResult.data) {
        const d = statsResult.data as Stats & {
          total: number;
          inProgress: number;
          completed: number;
          cancelled: number;
          urgent: number;
        };
        setStats({
          total: d.total,
          pending: d.pending,
          todayCount: d.todayCount,
          pendingUrgent: d.pendingUrgent,
        });
      }
      setLoading(false);
    }
    fetchData();
    return () => {
      cancelled = true;
    };
  }, []);

  // ----- Loading skeleton ---------------------------------------------------
  if (loading) {
    return (
      <section className="at-tile at-srq-widget" aria-label="درخواست‌های خدمات">
        <div className="at-srq-widget__head">
          <div className="flex items-center gap-3">
            <span
              className="at-head__ico"
              aria-hidden
              style={{ animation: 'pulse 1.6s ease-in-out infinite' }}
            >
              <HiOutlineClipboardDocumentList className="w-3.5 h-3.5" />
            </span>
            <div>
              <p className="at-head__title-text">درخواست‌های خدمات</p>
              <p className="at-head__sub">در حال بارگذاری…</p>
            </div>
          </div>
        </div>
        <div className="at-srq-widget__kpis" aria-hidden>
          {[0, 1, 2].map((i) => (
            <div key={i} className="at-srq-widget__kpi">
              <span
                className="block h-3 rounded"
                style={{ width: '60%', background: 'var(--at-line)' }}
              />
              <span
                className="block h-6 rounded mt-1"
                style={{ width: '40%', background: 'var(--at-line)' }}
              />
            </div>
          ))}
        </div>
        <div className="at-srq-widget__body" aria-hidden>
          {[0, 1, 2].map((i) => (
            <div key={i} className="at-srq-widget__row">
              <span
                className="at-srq-widget__avatar"
                style={{ background: 'var(--at-bg-elevated)' }}
              />
              <div className="at-srq-widget__row-main">
                <span
                  className="block h-3 rounded"
                  style={{ width: '55%', background: 'var(--at-line)' }}
                />
                <span
                  className="block h-2.5 rounded mt-1"
                  style={{ width: '35%', background: 'var(--at-line)' }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  const pending = stats?.pending ?? 0;
  const todayCount = stats?.todayCount ?? 0;
  const pendingUrgent = stats?.pendingUrgent ?? 0;

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="at-tile at-srq-widget"
      aria-label="درخواست‌های خدمات"
    >
      {/* ----- Header ----------------------------------------------------- */}
      <div className="at-srq-widget__head">
        <div className="flex items-center gap-3 min-w-0">
          <span className="at-head__ico" aria-hidden>
            <HiOutlineClipboardDocumentList className="w-3.5 h-3.5" />
          </span>
          <div className="min-w-0">
            <p className="at-head__title-text">درخواست‌های خدمات</p>
            <p className="at-head__sub">
              <span className="tabular-nums">{pending.toLocaleString('fa-IR')}</span> در انتظار ·{' '}
              <span className="tabular-nums">{todayCount.toLocaleString('fa-IR')}</span> امروز
            </p>
          </div>
        </div>
        <Link href="/dashboard/service-requests" className="at-head__more">
          مشاهده همه
          <HiOutlineArrowLeft className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* ----- Mini KPI strip -------------------------------------------- */}
      <div className="at-srq-widget__kpis" aria-label="خلاصه آمار">
        <div className="at-srq-widget__kpi is-pending">
          <span className="at-srq-widget__kpi-label">
            <HiOutlineClock className="w-3.5 h-3.5" aria-hidden />
            در انتظار
          </span>
          <span className="at-srq-widget__kpi-value">
            <CountUp value={pending} duration={500} />
          </span>
        </div>
        <div className="at-srq-widget__kpi is-today">
          <span className="at-srq-widget__kpi-label">
            <HiOutlineCalendarDays className="w-3.5 h-3.5" aria-hidden />
            ثبت امروز
          </span>
          <span className="at-srq-widget__kpi-value">
            <CountUp value={todayCount} duration={500} />
          </span>
        </div>
        <div className="at-srq-widget__kpi is-urgent">
          <span className="at-srq-widget__kpi-label">
            <HiOutlineBolt className="w-3.5 h-3.5" aria-hidden />
            فوری
          </span>
          <span className="at-srq-widget__kpi-value">
            <CountUp value={pendingUrgent} duration={500} />
          </span>
        </div>
      </div>

      {/* ----- Body list -------------------------------------------------- */}
      <div className="at-srq-widget__body">
        {requests.length === 0 ? (
          <div className="at-srq-widget__empty">درخواست در انتظاری وجود ندارد</div>
        ) : (
          requests.map((request) => {
            const statusKey = request.status as keyof typeof statusClass;
            const statusModifier = statusClass[statusKey] ?? '';
            const statusLabel = statusLabels[statusKey] ?? request.status;
            return (
              <Link
                key={request.id}
                href="/dashboard/service-requests"
                className="at-srq-widget__row"
              >
                <span className="at-srq-widget__avatar" aria-hidden>
                  {getInitial(request.fullName)}
                </span>
                <div className="at-srq-widget__row-main">
                  <span className="at-srq-widget__row-title">
                    <span className="truncate">{request.fullName}</span>
                    {request.urgency === 'URGENT' && (
                      <span className="at-srq-widget__flag">فوری</span>
                    )}
                  </span>
                  <span className="at-srq-widget__row-meta">
                    <span>{serviceTypeLabels[request.serviceType] ?? request.serviceType}</span>
                    <span aria-hidden>·</span>
                    <span className="font-mono tracking-tight">{request.trackingCode}</span>
                  </span>
                </div>
                <span className="at-srq-widget__row-amount">
                  <span className="tabular-nums">
                    {Number(request.amount).toLocaleString('fa-IR')}
                  </span>{' '}
                  <span className="text-[10px] text-[color:var(--at-fg-subtle)] font-medium">
                    {request.currency}
                  </span>
                </span>
                <span className={`at-srq-widget__row-status ${statusModifier}`}>
                  <span className="at-srq-widget__row-status__dot" aria-hidden />
                  {statusLabel}
                </span>
              </Link>
            );
          })
        )}
      </div>

      {/* ----- Footer ----------------------------------------------------- */}
      <div className="at-srq-widget__foot">
        <Link href="/dashboard/service-requests" className="at-srq-widget__link">
          مشاهده همه درخواست‌ها
          <HiOutlineArrowLeft className="w-3.5 h-3.5" />
        </Link>
      </div>
    </motion.section>
  );
}
