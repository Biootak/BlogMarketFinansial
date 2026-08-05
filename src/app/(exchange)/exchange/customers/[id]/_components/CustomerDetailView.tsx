'use client';

/**
 * CustomerDetailView — نمایش کامل پروفایل مشتری صراف.
 *
 * از primitives مشترک داشبورد استفاده می‌کند:
 *   - StatCard + StatGrid  → آمار تراکنش‌ها
 *   - Section              → گروه‌بندی بلوک‌ها
 *   - DataTable + EmptyState → جدول تراکنش‌ها
 */

import type { CustomerRow } from '@/actions/exchange-customers';
import { setCustomerStatus, updateCustomer } from '@/actions/exchange-customers';
import type { TransactionRow } from '@/actions/exchange-transactions';
import {
  type Column,
  DataTable,
  EmptyState,
  Section,
  StatCard,
  StatGrid,
} from '@/components/Dashboard/primitives';
import { useToast } from '@/components/ui/use-toast';
import {
  AlertTriangle,
  Building2,
  CircleDollarSign,
  Clock,
  PencilLine,
  Phone,
  UserCheck,
  UserX,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import CustomerDrawer from '../../_components/CustomerDrawer';
import s from './CustomerDetailView.module.css';

const _faNum = new Intl.NumberFormat('fa-IR');

// ─── Lookup tables ──────────────────────────────────────────────────────────

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  ACTIVE: { label: 'فعال', cls: s.badgeActive },
  PROSPECT: { label: 'احتمالی', cls: s.badgePending },
  FROZEN: { label: 'مسدود', cls: s.badgeSuspended },
  CLOSED: { label: 'بسته', cls: s.badgeClosed },
};

const KYC_LEVEL_MAP: Record<string, { label: string; cls: string }> = {
  NONE: { label: 'بدون احراز', cls: s.kycNone },
  LEVEL_1: { label: 'سطح ۱', cls: s.kycLevel1 },
  LEVEL_2: { label: 'سطح ۲', cls: s.kycLevel2 },
  LEVEL_3: { label: 'سطح ۳', cls: s.kycLevel3 },
};

const KYC_STATUS_MAP: Record<string, string> = {
  PENDING: 'در انتظار بررسی',
  APPROVED: 'تأییدشده',
  REJECTED: 'رد‌شده',
  EXPIRED: 'منقضی',
};

const KIND_FA: Record<string, string> = {
  DEPOSIT: 'واریز',
  WITHDRAWAL: 'برداشت',
  EXCHANGE: 'صرافی',
  TRANSFER: 'انتقال',
  FEE: 'کارمزد',
  SETTLEMENT: 'تسویه',
  ADJUSTMENT: 'تعدیل',
};

