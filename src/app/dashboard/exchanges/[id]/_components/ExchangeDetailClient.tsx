'use client';

/**
 * ExchangeDetailClient — بخش تعاملی صفحه جزئیات صرافی.
 *
 * ویرایش وضعیت (تأیید/تعلیق/بستن)، نمایش کارمندان، نمایش آخرین تراکنش‌ها.
 */

import type { CustomerRow } from '@/actions/exchange-customers';
import type { TransactionRow } from '@/actions/exchange-transactions';
import { type ExchangeRow, type ExchangeStaffRow, setExchangeStatus } from '@/actions/exchanges';
import { ConfirmDialog } from '@/components/Dashboard/primitives';
import {
  Building2,
  CheckCircle2,
  CircleDollarSign,
  Mail,
  MapPin,
  PauseCircle,
  Phone,
  ShieldCheck,
  Users,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import s from './ExchangeDetailClient.module.css';

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'فعال',
  PENDING: 'در انتظار تأیید',
  SUSPENDED: 'معلق',
  CLOSED: 'بسته',
};

const ROLE_FA: Record<string, string> = {
  OWNER: 'مالک',
  MANAGER: 'مدیر',
  STAFF: 'کارمند',
  VIEWER: 'مشاهده‌گر',
};

const KIND_FA: Record<string, string> = {
  DEPOSIT: 'واریز',
  WITHDRAWAL: 'برداشت',
  EXCHANGE: 'صرافی',
  TRANSFER: 'انتقال',
  FEE: 'کارمزد',
};
const STATUS_TX_FA: Record<string, string> = {
  COMPLETED: 'تکمیل',
  PENDING: 'در انتظار',
  FAILED: 'ناموفق',
  CANCELLED: 'لغو',
};

interface Props {
  exchange: ExchangeRow;
  staff: ExchangeStaffRow[];
  recentTransactions: TransactionRow[];
  recentCustomers?: CustomerRow[];
}

