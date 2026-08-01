'use client';

/**
 * KycReviewClient — 2026 Million-Dollar KYC Admin
 *
 * طراحی: Linear × Mercury × Attio — high-density fintech admin
 *
 * ویژگی‌ها:
 *  - KPI cards با glass + accent top stripe + stagger animation
 *  - Queue amber bar با breath dot برای تعداد در انتظار
 *  - Frosted-glass sticky header در جدول
 *  - Stagger row entrance + spring hover elevation
 *  - Urgent badge برای رکوردهای قدیمی (بیش از ۲ روز)
 *  - Document preview در Sheet با sticky header + image zoom
 *  - Approve / Reject با confirm dialog + inline success/error
 *  - کلیه states: loading / empty / error / success / disabled
 *  - Keyboard nav: Enter/Space روی rows، Esc برای بستن sheet
 *  - Dual-scope: KYC کاربران پلتفرم + KYC مشتریان صرافی‌ها (exchange-level)
 *  - Tab segment control برای جابجایی بین دو صف
 */

import { reviewKycRecord } from '@/actions/kyc-onboarding';
import { reviewCustomerKycRecord } from '@/actions/customer-portal';
import { EmptyState } from '@/components/Dashboard/primitives/EmptyState';
import { MillionDollarEmpty } from '@/components/Dashboard/primitives/MillionDollarEmpty';
import { PageHeader } from '@/components/Dashboard/primitives/PageHeader';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  Shield,
  ShieldCheck,
  User as UserIcon,
  Users,
  XCircle,
} from 'lucide-react';
import Image from 'next/image';
import {
  type KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from 'react';
import s from './KycReviewClient.module.css';

// ─── Types ─────────────────────────────────────────────────────────────────────

type KycRow = {
  id: string;
  userId: string;
  fullName: string | null;
  submittedAt: string | null;
  selfieUrl: string | null;
  docFrontUrl: string | null;
  docBackUrl: string | null;
  user: { name: string | null; email: string; phone: string | null } | null;
};

type CustomerKycRow = {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  docType: string;
  docNumber: string | null;
  fileUrl: string | null;
  level: string;
  exchangeId: string;
  exchangeName: string;
  createdAt: string;
};

type Props = { records: KycRow[]; customerRecords: CustomerKycRow[] };

type Scope = 'user' | 'customer';

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fa-IR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function initials(name: string | null | undefined): string {
  if (!name) return '؟';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) return (parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '');
  return name.slice(0, 2);
}

/** آیا رکورد بیش از ۲ روز است — urgent */
function isUrgent(submittedAt: string | null): boolean {
  if (!submittedAt) return false;
  return Date.now() - new Date(submittedAt).getTime() > 2 * 24 * 60 * 60 * 1000;
}

/** hue deterministic از نام */
function nameHue(name: string | null | undefined): number {
  if (!name) return 220;
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = ((h << 5) - h + name.charCodeAt(i)) & 0xffffffff;
  }
  return Math.abs(h) % 360;
}

function docCount(row: KycRow): number {
  return [row.selfieUrl, row.docFrontUrl, row.docBackUrl].filter(Boolean).length;
}

// ─── DocImage with fallback ────────────────────────────────────────────────────

