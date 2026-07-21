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

const STATUS_MAP: Record<string, { label: string; color: string; bg: string; border: string }> = {
  ACTIVE: {
    label: 'فعال',
    color: 'oklch(40% 0.12 145)',
    bg: 'oklch(95% 0.08 145)',
    border: 'oklch(80% 0.12 145)',
  },
  PENDING: {
    label: 'در انتظار تأیید',
    color: 'oklch(40% 0.12 80)',
    bg: 'oklch(95% 0.06 85)',
    border: 'oklch(80% 0.10 80)',
  },
  SUSPENDED: {
    label: 'معلق',
    color: 'oklch(40% 0.12 50)',
    bg: 'oklch(95% 0.06 50)',
    border: 'oklch(80% 0.10 50)',
  },
  CLOSED: {
    label: 'بسته',
    color: 'oklch(45% 0 0)',
    bg: 'oklch(93% 0 0)',
    border: 'oklch(80% 0 0)',
  },
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

  const currentStatusInfo = STATUS_MAP[status] ?? STATUS_MAP.PENDING;

  return (
    <div className={s.root}>
      {/* ─── ردیف بالا: اطلاعات + وضعیت ─────────────────────────────────────── */}
      <div className={s.topRow}>
        {/* اطلاعات پایه */}
        <div className={s.card}>
          <div className={s.cardHeader}>
            <Building2 className="w-4 h-4" style={{ color: 'var(--at-accent)' }} aria-hidden />
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
                <dt>
                  <MapPin className="w-3 h-3" aria-hidden style={{ display: 'inline' }} /> شهر
                </dt>
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
                <dt>
                  <Phone className="w-3 h-3" aria-hidden style={{ display: 'inline' }} /> تلفن
                </dt>
                <dd dir="ltr">{exchange.phone}</dd>
              </>
            )}
            {exchange.email && (
              <>
                <dt>
                  <Mail className="w-3 h-3" aria-hidden style={{ display: 'inline' }} /> ایمیل
                </dt>
                <dd dir="ltr">{exchange.email}</dd>
              </>
            )}
            <dt>
              <ShieldCheck className="w-3 h-3" aria-hidden style={{ display: 'inline' }} /> KYC
            </dt>
            <dd>{exchange.requireKyc ? 'اجباری' : 'اختیاری'}</dd>
            <dt>کارمزد پلتفرم</dt>
            <dd className="tabular-nums">{exchange.platformFee}٪</dd>
            <dt>سقف روزانه</dt>
            <dd className="tabular-nums">
              {exchange.dailyLimitAf > 0
                ? `${new Intl.NumberFormat('fa-IR').format(exchange.dailyLimitAf)} افغانی`
                : 'بدون محدودیت'}
            </dd>
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
            <CircleDollarSign
              className="w-4 h-4"
              style={{ color: 'var(--at-accent)' }}
              aria-hidden
            />
            <span>وضعیت و مدیریت</span>
          </div>

          <div className={s.statusSection}>
            <div
              className={s.statusBadgeLg}
              style={{
                color: currentStatusInfo.color,
                background: currentStatusInfo.bg,
                border: `1px solid ${currentStatusInfo.border}`,
              }}
            >
              {currentStatusInfo.label}
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
                <CheckCircle2 className="w-4 h-4" aria-hidden />
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
                <PauseCircle className="w-4 h-4" aria-hidden />
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
                <XCircle className="w-4 h-4" aria-hidden />
                بستن صرافی
              </button>
            )}
            <Link
              href="/dashboard/exchanges"
              className={s.statusBtn}
              style={{ textDecoration: 'none' }}
            >
              بازگشت به لیست
            </Link>
          </div>
        </div>
      </div>

      {/* ─── کارمندان ─────────────────────────────────────────────────────────── */}
      <div className={s.card}>
        <div className={s.cardHeader}>
          <Users className="w-4 h-4" style={{ color: 'var(--at-accent)' }} aria-hidden />
          <span>کارمندان ({new Intl.NumberFormat('fa-IR').format(staff.length)})</span>
        </div>
        {staff.length === 0 ? (
          <p className={s.empty}>هنوز کارمندی اضافه نشده.</p>
        ) : (
          <div className={s.staffList}>
            {staff.map((member) => (
              <div key={member.id} className={s.staffRow}>
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

      {/* ─── آخرین تراکنش‌ها ──────────────────────────────────────────────────── */}
      <div className={s.card}>
        <div className={s.cardHeader}>
          <CircleDollarSign className="w-4 h-4" style={{ color: 'var(--at-accent)' }} aria-hidden />
          <span>آخرین تراکنش‌ها</span>
        </div>
        {recentTransactions.length === 0 ? (
          <p className={s.empty}>هنوز تراکنشی ثبت نشده.</p>
        ) : (
          <div className={s.txList}>
            {recentTransactions.map((tx) => (
              <div key={tx.id} className={s.txRow}>
                <div className={s.txCustomer}>
                  <span className={s.txName}>{tx.customer?.fullName ?? '—'}</span>
                  <span className={s.txPhone}>{tx.customer?.phone ?? ''}</span>
                </div>
                <span className={s.txKind}>{KIND_FA[tx.kind] ?? tx.kind}</span>
                <span className={s.txAmount}>
                  {new Intl.NumberFormat('fa-IR').format(Number(tx.amount) / 100)} {tx.currency}
                </span>
                <span
                  className={s.txStatus}
                  style={{
                    color:
                      tx.status === 'COMPLETED' ? 'oklch(40% 0.12 145)' : 'var(--at-fg-subtle)',
                  }}
                >
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