const STATUS_TX_FA: Record<string, { label: string; color: string }> = {
  COMPLETED: { label: 'تکمیل', color: 'oklch(45% 0.14 145)' },
  PENDING: { label: 'در انتظار', color: 'var(--at-fg-subtle)' },
  PROCESSING: { label: 'در پردازش', color: 'oklch(55% 0.14 250)' },
  FAILED: { label: 'ناموفق', color: 'oklch(50% 0.18 25)' },
  CANCELLED: { label: 'لغو', color: 'var(--at-fg-subtle)' },
  REVERSED: { label: 'برگشت', color: 'oklch(55% 0.14 60)' },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatJalali(iso: string, short = false): string {
  return new Intl.DateTimeFormat('fa-IR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...(short ? {} : { hour: '2-digit', minute: '2-digit' }),
  }).format(new Date(iso));
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface Props {
  customer: CustomerRow;
  transactions: TransactionRow[];
  exchangeId: string;
  staffRole: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function CustomerDetailView({
  customer: initialCustomer,
  transactions,
  exchangeId,
  staffRole,
}: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [customer, setCustomer] = useState(initialCustomer);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const canEdit = ['OWNER', 'MANAGER', 'STAFF'].includes(staffRole);

  // ── محاسبه آمار ────────────────────────────────────────────────────────────
  const completedTxns = transactions.filter((t) => t.status === 'COMPLETED');
  const totalVolume = completedTxns.reduce((sum, t) => sum + Number(t.amount) / 100, 0);
  const completedCount = completedTxns.length;
  const pendingCount = transactions.filter((t) => t.status === 'PENDING').length;

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleSave = useCallback(
    async (data: Record<string, unknown>) => {
      setSaving(true);
      const result = await updateCustomer(exchangeId, customer.id, data);
      setSaving(false);
      if (result.success) {
        setCustomer(result.data);
        setDrawerOpen(false);
        router.refresh();
      } else {
        toast({ variant: 'destructive', title: 'خطا', description: result.error.message });
      }
    },
    [customer.id, exchangeId, router, toast],
  );

  const handleStatusChange = useCallback(
    async (status: 'ACTIVE' | 'FROZEN' | 'CLOSED') => {
      const result = await setCustomerStatus(exchangeId, customer.id, status);
      if (result.success) {
        setCustomer((prev) => ({ ...prev, status: result.data.status }));
        router.refresh();
      } else {
        toast({ variant: 'destructive', title: 'خطا', description: 'تغییر وضعیت ناموفق بود' });
      }
    },
    [customer.id, exchangeId, router, toast],
  );

  const st = STATUS_MAP[customer.status] ?? { label: customer.status, cls: '' };
  const kyc = KYC_LEVEL_MAP[customer.kycLevel] ?? { label: customer.kycLevel, cls: '' };

  // ── ستون‌های جدول تراکنش ────────────────────────────────────────────────────
  const txColumns: Column<TransactionRow>[] = [
    {
      key: 'createdAt',
      header: 'تاریخ',
      render: (r) => (
        <span className={s.cellMuted} style={{ fontVariantNumeric: 'tabular-nums' }}>
          {formatJalali(r.createdAt)}
        </span>
      ),
      width: '160px',
    },
    {
      key: 'kind',
      header: 'نوع',
      render: (r) => <span className={s.kindBadge}>{KIND_FA[r.kind] ?? r.kind}</span>,
      width: '100px',
    },
    {
      key: 'amount',
      header: 'مبلغ',
      render: (r) => (
        <span className={s.amountCell}>
          {_faNum.format(Number(r.amount) / 100)} {r.currency}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'وضعیت',
      render: (r) => {
        const txSt = STATUS_TX_FA[r.status] ?? { label: r.status, color: 'var(--at-fg-subtle)' };
        return (
          <span className={s.cellMuted} style={{ color: txSt.color, fontWeight: 500 }}>
            {txSt.label}
          </span>
        );
      },
      width: '100px',
    },
    {
      key: 'note',
      header: 'یادداشت',
      render: (r) => <span className={s.cellMuted}>{r.note ?? '—'}</span>,
    },
  ];

  return (
    <div className={s.root}>
      {/* ── بلوک بالا: پروفایل + تماس + ریسک ────────────────── */}
      <div className={s.topGrid}>
        {/* کارت پروفایل */}
        <div className={s.profileCard}>
          <div className={s.avatar} aria-hidden>
            {customer.fullName.slice(0, 1)}
          </div>
          <div className={s.profileMeta}>
            <h2 className={s.profileName}>{customer.fullName}</h2>
            {customer.fatherName && <p className={s.profileSub}>پدر: {customer.fatherName}</p>}
            <div className={s.profileBadges}>
              <span className={`${s.badge} ${st.cls}`}>{st.label}</span>
              <span className={`${s.badge} ${kyc.cls}`}>KYC {kyc.label}</span>
              {customer.kycStatus && customer.kycStatus !== 'PENDING' && (
                <span className={s.kycStatusText}>
                  {KYC_STATUS_MAP[customer.kycStatus] ?? customer.kycStatus}
                </span>
              )}
            </div>
          </div>

          {canEdit && (
            <div className={s.profileActions}>
              <button
                type="button"
                className={s.editBtn}
                onClick={() => setDrawerOpen(true)}
                aria-label="ویرایش مشتری"
              >
                <PencilLine className="w-4 h-4" aria-hidden />
                ویرایش
              </button>
              {customer.status !== 'ACTIVE' && (
                <button
                  type="button"
                  className={s.iconBtn}
                  onClick={() => handleStatusChange('ACTIVE')}
                  aria-label="فعال‌سازی مشتری"
                  title="فعال‌سازی"
                >
                  <UserCheck className="w-4 h-4" aria-hidden />
                </button>
              )}
              {customer.status === 'ACTIVE' && (
                <button
                  type="button"
                  className={s.iconBtn}
                  onClick={() => handleStatusChange('FROZEN')}
                  aria-label="مسدود کردن مشتری"
                  title="مسدود کردن"
                >
                  <UserX className="w-4 h-4" aria-hidden />
                </button>
              )}
            </div>
          )}
        </div>

        {/* اطلاعات تماس — از Section primitive */}
        <Section title="اطلاعات تماس">
          <dl className={s.infoList}>
            <div className={s.infoRow}>
              <dt>
                <Phone className="w-3.5 h-3.5" aria-hidden />
                تلفن
              </dt>
              <dd dir="ltr">{customer.phone}</dd>
            </div>
            {customer.email && (
              <div className={s.infoRow}>
                <dt>ایمیل</dt>
                <dd dir="ltr">{customer.email}</dd>
              </div>
            )}
            {customer.city && (
              <div className={s.infoRow}>
                <dt>شهر</dt>
                <dd>{customer.city}</dd>
              </div>
            )}
            {customer.address && (
              <div className={s.infoRow}>
                <dt>آدرس</dt>
                <dd>{customer.address}</dd>
              </div>
            )}
            <div className={s.infoRow}>
              <dt>تاریخ ثبت‌نام</dt>
              <dd>{formatJalali(customer.createdAt.toISOString(), true)}</dd>
            </div>
          </dl>
        </Section>

        {/* ریسک و محدودیت — از Section primitive */}
        <Section title="ریسک و محدودیت‌ها">
          <dl className={s.infoList}>
            <div className={s.infoRow}>
              <dt>امتیاز ریسک</dt>
              <dd>
                <span
                  style={{
                    fontVariantNumeric: 'tabular-nums',
                    fontWeight: 700,
                    color:
                      customer.riskScore > 70
                        ? 'oklch(50% 0.18 25)'
                        : customer.riskScore > 40
                          ? 'oklch(55% 0.14 60)'
                          : 'oklch(45% 0.14 145)',
                  }}
                >
                  {customer.riskScore}
                </span>
                <span className={s.cellMuted} style={{ marginInlineStart: '4px' }}>
                  {customer.riskScore > 70
                    ? '(پرریسک)'
                    : customer.riskScore > 40
                      ? '(متوسط)'
                      : '(کم‌ریسک)'}
                </span>
              </dd>
            </div>
            {customer.personalLimitAf && (
              <div className={s.infoRow}>
                <dt>سقف شخصی (افغانی)</dt>
                <dd style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {_faNum.format(Number(customer.personalLimitAf))}
                </dd>
              </div>
            )}
            {customer.notes && (
              <div className={s.infoRow} style={{ alignItems: 'flex-start' }}>
                <dt>
                  <AlertTriangle className="w-3.5 h-3.5" aria-hidden />
                  یادداشت
                </dt>
                <dd style={{ lineHeight: '1.5' }}>{customer.notes}</dd>
              </div>
            )}
          </dl>
        </Section>
      </div>

      {/* ── آمار — از StatGrid + StatCard مشترک ─────────────── */}
      <StatGrid cols={4}>
        <StatCard
          label="کل تراکنش‌ها"
          value={transactions.length}
          icon={CircleDollarSign}
          format="persian"
        />
        <StatCard label="تکمیل‌شده" value={completedCount} icon={Building2} format="persian" />
        <StatCard label="در انتظار" value={pendingCount} icon={Clock} format="persian" />
        <StatCard
          label="حجم تکمیل‌شده"
          value={totalVolume}
          icon={CircleDollarSign}
          format="compact"
        />
      </StatGrid>

      {/* ── جدول تراکنش‌ها — از Section + DataTable مشترک ────── */}
      <Section title="آخرین تراکنش‌ها">
        <div className={s.tableWrap}>
          <DataTable
            columns={txColumns}
            rows={transactions}
            rowKey={(r) => r.id}
            ariaLabel="تراکنش‌های مشتری"
            empty={
              <EmptyState
                title="هنوز تراکنشی ندارد"
                description="این مشتری هنوز هیچ تراکنشی ثبت نکرده است."
              />
            }
          />
        </div>
      </Section>

      {drawerOpen && (
        <CustomerDrawer
          open={drawerOpen}
          initialData={customer}
          saving={saving}
          onClose={() => setDrawerOpen(false)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