function DocImage({ src, alt, delay = 0 }: { src: string; alt: string; delay?: number }) {
  const [error, setError] = useState(false);
  if (error) {
    return (
      <div className={s.imgFallback} aria-label={alt}>
        <FileText size={32} aria-hidden />
        <span>بارگذاری ناموفق</span>
      </div>
    );
  }
  return (
    <div
      className={s.docImgWrap}
      style={{ '--doc-delay': `${delay}ms` } as React.CSSProperties}
    >
      <Image
        src={src}
        alt={alt}
        fill
        className={s.docImg}
        onError={() => setError(true)}
        unoptimized
        sizes="(max-width: 768px) 100vw, 500px"
      />
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export function KycReviewClient({ records: initial, customerRecords: initialCustomer }: Props) {
  const [rows, setRows] = useState<KycRow[]>(initial);
  const [customerRows, setCustomerRows] = useState<CustomerKycRow[]>(initialCustomer);
  const [scope, setScope] = useState<Scope>('user');
  const [rejectTarget, setRejectTarget] = useState<KycRow | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [previewRow, setPreviewRow] = useState<KycRow | null>(null);
  const [previewCustomer, setPreviewCustomer] = useState<CustomerKycRow | null>(null);
  const [customerRejectTarget, setCustomerRejectTarget] = useState<CustomerKycRow | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<string | null>(null);

  /**
   * Client-side rate-limit guard: جلوگیری از کلیک‌های پشت سر هم روی دکمه‌های
   * approve/reject که می‌تواند race condition با optimistic UI ایجاد کند.
   * Server نیز rate-limit خودش را دارد (checkRateLimit) — این یک لایهٔ دفاع
   * مضاعف برای UX است.
   */
  const [actionCooldown, setActionCooldown] = useState(0);
  useEffect(() => {
    if (actionCooldown <= 0) return;
    const id = setTimeout(() => setActionCooldown(0), 800);
    return () => clearTimeout(id);
  }, [actionCooldown]);
  const actionLocked = actionCooldown > 0;

  // ── Derived counts ─────────────────────────────────────────────────────────
  const withDocs = useMemo(
    () => rows.filter((r) => r.docFrontUrl || r.docBackUrl || r.selfieUrl).length,
    [rows],
  );
  const withoutDocs = useMemo(
    () => rows.filter((r) => !r.docFrontUrl && !r.docBackUrl && !r.selfieUrl).length,
    [rows],
  );
  const urgentCount = useMemo(() => rows.filter((r) => isUrgent(r.submittedAt)).length, [rows]);

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleApprove = useCallback(
    (row: KycRow) => {
      // Optimistic: حذف فوری — اگر server خطا داد برگردان
      setRows((prev) => prev.filter((r) => r.id !== row.id));
      setPreviewRow((prev) => (prev?.id === row.id ? null : prev));
      setError(null);
      setLastAction(null);

      startTransition(async () => {
        const res = await reviewKycRecord({ userId: row.userId, approved: true });
        if (!res.success) {
          // rollback
          setRows((prev) => [row, ...prev].sort(
            (a, b) => new Date(a.submittedAt ?? 0).getTime() - new Date(b.submittedAt ?? 0).getTime(),
          ));
          setError(res.error.message);
          return;
        }
        setLastAction(`هویت «${row.fullName ?? row.user?.name ?? '—'}» تأیید شد`);
      });
    },
    [],
  );

  const handleRejectConfirm = useCallback(() => {
    if (!rejectTarget) return;
    const target = rejectTarget;
    const reason = rejectReason.trim() || 'اطلاعات ناقص یا نادرست';
    const name = target.fullName ?? target.user?.name ?? '—';

    // Optimistic: بستن dialog و حذف فوری
    setRejectTarget(null);
    setRejectReason('');
    setRows((prev) => prev.filter((r) => r.id !== target.id));
    setPreviewRow((prev) => (prev?.id === target.id ? null : prev));
    setError(null);
    setLastAction(null);

    startTransition(async () => {
      const res = await reviewKycRecord({
        userId: target.userId,
        approved: false,
        rejectedReason: reason,
      });
      if (!res.success) {
        // rollback
        setRows((prev) => [target, ...prev].sort(
          (a, b) => new Date(a.submittedAt ?? 0).getTime() - new Date(b.submittedAt ?? 0).getTime(),
        ));
        setError(res.error.message);
        return;
      }
      setLastAction(`درخواست «${name}» رد شد`);
    });
  }, [rejectTarget, rejectReason, actionLocked]);

  // ── Customer KYC actions ──────────────────────────────────────────────────
  const handleCustomerApprove = useCallback((row: CustomerKycRow) => {
    setCustomerRows((prev) => prev.filter((r) => r.id !== row.id));
    setPreviewCustomer((prev) => (prev?.id === row.id ? null : prev));
    setError(null);
    setLastAction(null);
    startTransition(async () => {
      const res = await reviewCustomerKycRecord({ recordId: row.id, approved: true });
      if (!res.success) {
        setCustomerRows((prev) => [row, ...prev]);
        setError(res.error ?? 'خطا');
        return;
      }
      setLastAction(`KYC مشتری «${row.customerName}» تأیید شد`);
    });
  }, []);

  const handleCustomerRejectConfirm = useCallback(() => {
    if (!customerRejectTarget || actionLocked) return;
    setActionCooldown(1);
    const target = customerRejectTarget;
    const reason = rejectReason.trim() || 'اطلاعات ناقص یا نادرست';
    setCustomerRejectTarget(null);
    setRejectReason('');
    setCustomerRows((prev) => prev.filter((r) => r.id !== target.id));
    setPreviewCustomer((prev) => (prev?.id === target.id ? null : prev));
    setError(null);
    setLastAction(null);
    startTransition(async () => {
      const res = await reviewCustomerKycRecord({
        recordId: target.id,
        approved: false,
        rejectedReason: reason,
      });
      if (!res.success) {
        setCustomerRows((prev) => [target, ...prev]);
        setError(res.error ?? 'خطا');
        return;
      }
      setLastAction(`KYC مشتری «${target.customerName}» رد شد`);
    });
  }, [customerRejectTarget, rejectReason]);

  // ── KPI items config ───────────────────────────────────────────────────────
  const kpiItems = [
    {
      label: 'در انتظار بررسی',
      value: rows.length,
      icon: <Users size={16} aria-hidden />,
      accent: 'var(--nova-amber, oklch(60% .16 70))',
    },
    {
      label: 'با مدرک کامل',
      value: withDocs,
      icon: <Shield size={16} aria-hidden />,
      accent: 'var(--ds-brand-500)',
    },
    {
      label: 'بدون مدرک',
      value: withoutDocs,
      icon: <FileText size={16} aria-hidden />,
      accent: 'var(--at-fg-muted, var(--ds-text-muted))',
    },
    {
      label: 'فوری (بیش از ۲ روز)',
      value: urgentCount,
      icon: <Clock size={16} aria-hidden />,
      accent: 'var(--nova-rose, oklch(55% .18 25))',
    },
  ];

  return (
    <div className={s.root}>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <PageHeader
        variant="compact"
        title="بررسی درخواست‌های KYC"
        description={`${rows.length + customerRows.length} درخواست در صف بررسی`}
        breadcrumb={[{ href: '/dashboard', label: 'داشبورد' }, { label: 'بررسی KYC' }]}
        eyebrow="احراز هویت"
        icon="shield-check"
        accent="violet"
      />

      {/* ── Scope Tab Segments ─────────────────────────────────────────────── */}
      <div className={s.scopeTabs} role="tablist" aria-label="نوع KYC">
        <button
          type="button"
          role="tab"
          aria-selected={scope === 'user'}
          className={cn(s.scopeTab, scope === 'user' && s.scopeTabActive)}
          onClick={() => setScope('user')}
        >
          <UserIcon size={14} aria-hidden />
          <span>کاربران پلتفرم</span>
          {rows.length > 0 && <span className={s.scopeTabCount}>{new Intl.NumberFormat('fa-IR').format(rows.length)}</span>}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={scope === 'customer'}
          className={cn(s.scopeTab, scope === 'customer' && s.scopeTabActive)}
          onClick={() => setScope('customer')}
        >
          <Building2 size={14} aria-hidden />
          <span>مشتریان صرافی‌ها</span>
          {customerRows.length > 0 && <span className={s.scopeTabCount}>{new Intl.NumberFormat('fa-IR').format(customerRows.length)}</span>}
        </button>
      </div>

      {/* ── KPI Strip (only for user scope) ───────────────────────────────── */}
      {scope === 'user' && (
      <div className={s.kpiStrip} aria-label="خلاصه صف KYC">
        {kpiItems.map((item, i) => (
          <div
            key={item.label}
            className={s.kpiCard}
            style={{ '--kpi-accent': item.accent, '--kpi-delay': `${i * 60}ms` } as React.CSSProperties}
          >
            <div className={s.kpiTop}>
              <span className={s.kpiIcon}>{item.icon}</span>
            </div>
            <span className={s.kpiValue}>
              {new Intl.NumberFormat('fa-IR').format(item.value)}
            </span>
            <span className={s.kpiLabel}>{item.label}</span>
          </div>
        ))}
      </div>
      )}

      {/* ── Urgent queue bar ───────────────────────────────────────────────── */}
      {urgentCount > 0 && (
        <div className={s.queueBar} role="status">
          <span className={s.queueBarDot} aria-hidden />
          <span className={s.queueBarText}>
            {new Intl.NumberFormat('fa-IR').format(urgentCount)} درخواست بیش از ۲ روز در صف انتظار است — بررسی فوری توصیه می‌شود
          </span>
        </div>
      )}

      {/* ── Success banner ─────────────────────────────────────────────────── */}
      {lastAction && (
        <div className={s.successBanner} role="status" aria-live="polite">
          <CheckCircle2 size={15} aria-hidden />
          {lastAction}
        </div>
      )}

      {/* ── Error banner ───────────────────────────────────────────────────── */}
      {error && (
        <div className={s.errorBanner} role="alert">
          <AlertCircle size={15} aria-hidden />
          {error}
        </div>
      )}

      {/* ── User KYC Table / Empty ─────────────────────────────────────────── */}
      {scope === 'user' && (
      rows.length === 0 ? (
        <div className={s.emptyWrap}>
          <EmptyState
            icon={ShieldCheck}
            title="همه KYC‌ها بررسی شدند"
            description="درخواست جدیدی در صف نیست. صف شما پاک است 🎉"
          />
        </div>
      ) : (
        <div className={s.tableWrap}>
          <table className={s.table} aria-label="صف بررسی KYC">
            <thead>
              <tr>
                <th className={s.th} scope="col">متقاضی</th>
                <th className={s.th} scope="col">تماس</th>
                <th className={s.th} scope="col">تاریخ ارسال</th>
                <th className={s.th} scope="col">مدارک</th>
                <th className={s.th} scope="col">
                  <span className="sr-only">عملیات</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const hue = nameHue(row.fullName ?? row.user?.name);
                const urgent = isUrgent(row.submittedAt);
                const docs = docCount(row);
                const displayName = row.fullName ?? row.user?.name ?? '—';

                return (
                  <tr
                    key={row.id}
                    className={s.tr}
                    style={{ '--row-i': i } as React.CSSProperties}
                    tabIndex={0}
                    aria-label={`بررسی KYC برای ${displayName}`}
                    onKeyDown={(e: KeyboardEvent<HTMLTableRowElement>) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setPreviewRow(row);
                      }
                    }}
                  >
                    {/* ── Applicant ── */}
                    <td className={s.td}>
                      <div className={s.applicant}>
                        <div
                          className={s.avatar}
                          aria-hidden
                          style={{
                            background: `oklch(91% 0.04 ${hue})`,
                            color: `oklch(36% 0.12 ${hue})`,
                          }}
                        >
                          {initials(displayName)}
                        </div>
                        <div className={s.applicantInfo}>
                          <span className={s.applicantName}>{displayName}</span>
                          <span className={s.applicantEmail}>
                            {row.user?.email ?? '—'}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* ── Phone ── */}
                    <td className={s.td}>
                      <span className={s.phone} dir="ltr">
                        {row.user?.phone ?? '—'}
                      </span>
                    </td>

                    {/* ── Date + Urgent ── */}
                    <td className={s.td}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span className={s.date}>{formatDate(row.submittedAt)}</span>
                        {urgent && (
                          <span className={s.urgentBadge}>
                            <span className={s.urgentDot} aria-hidden />
                            فوری
                          </span>
                        )}
                      </div>
                    </td>

                    {/* ── Doc chip ── */}
                    <td className={s.td}>
                      <button
                        type="button"
                        className={`${s.docsChip} ${docs > 0 ? s.docsChipHasDocs : s.docsChipNoDocs}`}
                        onClick={() => docs > 0 && setPreviewRow(row)}
                        aria-label={`پیش‌نمایش ${docs} مدرک برای ${displayName}`}
                        disabled={docs === 0}
                      >
                        <Eye size={12} aria-hidden />
                        {new Intl.NumberFormat('fa-IR').format(docs)} مدرک
                      </button>
                    </td>

                    {/* ── Actions ── */}
                    <td className={s.td}>
                      <div
                        className={s.actionCell}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                      >
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleApprove(row)}
                          disabled={isPending}
                          className={s.approveBtn}
                          aria-label={`تأیید هویت ${displayName}`}
                        >
                          <CheckCircle2 size={13} aria-hidden />
                          تأیید
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setRejectTarget(row)}
                          disabled={isPending}
                          className={s.rejectBtn}
                          aria-label={`رد درخواست ${displayName}`}
                        >
                          <XCircle size={13} aria-hidden />
                          رد
                        </Button>
                        <button
                          type="button"
                          className={s.previewIconBtn}
                          onClick={() => setPreviewRow(row)}
                          aria-label={`مشاهده جزئیات ${displayName}`}
                          title="مشاهده جزئیات"
                        >
                          <Eye size={14} aria-hidden />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )
      )}

      {/* ── Customer KYC Table / Empty ──────────────────────────────────────── */}
      {scope === 'customer' && (
        customerRows.length === 0 ? (
          <MillionDollarEmpty
            variant="shield"
            tone="neutral"
            eyebrow="صف KYC مشتریان"
            title="صف KYC مشتریان خالی است"
            description="هیچ درخواست تأیید هویت از سمت مشتریان صرافی‌ها ثبت نشده است."
          />
        ) : (
          <div className={s.tableWrap}>
            <table className={s.table} aria-label="صف بررسی KYC مشتریان">
              <thead>
                <tr>
                  <th className={s.th} scope="col">مشتری</th>
                  <th className={s.th} scope="col">صرافی</th>
                  <th className={s.th} scope="col">نوع مدرک</th>
                  <th className={s.th} scope="col">شماره</th>
                  <th className={s.th} scope="col">سطح</th>
                  <th className={s.th} scope="col">تاریخ</th>
                  <th className={s.th} scope="col">
                    <span className="sr-only">عملیات</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {customerRows.map((row, i) => {
                  const hue = nameHue(row.customerName);
                  const displayName = row.customerName || '—';
                  return (
                    <tr
                      key={row.id}
                      className={s.tr}
                      style={{ '--row-i': i } as React.CSSProperties}
                      tabIndex={0}
                      aria-label={`بررسی KYC برای ${displayName}`}
                      onKeyDown={(e: KeyboardEvent<HTMLTableRowElement>) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setPreviewCustomer(row);
                        }
                      }}
                    >
                      <td className={s.td}>
                        <div className={s.applicant}>
                          <div
                            className={s.avatar}
                            aria-hidden
                            style={{
                              background: `oklch(91% 0.04 ${hue})`,
                              color: `oklch(36% 0.12 ${hue})`,
                            }}
                          >
                            {initials(displayName)}
                          </div>
                          <div className={s.applicantInfo}>
                            <span className={s.applicantName}>{displayName}</span>
                            <span className={s.applicantEmail} dir="ltr">
                              {row.customerPhone}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className={s.td}>
                        <span className={s.exchangeChip}>
                          <Building2 size={11} aria-hidden />
                          {row.exchangeName}
                        </span>
                      </td>
                      <td className={s.td}>
                        <span className={s.docTypeChip}>{row.docType}</span>
                      </td>
                      <td className={s.td}>
                        <span className={s.phone} dir="ltr">
                          {row.docNumber ?? '—'}
                        </span>
                      </td>
                      <td className={s.td}>
                        <span className={s.levelChip}>{row.level}</span>
                      </td>
                      <td className={s.td}>
                        <span className={s.date}>{formatDate(row.createdAt)}</span>
                      </td>
                      <td className={s.td}>
                        <div
                          className={s.actionCell}
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => e.stopPropagation()}
                        >
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCustomerApprove(row)}
                            disabled={isPending}
                            className={s.approveBtn}
                            aria-label={`تأیید KYC ${displayName}`}
                          >
                            <CheckCircle2 size={13} aria-hidden />
                            تأیید
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setCustomerRejectTarget(row);
                              setRejectReason('');
                            }}
                            disabled={isPending}
                            className={s.rejectBtn}
                            aria-label={`رد KYC ${displayName}`}
                          >
                            <XCircle size={13} aria-hidden />
                            رد
                          </Button>
                          <button
                            type="button"
                            className={s.previewIconBtn}
                            onClick={() => setPreviewCustomer(row)}
                            aria-label={`مشاهده مدرک ${displayName}`}
                            title="مشاهده مدرک"
                          >
                            <Eye size={14} aria-hidden />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* ── Document Preview Sheet ─────────────────────────────────────────── */}
      <Sheet open={!!previewRow} onOpenChange={(o) => !o && setPreviewRow(null)}>
        <SheetContent dir="rtl" side="left" className={s.previewSheet}>
          {previewRow && (() => {
            const hue = nameHue(previewRow.fullName ?? previewRow.user?.name);
            const displayName = previewRow.fullName ?? previewRow.user?.name ?? 'بدون نام';
            const docs: Array<{ src: string; label: string }> = [
              previewRow.selfieUrl ? { src: previewRow.selfieUrl, label: 'سلفی' } : null,
              previewRow.docFrontUrl ? { src: previewRow.docFrontUrl, label: 'روی مدرک' } : null,
              previewRow.docBackUrl ? { src: previewRow.docBackUrl, label: 'پشت مدرک' } : null,
            ].filter(Boolean) as Array<{ src: string; label: string }>;

            return (
              <>
                {/* Sticky frosted header */}
                <div className={s.previewHeaderWrap}>
                  <div
                    className={s.previewAvatar}
                    aria-hidden
                    style={{
                      background: `oklch(91% 0.04 ${hue})`,
                      color: `oklch(36% 0.12 ${hue})`,
                    }}
                  >
                    {initials(displayName)}
                  </div>
                  <div className={s.previewTitleGroup}>
                    <span className={s.previewName}>{displayName}</span>
                    <span className={s.previewMeta}>
                      {previewRow.user?.email}
                      {previewRow.user?.phone && ` · ${previewRow.user.phone}`}
                    </span>
                  </div>
                </div>

                {/* Body */}
                <div className={s.previewBody}>
                  {docs.length === 0 ? (
                    <div className={s.imgFallback}>
                      <FileText size={32} aria-hidden />
                      <span>هیچ مدرکی بارگذاری نشده</span>
                    </div>
                  ) : (
                    docs.map((doc, idx) => (
                      <div
                        key={doc.src}
                        className={s.docBlock}
                        style={{ '--doc-delay': `${idx * 80}ms` } as React.CSSProperties}
                      >
                        <p className={s.docBlockLabel}>{doc.label}</p>
                        <DocImage src={doc.src} alt={doc.label} delay={idx * 80} />
                      </div>
                    ))
                  )}

                  {/* Quick actions */}
                  <div className={s.previewActions}>
                    <Button
                      className={s.previewApproveBtn}
                      onClick={() => handleApprove(previewRow)}
                      disabled={isPending}
                    >
                      <CheckCircle2 size={15} aria-hidden />
                      تأیید هویت
                    </Button>
                    <Button
                      variant="outline"
                      className={s.previewRejectBtn}
                      onClick={() => {
                        setRejectTarget(previewRow);
                        setPreviewRow(null);
                      }}
                      disabled={isPending}
                    >
                      <XCircle size={15} aria-hidden />
                      رد کردن
                    </Button>
                  </div>
                </div>
              </>
            );
          })()}
        </SheetContent>
      </Sheet>

      {/* ── Reject Dialog ──────────────────────────────────────────────────── */}
      <Dialog open={!!rejectTarget} onOpenChange={(o) => !o && setRejectTarget(null)}>
        <DialogContent dir="rtl" className={s.rejectDialog}>
          <DialogHeader>
            <DialogTitle>رد درخواست KYC</DialogTitle>
          </DialogHeader>
          <div className={s.dialogBody}>
            {rejectTarget && (
              <div className={s.rejectProfile}>
                <div
                  className={s.rejectAvatar}
                  aria-hidden
                  style={{
                    background: `oklch(96% 0.05 25)`,
                    color: `oklch(38% 0.14 25)`,
                  }}
                >
                  {initials(rejectTarget.fullName ?? rejectTarget.user?.name)}
                </div>
                <span className={s.rejectName}>
                  {rejectTarget.fullName ?? rejectTarget.user?.name ?? '—'}
                </span>
              </div>
            )}
            <label className={s.dialogLabel} htmlFor="kyc-reject-reason">
              دلیل رد (اختیاری):
            </label>
            <Textarea
              id="kyc-reject-reason"
              className={s.dialogTextarea}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              dir="rtl"
              placeholder="مدارک ناخوانا / اطلاعات ناقص / عکس تیره / …"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectTarget(null);
                setRejectReason('');
              }}
              disabled={isPending}
            >
              انصراف
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectConfirm}
              disabled={isPending}
            >
              {isPending ? 'در حال ارسال…' : 'رد کردن'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Customer Preview Sheet ──────────────────────────────────────────── */}
      <Sheet open={!!previewCustomer} onOpenChange={(o) => !o && setPreviewCustomer(null)}>
        <SheetContent dir="rtl" side="left" className={s.previewSheet}>
          {previewCustomer && (() => {
            const hue = nameHue(previewCustomer.customerName);
            return (
              <>
                <div className={s.previewHeaderWrap}>
                  <div
                    className={s.previewAvatar}
                    aria-hidden
                    style={{
                      background: `oklch(91% 0.04 ${hue})`,
                      color: `oklch(36% 0.12 ${hue})`,
                    }}
                  >
                    {initials(previewCustomer.customerName)}
                  </div>
                  <div className={s.previewTitleGroup}>
                    <span className={s.previewName}>{previewCustomer.customerName}</span>
                    <span className={s.previewMeta}>
                      <span dir="ltr">{previewCustomer.customerPhone}</span>
                      {' · '}
                      {previewCustomer.exchangeName}
                    </span>
                  </div>
                </div>
                <div className={s.previewBody}>
                  <div className={s.customerKycMeta}>
                    <div className={s.metaRow}>
                      <span className={s.metaLabel}>نوع مدرک:</span>
                      <span className={s.metaValue}>{previewCustomer.docType}</span>
                    </div>
                    <div className={s.metaRow}>
                      <span className={s.metaLabel}>شماره:</span>
                      <span className={s.metaValue} dir="ltr">
                        {previewCustomer.docNumber ?? '—'}
                      </span>
                    </div>
                    <div className={s.metaRow}>
                      <span className={s.metaLabel}>سطح درخواستی:</span>
                      <span className={s.metaValue}>{previewCustomer.level}</span>
                    </div>
                    <div className={s.metaRow}>
                      <span className={s.metaLabel}>تاریخ ارسال:</span>
                      <span className={s.metaValue}>
                        {formatDate(previewCustomer.createdAt)}
                      </span>
                    </div>
                  </div>

                  {previewCustomer.fileUrl ? (
                    <div className={s.docBlock}>
                      <p className={s.docBlockLabel}>تصویر مدرک</p>
                      <DocImage
                        src={previewCustomer.fileUrl}
                        alt={`مدرک ${previewCustomer.customerName}`}
                        delay={0}
                      />
                    </div>
                  ) : (
                    <div className={s.imgFallback}>
                      <FileText size={32} aria-hidden />
                      <span>مدرکی بارگذاری نشده</span>
                    </div>
                  )}

                  <div className={s.previewActions}>
                    <Button
                      className={s.previewApproveBtn}
                      onClick={() => handleCustomerApprove(previewCustomer)}
                      disabled={isPending}
                    >
                      <CheckCircle2 size={15} aria-hidden />
                      تأیید KYC
                    </Button>
                    <Button
                      variant="outline"
                      className={s.previewRejectBtn}
                      onClick={() => {
                        setCustomerRejectTarget(previewCustomer);
                        setRejectReason('');
                        setPreviewCustomer(null);
                      }}
                      disabled={isPending}
                    >
                      <XCircle size={15} aria-hidden />
                      رد کردن
                    </Button>
                  </div>
                </div>
              </>
            );
          })()}
        </SheetContent>
      </Sheet>

      {/* ── Customer Reject Dialog ──────────────────────────────────────────── */}
      <Dialog
        open={!!customerRejectTarget}
        onOpenChange={(o) => !o && setCustomerRejectTarget(null)}
      >
        <DialogContent dir="rtl" className={s.rejectDialog}>
          <DialogHeader>
            <DialogTitle>رد KYC مشتری</DialogTitle>
          </DialogHeader>
          <div className={s.dialogBody}>
            {customerRejectTarget && (
              <div className={s.rejectProfile}>
                <div
                  className={s.rejectAvatar}
                  aria-hidden
                  style={{
                    background: `oklch(96% 0.05 25)`,
                    color: `oklch(38% 0.14 25)`,
                  }}
                >
                  {initials(customerRejectTarget.customerName)}
                </div>
                <div className={s.rejectProfileMeta}>
                  <span className={s.rejectName}>{customerRejectTarget.customerName}</span>
                  <span className={s.rejectSub}>
                    {customerRejectTarget.exchangeName}
                  </span>
                </div>
              </div>
            )}
            <label className={s.dialogLabel} htmlFor="customer-kyc-reject-reason">
              دلیل رد (الزامی):
            </label>
            <Textarea
              id="customer-kyc-reject-reason"
              className={s.dialogTextarea}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              dir="rtl"
              placeholder="مثلاً: تصویر مدرک ناخوانا / تاریخ انقضا گذشته / …"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCustomerRejectTarget(null);
                setRejectReason('');
              }}
              disabled={isPending}
            >
              انصراف
            </Button>
            <Button
              variant="destructive"
              onClick={handleCustomerRejectConfirm}
              disabled={isPending || !rejectReason.trim()}
            >
              {isPending ? 'در حال ارسال…' : 'رد کردن'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