export default function ExchangeDetailClient({
  exchange,
  staff,
  recentTransactions,
  recentCustomers: _recentCustomers,
}: Props) {
  const router = useRouter();
  const [status, setStatus] = useState(exchange.status);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleStatusChange = useCallback(
    async (newStatus: 'ACTIVE' | 'SUSPENDED' | 'CLOSED' | 'PENDING') => {
      setSaving(true);
      const res = await setExchangeStatus(exchange.id, newStatus);
      setSaving(false);
      if (res.success) {
        setStatus(newStatus);
        router.refresh();
      }
      setPendingStatus(null);
    },
    [exchange.id, router],
  );

  return (
    <div className={s.root} dir="rtl">
      {/* ── KPI Strip ─────────────────────────────────────────────────────────── */}
      <div className={s.kpiStrip} role="list" aria-label="آمار صرافی">
        <div className={s.kpiItem} role="listitem">
          <span className={s.kpiVal}>{new Intl.NumberFormat('fa-IR').format(staff.length)}</span>
          <span className={s.kpiLabel}>کارمندان</span>
        </div>
        <div className={s.kpiDivider} aria-hidden />
        <div className={s.kpiItem} role="listitem">
          <span className={s.kpiVal}>{new Intl.NumberFormat('fa-IR').format(recentTransactions.length)}</span>
          <span className={s.kpiLabel}>تراکنش‌های اخیر</span>
        </div>
        <div className={s.kpiDivider} aria-hidden />
        <div className={s.kpiItem} role="listitem">
          <span className={s.kpiVal}>{exchange.platformFee}٪</span>
          <span className={s.kpiLabel}>کارمزد پلتفرم</span>
        </div>
        <div className={s.kpiDivider} aria-hidden />
        <div className={s.kpiItem} role="listitem">
          <span className={s.kpiVal}>
            {exchange.dailyLimitAf > 0
              ? new Intl.NumberFormat('fa-IR', { notation: 'compact' }).format(exchange.dailyLimitAf)
              : '∞'}
          </span>
          <span className={s.kpiLabel}>سقف روزانه (افغانی)</span>
        </div>
      </div>

      {/* ── ردیف بالا: اطلاعات + وضعیت ─────────────────────────────────────── */}
      <div className={s.topRow}>
        {/* اطلاعات پایه */}
        <div className={s.card}>
          <div className={s.cardHeader}>
            <span className={s.cardHeaderIcon} aria-hidden>
              <Building2 size={15} />
            </span>
            <span>اطلاعات پایه</span>
          </div>
          <dl className={s.infoGrid}>
            {exchange.licenseNo && (
              <>
                <dt>شماره مجوز</dt>
                <dd dir="ltr">{exchange.licenseNo}</dd>
              </>
            )}
            {exchange.city && (
              <>
                <dt><MapPin size={12} aria-hidden /> شهر</dt>
                <dd>{exchange.city}</dd>
              </>
            )}
            {exchange.address && (
              <>
                <dt>آدرس</dt>
                <dd>{exchange.address}</dd>
              </>
            )}
            {exchange.phone && (
              <>
                <dt><Phone size={12} aria-hidden /> تلفن</dt>
                <dd dir="ltr">{exchange.phone}</dd>
              </>
            )}
            {exchange.email && (
              <>
                <dt><Mail size={12} aria-hidden /> ایمیل</dt>
                <dd dir="ltr">{exchange.email}</dd>
              </>
            )}
            <dt><ShieldCheck size={12} aria-hidden /> KYC</dt>
            <dd>{exchange.requireKyc ? 'اجباری' : 'اختیاری'}</dd>
            <dt>تاریخ ثبت</dt>
            <dd>
              {new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium' }).format(
                new Date(exchange.createdAt),
              )}
            </dd>
          </dl>
        </div>

        {/* مدیریت وضعیت */}
        <div className={s.card}>
          <div className={s.cardHeader}>
            <span className={s.cardHeaderIcon} aria-hidden>
              <CircleDollarSign size={15} />
            </span>
            <span>وضعیت و مدیریت</span>
          </div>

          <div className={s.statusSection}>
            {/* data-status → CSS رنگ را handle می‌کند، نه inline style */}
            <div className={s.statusBadgeLg} data-status={status}>
              <span className={s.statusDot} aria-hidden />
              {STATUS_LABEL[status] ?? status}
            </div>
            <p className={s.statusHint}>وضعیت فعلی صرافی. تغییر وضعیت بلافاصله اعمال می‌شود.</p>
          </div>

          <div className={s.statusActions}>
            {status !== 'ACTIVE' && (
              <button
                type="button"
                className={`${s.statusBtn} ${s.statusBtnActive}`}
                onClick={() => setPendingStatus('ACTIVE')}
                disabled={saving}
              >
                <CheckCircle2 size={16} aria-hidden />
                تأیید و فعال‌سازی
              </button>
            )}
            {status === 'ACTIVE' && (
              <button
                type="button"
                className={`${s.statusBtn} ${s.statusBtnSuspend}`}
                onClick={() => setPendingStatus('SUSPENDED')}
                disabled={saving}
              >
                <PauseCircle size={16} aria-hidden />
                تعلیق موقت
              </button>
            )}
            {status !== 'CLOSED' && (
              <button
                type="button"
                className={`${s.statusBtn} ${s.statusBtnClose}`}
                onClick={() => setPendingStatus('CLOSED')}
                disabled={saving}
              >
                <XCircle size={16} aria-hidden />
                بستن صرافی
              </button>
            )}
            <Link href="/dashboard/exchanges" className={s.statusBtn}>
              بازگشت به لیست
            </Link>
          </div>
        </div>
      </div>

      {/* ── کارمندان ─────────────────────────────────────────────────────────── */}
      <div className={s.card}>
        <div className={s.cardHeader}>
          <span className={s.cardHeaderIcon} aria-hidden><Users size={15} /></span>
          <span>کارمندان ({new Intl.NumberFormat('fa-IR').format(staff.length)})</span>
        </div>
        {staff.length === 0 ? (
          <div className={s.empty}>
            <Users size={32} className={s.emptyIcon} aria-hidden />
            هنوز کارمندی اضافه نشده.
          </div>
        ) : (
          <div className={s.staffList}>
            {staff.map((member, i) => (
              <div key={member.id} className={s.staffRow} style={{ '--row-i': i } as React.CSSProperties}>
                <div className={s.staffAvatar}>
                  {member.user.image ? (
                    <img
                      src={member.user.image}
                      alt={member.user.name ?? ''}
                      className={s.staffAvatarImg}
                    />
                  ) : (
                    <span className={s.staffAvatarFallback}>
                      {(member.user.name ?? member.user.email).slice(0, 1).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className={s.staffInfo}>
                  <span className={s.staffName}>{member.user.name ?? member.user.email}</span>
                  <span className={s.staffEmail}>{member.user.email}</span>
                </div>
                <span className={s.roleBadge}>{ROLE_FA[member.role] ?? member.role}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── آخرین تراکنش‌ها ──────────────────────────────────────────────────── */}
      <div className={s.card}>
        <div className={s.cardHeader}>
          <span className={s.cardHeaderIcon} aria-hidden><CircleDollarSign size={15} /></span>
          <span>آخرین تراکنش‌ها</span>
        </div>
        {recentTransactions.length === 0 ? (
          <div className={s.empty}>
            <CircleDollarSign size={32} className={s.emptyIcon} aria-hidden />
            هنوز تراکنشی ثبت نشده.
          </div>
        ) : (
          <div className={s.txList}>
            {recentTransactions.map((tx, i) => (
              <div key={tx.id} className={s.txRow} style={{ '--row-i': i } as React.CSSProperties}>
                <div className={s.txCustomer}>
                  <span className={s.txName}>{tx.customer?.fullName ?? '—'}</span>
                  <span className={s.txPhone}>{tx.customer?.phone ?? ''}</span>
                </div>
                <span className={s.txKind}>{KIND_FA[tx.kind] ?? tx.kind}</span>
                <span className={s.txAmount}>
                  {new Intl.NumberFormat('fa-IR').format(Number(tx.amount) / 100)} {tx.currency}
                </span>
                {/* CSS class تعیین رنگ می‌کند — نه inline style */}
                <span className={tx.status === 'COMPLETED' ? s.txStatusCompleted : s.txStatusOther}>
                  {STATUS_TX_FA[tx.status] ?? tx.status}
                </span>
                <span className={s.txDate}>
                  {new Intl.DateTimeFormat('fa-IR', { dateStyle: 'short' }).format(
                    new Date(tx.createdAt as string),
                  )}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirm dialogs */}
      <ConfirmDialog
        open={pendingStatus === 'ACTIVE'}
        onOpenChange={(o) => {
          if (!o) setPendingStatus(null);
        }}
        title="فعال‌سازی صرافی"
        description={`صرافی «${exchange.name}» تأیید و فعال می‌شود. کارمندان می‌توانند وارد پنل شوند.`}
        confirmLabel="بله، فعال کن"
        cancelLabel="انصراف"
        variant="default"
        onConfirm={() => handleStatusChange('ACTIVE')}
        loading={saving}
      />
      <ConfirmDialog
        open={pendingStatus === 'SUSPENDED'}
        onOpenChange={(o) => {
          if (!o) setPendingStatus(null);
        }}
        title="تعلیق صرافی"
        description={`صرافی «${exchange.name}» موقتاً تعلیق می‌شود. دسترسی کارمندان قطع می‌شود.`}
        confirmLabel="بله، تعلیق کن"
        cancelLabel="انصراف"
        variant="danger"
        onConfirm={() => handleStatusChange('SUSPENDED')}
        loading={saving}
      />
      <ConfirmDialog
        open={pendingStatus === 'CLOSED'}
        onOpenChange={(o) => {
          if (!o) setPendingStatus(null);
        }}
        title="بستن دائمی صرافی"
        description={`صرافی «${exchange.name}» برای همیشه بسته می‌شود. این عملیات برگشت‌پذیر نیست.`}
        confirmLabel="بله، ببند"
        cancelLabel="انصراف"
        variant="danger"
        onConfirm={() => handleStatusChange('CLOSED')}
        loading={saving}
      />
    </div>
  );
}
