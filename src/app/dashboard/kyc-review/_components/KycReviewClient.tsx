'use client';

/**
 * KycReviewClient — IDENTITY COMMAND CENTER (2026 Redesign)
 *
 * Complete structural redesign: bento-grid command center with immersive
 * review workspace. Mobile-first, RTL-first, token-only, zero AI-slop.
 *
 * Layout:
 *   - Top: KPI bento strip (compact, dense, professional)
 *   - Middle: Command bar (scope + search + filters)
 *   - Bottom: Split workspace — Queue (right, dense list) + Review (left, immersive)
 *   - Mobile: vertical stack, queue → review
 *
 * Features preserved:
 *   - Dual-scope (User / Customer)
 *   - Keyboard nav (Arrow keys / Enter / Esc)
 *   - Optimistic UI + rollback
 *   - Client-side rate-limit guard
 *   - All backend actions intact
 */

import { reviewCustomerKycRecord } from '@/actions/customer-portal';
import { reviewKycRecord } from '@/actions/kyc-onboarding';
import { GeometricField } from '@/components/Dashboard/primitives/GeometricAccent';
import { MillionDollarEmpty } from '@/components/Dashboard/primitives/MillionDollarEmpty';
import { PageHeader } from '@/components/Dashboard/primitives/PageHeader';
import { SearchInput } from '@/components/Dashboard/primitives/SearchInput';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { formatFaNumber } from '@/lib/fa-number';
import { cn } from '@/lib/utils';
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Building2,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  Fingerprint,
  ImageOff,
  Shield,
  ShieldCheck,
  User,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import Image from 'next/image';
import {
  type KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from 'react';
import s from './KycReviewClient.module.css';

// ─── Types ────────────────────────────────────────────────────────────────

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

type Props = {
  records: KycRow[];
  customerRecords: CustomerKycRow[];
  /** 2026-08-11: enforce UI — فقط در صورت وجود اکشن فعال است (از سرور می‌آید) */
  canApprove?: boolean;
  canReview?: boolean;
};

type Scope = 'user' | 'customer';

// ─── Helpers ──────────────────────────────────────────────────────────────

function formatDate(d: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fa-IR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatRelative(d: string | null): string {
  if (!d) return '';
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${formatFaNumber(mins)} دقیقه پیش`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${formatFaNumber(hours)} ساعت پیش`;
  const days = Math.floor(hours / 24);
  return `${formatFaNumber(days)} روز پیش`;
}

function initials(name: string | null | undefined): string {
  if (!name) return '؟';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) return (parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '');
  return name.slice(0, 2);
}

function nameHue(name: string | null | undefined): number {
  if (!name) return 220;
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = ((h << 5) - h + name.charCodeAt(i)) & 0xffffffff;
  }
  return Math.abs(h) % 360;
}

function isUrgent(submittedAt: string | null): boolean {
  if (!submittedAt) return false;
  return Date.now() - new Date(submittedAt).getTime() > 2 * 24 * 60 * 60 * 1000;
}

function docCount(row: KycRow): number {
  return [row.selfieUrl, row.docFrontUrl, row.docBackUrl].filter(Boolean).length;
}

const DOC_TYPE_LABELS: Record<string, string> = {
  NATIONAL_ID: 'تذکره / کارت ملی',
  PASSPORT: 'پاسپورت',
  RESIDENCE_PERMIT: 'اجازه اقامت',
  PHONE: 'تأیید موبایل و تلگرام',
  SELFIE: 'سلفی (تأیید چهره)',
  ADDRESS_PROOF: 'سند اثبات آدرس',
  BANK_STATEMENT: 'صورت حساب بانکی',
};

const KYC_LEVEL_LABELS: Record<string, string> = {
  LEVEL_1: 'سطح ۱',
  LEVEL_2: 'سطح ۲',
  LEVEL_3: 'سطح ۳',
};

// ─── DocThumb ─────────────────────────────────────────────────────────────

function DocThumb({ src, alt, label }: { src: string; alt: string; label: string }) {
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  if (error) {
    return (
      <div className={s.docFallback}>
        <ImageOff size={24} aria-hidden />
        <span>{label} — بارگذاری ناموفق</span>
      </div>
    );
  }

  return (
    <div className={s.docThumb}>
      {!loaded && (
        <div className={s.docThumb__skeleton}>
          <FileText size={20} aria-hidden />
        </div>
      )}
      <Image
        src={src}
        alt={alt}
        fill
        className={cn(s.docThumb__img, loaded && s.docThumb__imgLoaded)}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
        unoptimized
        sizes="(max-width: 768px) 80vw, 400px"
      />
      <div className={s.docThumb__overlay}>
        <span className={s.docThumb__label}>{label}</span>
        <button
          type="button"
          className={s.docThumb__zoom}
          onClick={() => window.open(src, '_blank')}
          aria-label="بزرگنمایی"
        >
          <Eye size={14} />
        </button>
      </div>
    </div>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────

function Avatar({ name, size = 'sm' }: { name: string | null; size?: 'sm' | 'md' | 'lg' }) {
  const hue = nameHue(name);
  const sizeClass = size === 'sm' ? s.avatarSm : size === 'md' ? s.avatarMd : s.avatarLg;
  return (
    <div
      className={cn(s.avatar, sizeClass)}
      aria-hidden
      style={{
        background: `oklch(91% 0.04 ${hue})`,
        color: `oklch(36% 0.12 ${hue})`,
      }}
    >
      {initials(name)}
    </div>
  );
}

// ─── UrgentBadge ──────────────────────────────────────────────────────────

function UrgentBadge() {
  return (
    <span className={s.urgent}>
      <span className={s.urgent__dot} aria-hidden />
      فوری
    </span>
  );
}

// ─── KpiTile ──────────────────────────────────────────────────────────────

function KpiTile({
  label,
  value,
  icon,
  accent,
  delay,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  accent: string;
  delay: number;
}) {
  return (
    <div
      className={s.kpiTile}
      style={
        {
          '--kpi-accent': accent,
          '--kpi-delay': `${delay}ms`,
        } as React.CSSProperties
      }
    >
      <div className={s.kpiTile__glow} />
      <div className={s.kpiTile__icon}>{icon}</div>
      <div className={s.kpiTile__content}>
        <span className={s.kpiTile__value}>{formatFaNumber(value)}</span>
        <span className={s.kpiTile__label}>{label}</span>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────

export function KycReviewClient({
  records: initial,
  customerRecords: initialCustomer,
  canApprove = true,
  canReview = true,
}: Props) {
  const [rows, setRows] = useState<KycRow[]>(initial);
  const [customerRows, setCustomerRows] = useState<CustomerKycRow[]>(initialCustomer);
  const [scope, setScope] = useState<Scope>('user');

  // Selection
  const [selectedUser, setSelectedUser] = useState<KycRow | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerKycRow | null>(null);
  const selected = scope === 'user' ? selectedUser : selectedCustomer;

  // Reject dialog
  const [rejectTarget, setRejectTarget] = useState<{
    name: string;
    handler: () => void;
  } | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Actions
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [actionCooldown, setActionCooldown] = useState(0);

  // Search
  const [search, setSearch] = useState('');

  // Keyboard shortcut hints
  const [showShortcuts, setShowShortcuts] = useState(false);
  const shortcutsTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Auto-clear banners
  useEffect(() => {
    if (!lastAction && !error) return;
    const t = setTimeout(() => {
      setLastAction(null);
      setError(null);
    }, 5000);
    return () => clearTimeout(t);
  }, [lastAction, error]);

  // Action cooldown
  useEffect(() => {
    if (actionCooldown <= 0) return;
    const id = setTimeout(() => setActionCooldown(0), 800);
    return () => clearTimeout(id);
  }, [actionCooldown]);
  const actionLocked = actionCooldown > 0;

  // ── Filtered rows ────────────────────────────────────────────────────
  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (r.fullName ?? '').toLowerCase().includes(q) ||
        (r.user?.name ?? '').toLowerCase().includes(q) ||
        (r.user?.email ?? '').toLowerCase().includes(q) ||
        (r.user?.phone ?? '').includes(q),
    );
  }, [rows, search]);

  const filteredCustomerRows = useMemo(() => {
    if (!search.trim()) return customerRows;
    const q = search.trim().toLowerCase();
    return customerRows.filter(
      (r) =>
        (r.customerName ?? '').toLowerCase().includes(q) ||
        (r.customerPhone ?? '').includes(q) ||
        (r.exchangeName ?? '').toLowerCase().includes(q),
    );
  }, [customerRows, search]);

  // ── KPI computed ─────────────────────────────────────────────────────
  const withDocs = rows.filter((r) => docCount(r) > 0).length;
  const withoutDocs = rows.length - withDocs;
  const urgentCount = rows.filter((r) => isUrgent(r.submittedAt)).length;
  const customerUrgentCount = customerRows.filter((r) => isUrgent(r.createdAt)).length;

  // ── Scope change ─────────────────────────────────────────────────────
  const handleScopeChange = useCallback((next: Scope) => {
    setScope(next);
    setSelectedUser(null);
    setSelectedCustomer(null);
  }, []);

  // ── User approve ─────────────────────────────────────────────────────
  const handleUserApprove = useCallback(
    (row: KycRow) => {
      if (actionLocked) return;
      setActionCooldown(1);
      const name = row.fullName ?? row.user?.name ?? 'کاربر';
      setRows((prev) => prev.filter((r) => r.id !== row.id));
      if (selectedUser?.id === row.id) setSelectedUser(null);
      setError(null);
      setLastAction(null);
      startTransition(async () => {
        const res = await reviewKycRecord({ userId: row.userId, approved: true });
        if (!res.success) {
          setRows((prev) => [row, ...prev]);
          setError(typeof res.error === 'string' ? res.error : (res.error?.message ?? 'خطا'));
          return;
        }
        setLastAction(`KYC «${name}» تأیید شد`);
      });
    },
    [actionLocked, selectedUser],
  );

  // ── User reject ──────────────────────────────────────────────────────
  const handleUserReject = useCallback(
    (row: KycRow) => {
      setRejectTarget({
        name: row.fullName ?? row.user?.name ?? 'کاربر',
        handler: () => {
          if (actionLocked) return;
          setActionCooldown(1);
          const name = row.fullName ?? row.user?.name ?? 'کاربر';
          const reason = rejectReason.trim() || 'اطلاعات ناقص';

          setRows((prev) => prev.filter((r) => r.id !== row.id));
          if (selectedUser?.id === row.id) setSelectedUser(null);
          setRejectTarget(null);
          setRejectReason('');
          setError(null);
          setLastAction(null);

          startTransition(async () => {
            const res = await reviewKycRecord({
              userId: row.userId,
              approved: false,
              rejectedReason: reason,
            });
            if (!res.success) {
              setRows((prev) => [row, ...prev]);
              setError(typeof res.error === 'string' ? res.error : (res.error?.message ?? 'خطا'));
              return;
            }
            setLastAction(`KYC «${name}» رد شد`);
          });
        },
      });
    },
    [actionLocked, rejectReason, selectedUser],
  );

  // ── Customer approve ─────────────────────────────────────────────────
  const handleCustomerApprove = useCallback(
    (row: CustomerKycRow) => {
      if (actionLocked) return;
      setActionCooldown(1);
      const name = row.customerName;
      setCustomerRows((prev) => prev.filter((r) => r.id !== row.id));
      if (selectedCustomer?.id === row.id) setSelectedCustomer(null);
      setError(null);
      setLastAction(null);
      startTransition(async () => {
        const res = await reviewCustomerKycRecord({ recordId: row.id, approved: true });
        if (!res.success) {
          setCustomerRows((prev) => [row, ...prev]);
          setError(res.error ?? 'خطا');
          return;
        }
        setLastAction(`KYC مشتری «${name}» تأیید شد`);
      });
    },
    [actionLocked, selectedCustomer],
  );

  // ── Customer reject ──────────────────────────────────────────────────
  const handleCustomerReject = useCallback(
    (row: CustomerKycRow) => {
      setRejectTarget({
        name: row.customerName,
        handler: () => {
          if (actionLocked) return;
          setActionCooldown(1);
          const reason = rejectReason.trim() || 'اطلاعات ناقص یا نادرست';
          const name = row.customerName;

          setCustomerRows((prev) => prev.filter((r) => r.id !== row.id));
          if (selectedCustomer?.id === row.id) setSelectedCustomer(null);
          setRejectTarget(null);
          setRejectReason('');
          setError(null);
          setLastAction(null);

          startTransition(async () => {
            const res = await reviewCustomerKycRecord({
              recordId: row.id,
              approved: false,
              rejectedReason: reason,
            });
            if (!res.success) {
              setCustomerRows((prev) => [row, ...prev]);
              setError(res.error ?? 'خطا');
              return;
            }
            setLastAction(`KYC مشتری «${name}» رد شد`);
          });
        },
      });
    },
    [actionLocked, rejectReason, selectedCustomer],
  );

  // ── Keyboard navigation ──────────────────────────────────────────────
  const activeList = scope === 'user' ? filteredRows : filteredCustomerRows;
  const activeIdx = selected ? activeList.findIndex((r) => r.id === selected.id) : -1;

  useEffect(() => {
    if (!selected) return;
    const handler = (e: KeyboardEvent<Document>) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const next = activeList[activeIdx + 1];
        if (next) {
          scope === 'user'
            ? setSelectedUser(next as KycRow)
            : setSelectedCustomer(next as CustomerKycRow);
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prev = activeList[activeIdx - 1];
        if (prev) {
          scope === 'user'
            ? setSelectedUser(prev as KycRow)
            : setSelectedCustomer(prev as CustomerKycRow);
        }
      } else if (e.key === 'Escape') {
        scope === 'user' ? setSelectedUser(null) : setSelectedCustomer(null);
      }
    };
    document.addEventListener('keydown' as never, handler as never);
    return () => document.removeEventListener('keydown' as never, handler as never);
  }, [selected, activeList, activeIdx, scope]);

  // ── Keyboard shortcuts hint ──────────────────────────────────────────
  useEffect(() => {
    if (!selected) {
      setShowShortcuts(true);
      if (shortcutsTimer.current) clearTimeout(shortcutsTimer.current);
      shortcutsTimer.current = setTimeout(() => setShowShortcuts(false), 4000);
      return;
    }
    setShowShortcuts(false);
  }, [selected]);

  // ── KPI config ───────────────────────────────────────────────────────
  const kpiItems =
    scope === 'user'
      ? [
          {
            label: 'در انتظار',
            value: rows.length,
            icon: <Users size={14} aria-hidden />,
            accent: 'var(--nova-amber, oklch(68% 0.14 70))',
          },
          {
            label: 'با مدرک',
            value: withDocs,
            icon: <Shield size={14} aria-hidden />,
            accent: 'var(--ds-brand-500)',
          },
          {
            label: 'بدون مدرک',
            value: withoutDocs,
            icon: <FileText size={14} aria-hidden />,
            accent: 'var(--at-fg-muted, var(--ds-text-muted))',
          },
          {
            label: 'فوری',
            value: urgentCount,
            icon: <Clock size={14} aria-hidden />,
            accent: 'var(--nova-rose, oklch(60% 0.15 25))',
          },
        ]
      : [
          {
            label: 'در انتظار',
            value: customerRows.length,
            icon: <Building2 size={14} aria-hidden />,
            accent: 'var(--nova-amber, oklch(68% 0.14 70))',
          },
          {
            label: 'فوری',
            value: customerUrgentCount,
            icon: <Clock size={14} aria-hidden />,
            accent: 'var(--nova-rose, oklch(60% 0.15 25))',
          },
        ];

  const totalQueue = rows.length + customerRows.length;

  return (
    <div className={s.root} dir="rtl">
      {/* ═══ Header ═══ */}
      <PageHeader
        variant="compact"
        title="مرکز بررسی احراز هویت"
        description={`${formatFaNumber(totalQueue)} درخواست در صف بررسی`}
        breadcrumb={[{ href: '/dashboard', label: 'داشبورد' }, { label: 'بررسی KYC' }]}
        eyebrow="احراز هویت"
        icon="shield-check"
        accent="emerald"
      />

      {/* ═══ KPI Bento Strip ═══ */}
      <div className={s.kpiStrip} data-od-id="kpi-strip">
        {kpiItems.map((item, i) => (
          <KpiTile
            key={item.label}
            label={item.label}
            value={item.value}
            icon={item.icon}
            accent={item.accent}
            delay={i * 60}
          />
        ))}
      </div>

      {/* ═══ Command Bar ═══ */}
      <div className={s.commandBar} data-od-id="command-bar">
        <div className={s.commandBar__inner}>
          {/* Scope Pills */}
          <div className={s.scopePills} role="tablist" aria-label="نوع KYC">
            <button
              type="button"
              role="tab"
              aria-selected={scope === 'user'}
              className={cn(s.scopePill, scope === 'user' && s.scopePillActive)}
              onClick={() => handleScopeChange('user')}
            >
              <User size={13} aria-hidden />
              <span>کاربران پلتفرم</span>
              {rows.length > 0 && (
                <span className={s.scopePill__count}>{formatFaNumber(rows.length)}</span>
              )}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={scope === 'customer'}
              className={cn(s.scopePill, scope === 'customer' && s.scopePillActive)}
              onClick={() => handleScopeChange('customer')}
            >
              <Building2 size={13} aria-hidden />
              <span>مشتریان صرافی‌ها</span>
              {customerRows.length > 0 && (
                <span className={s.scopePill__count}>{formatFaNumber(customerRows.length)}</span>
              )}
            </button>
          </div>

          {/* Search */}
          <div className={s.commandBar__search}>
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="جستجوی نام، ایمیل یا شماره…"
            />
          </div>
        </div>
      </div>

      {/* ═══ Status banners ═══ */}
      {lastAction && (
        <div
          className={cn(s.banner, s.bannerSuccess)}
          role="status"
          aria-live="polite"
          data-od-id="success-banner"
        >
          <CheckCircle2 size={14} aria-hidden />
          {lastAction}
        </div>
      )}
      {error && (
        <div className={cn(s.banner, s.bannerError)} role="alert" data-od-id="error-banner">
          <AlertCircle size={14} aria-hidden />
          {error}
        </div>
      )}

      {/* ═══ Workspace ═══ */}
      <div className={s.workspace} data-od-id="workspace">
        {/* ── Queue Column (right) ── */}
        <div className={s.queueColumn} data-od-id="queue-column">
          {scope === 'user' && filteredRows.length === 0 ? (
            <div className={s.emptyState}>
              <MillionDollarEmpty
                variant="shield"
                tone={search.trim() ? 'amber' : 'neutral'}
                eyebrow={search.trim() ? 'نتیجه جستجو' : 'صف KYC'}
                title={search.trim() ? 'نتیجه‌ای یافت نشد' : 'همه KYC‌ها بررسی شدند'}
                description={
                  search.trim() ? 'عبارت جستجو را تغییر دهید.' : 'درخواست جدیدی در صف نیست.'
                }
              />
            </div>
          ) : scope === 'customer' && filteredCustomerRows.length === 0 ? (
            <div className={s.emptyState}>
              <MillionDollarEmpty
                variant="shield"
                tone={search.trim() ? 'amber' : 'neutral'}
                eyebrow={search.trim() ? 'نتیجه جستجو' : 'صف KYC مشتریان'}
                title={search.trim() ? 'نتیجه‌ای یافت نشد' : 'صف مشتریان خالی است'}
                description={
                  search.trim()
                    ? 'عبارت جستجو را تغییر دهید.'
                    : 'هیچ درخواست تأیید هویتی از مشتریان صرافی ثبت نشده.'
                }
              />
            </div>
          ) : (
            <>
              {/* Queue header */}
              <div className={s.queueColumn__header}>
                <div className={s.queueColumn__left}>
                  <span className={s.queueColumn__count}>
                    {formatFaNumber(
                      scope === 'user' ? filteredRows.length : filteredCustomerRows.length,
                    )}{' '}
                    مورد
                  </span>
                  <span className={s.queueColumn__scope}>
                    {scope === 'user' ? 'کاربران' : 'مشتریان'}
                  </span>
                </div>
                {selected && (
                  <button
                    type="button"
                    className={s.queueColumn__clear}
                    onClick={() => {
                      setSelectedUser(null);
                      setSelectedCustomer(null);
                    }}
                  >
                    <X size={12} />
                    بستن پنل
                  </button>
                )}
              </div>

              {/* Cards */}
              <div
                className={s.queueCards}
                role="listbox"
                aria-label="لیست درخواست‌ها"
                data-od-id="queue-list"
              >
                {scope === 'user'
                  ? filteredRows.map((row, i) => {
                      const urgent = isUrgent(row.submittedAt);
                      const docs = docCount(row);
                      const displayName = row.fullName ?? row.user?.name ?? '—';
                      const isSelected = selectedUser?.id === row.id;

                      return (
                        <button
                          type="button"
                          role="option"
                          aria-selected={isSelected}
                          className={cn(s.queueCard, isSelected && s.queueCardSelected)}
                          style={{ '--card-i': i } as React.CSSProperties}
                          key={row.id}
                          onClick={() => setSelectedUser(row)}
                        >
                          <div className={s.queueCard__track}>
                            <div
                              className={s.queueCard__indicator}
                              style={{
                                background: urgent
                                  ? 'var(--nova-rose, oklch(60% 0.15 25))'
                                  : `oklch(91% 0.04 ${nameHue(displayName)})`,
                              }}
                            />
                          </div>

                          <div className={s.queueCard__body}>
                            <div className={s.queueCard__top}>
                              <Avatar name={displayName} size="sm" />
                              <div className={s.queueCard__identity}>
                                <span className={s.queueCard__name}>{displayName}</span>
                                <span className={s.queueCard__meta}>{row.user?.email ?? '—'}</span>
                              </div>
                            </div>

                            <div className={s.queueCard__bottom}>
                              <div className={s.queueCard__chips}>
                                <span className={cn(s.chip, s.chipDocs)}>
                                  <Fingerprint size={10} aria-hidden />
                                  {formatFaNumber(docs)} مدرک
                                </span>
                                <span className={cn(s.chip, s.chipTime)} dir="ltr">
                                  <Clock size={10} aria-hidden />
                                  {formatRelative(row.submittedAt)}
                                </span>
                              </div>
                              {urgent && <UrgentBadge />}
                            </div>
                          </div>

                          {isSelected && (
                            <div className={s.queueCard__selected} aria-hidden>
                              <div className={s.queueCard__dot} />
                            </div>
                          )}
                        </button>
                      );
                    })
                  : filteredCustomerRows.map((row, i) => {
                      const urgent = isUrgent(row.createdAt);
                      const isSelected = selectedCustomer?.id === row.id;
                      const displayName = row.customerName || '—';

                      return (
                        <button
                          type="button"
                          role="option"
                          aria-selected={isSelected}
                          className={cn(s.queueCard, isSelected && s.queueCardSelected)}
                          style={{ '--card-i': i } as React.CSSProperties}
                          key={row.id}
                          onClick={() => setSelectedCustomer(row)}
                        >
                          <div className={s.queueCard__track}>
                            <div
                              className={s.queueCard__indicator}
                              style={{
                                background: urgent
                                  ? 'var(--nova-rose, oklch(60% 0.15 25))'
                                  : `oklch(91% 0.04 ${nameHue(displayName)})`,
                              }}
                            />
                          </div>

                          <div className={s.queueCard__body}>
                            <div className={s.queueCard__top}>
                              <Avatar name={displayName} size="sm" />
                              <div className={s.queueCard__identity}>
                                <span className={s.queueCard__name}>{displayName}</span>
                                <span className={s.queueCard__meta}>{row.exchangeName}</span>
                              </div>
                            </div>

                            <div className={s.queueCard__bottom}>
                              <div className={s.queueCard__chips}>
                                <span className={cn(s.chip, s.chipDocType)}>
                                  {DOC_TYPE_LABELS[row.docType] ?? row.docType}
                                </span>
                                <span className={cn(s.chip, s.chipLevel)}>
                                  {KYC_LEVEL_LABELS[row.level] ?? row.level}
                                </span>
                                <span className={cn(s.chip, s.chipTime)} dir="ltr">
                                  <Clock size={10} aria-hidden />
                                  {formatRelative(row.createdAt)}
                                </span>
                              </div>
                              {urgent && <UrgentBadge />}
                            </div>
                          </div>

                          {isSelected && (
                            <div className={s.queueCard__selected} aria-hidden>
                              <div className={s.queueCard__dot} />
                            </div>
                          )}
                        </button>
                      );
                    })}
              </div>
            </>
          )}
        </div>

        {/* ── Review Pane (left) ── */}
        <div className={s.reviewPane} data-od-id="review-pane">
          {selected ? (
            <div className={s.reviewContent}>
              <GeometricField density="min" className={s.reviewGeo} />
              {scope === 'user' && selectedUser ? (
                <UserReviewPanel
                  row={selectedUser}
                  onApprove={() => handleUserApprove(selectedUser)}
                  onReject={() => handleUserReject(selectedUser)}
                  isPending={isPending}
                  canApprove={canApprove}
                  canReview={canReview}
                />
              ) : scope === 'customer' && selectedCustomer ? (
                <CustomerReviewPanel
                  row={selectedCustomer}
                  onApprove={() => handleCustomerApprove(selectedCustomer)}
                  onReject={() => handleCustomerReject(selectedCustomer)}
                  isPending={isPending}
                  canApprove={canApprove}
                  canReview={canReview}
                />
              ) : null}
            </div>
          ) : (
            <div className={s.reviewPlaceholder}>
              <GeometricField density="min" className={s.placeholderGeo} />
              <div className={s.reviewPlaceholder__inner}>
                <div className={s.reviewPlaceholder__icon} aria-hidden>
                  <ShieldCheck size={36} strokeWidth={1.25} />
                </div>
                <span className={s.reviewPlaceholder__title}>یک درخواست را انتخاب کنید</span>
                <span className={s.reviewPlaceholder__desc}>
                  {totalQueue > 0
                    ? `${formatFaNumber(totalQueue)} درخواست در صف — برای بررسی یکی را انتخاب کنید.`
                    : 'صف بررسی خالی است.'}
                </span>

                {/* Keyboard shortcuts hint */}
                {showShortcuts && totalQueue > 0 && (
                  <div className={s.shortcutsHint}>
                    <div className={s.shortcutItem}>
                      <kbd className={s.kbd}>
                        <ArrowUp size={10} />
                      </kbd>
                      <kbd className={s.kbd}>
                        <ArrowDown size={10} />
                      </kbd>
                      <span>پیمایش</span>
                    </div>
                    <div className={s.shortcutItem}>
                      <kbd className={s.kbd}>Esc</kbd>
                      <span>بستن</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ═══ Reject Dialog ═══ */}
      <Dialog open={!!rejectTarget} onOpenChange={(o) => !o && setRejectTarget(null)}>
        <DialogContent dir="rtl" className={s.rejectDialog}>
          <DialogHeader>
            <DialogTitle>رد درخواست KYC</DialogTitle>
          </DialogHeader>
          {rejectTarget && (
            <div className={s.rejectProfile}>
              <Avatar name={rejectTarget.name} size="sm" />
              <span className={s.rejectName}>{rejectTarget.name}</span>
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
            autoFocus
          />
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
              onClick={() => rejectTarget?.handler()}
              disabled={isPending}
            >
              {isPending ? 'در حال ارسال…' : 'رد کردن'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── User Review Panel ───────────────────────────────────────────────────

function UserReviewPanel({
  row,
  onApprove,
  onReject,
  isPending,
  canApprove,
  canReview,
}: {
  row: KycRow;
  onApprove: () => void;
  onReject: () => void;
  isPending: boolean;
  canApprove: boolean;
  canReview: boolean;
}) {
  const displayName = row.fullName ?? row.user?.name ?? 'بدون نام';
  const hue = nameHue(displayName);
  const urgent = isUrgent(row.submittedAt);
  const docs: Array<{ src: string; label: string }> = [
    row.selfieUrl ? { src: row.selfieUrl, label: 'سلفی' } : null,
    row.docFrontUrl ? { src: row.docFrontUrl, label: 'روی مدرک' } : null,
    row.docBackUrl ? { src: row.docBackUrl, label: 'پشت مدرک' } : null,
  ].filter(Boolean) as Array<{ src: string; label: string }>;

  return (
    <div className={s.reviewCard}>
      {/* Header */}
      <div className={s.reviewHeader}>
        <div className={s.reviewHeader__main}>
          <div
            className={s.reviewAvatar}
            aria-hidden
            style={{
              background: `oklch(91% 0.04 ${hue})`,
              color: `oklch(36% 0.12 ${hue})`,
            }}
          >
            {initials(displayName)}
          </div>
          <div className={s.reviewTitle}>
            <span className={s.reviewName}>{displayName}</span>
            <span className={s.reviewSub}>
              {row.user?.email}
              {row.user?.phone && ` · ${row.user.phone}`}
            </span>
          </div>
        </div>
        {urgent && <UrgentBadge />}
      </div>

      {/* Meta grid */}
      <div className={s.metaGrid}>
        <div className={s.metaCell}>
          <span className={s.metaCell__label}>تاریخ ارسال</span>
          <span className={s.metaCell__value}>{formatDate(row.submittedAt)}</span>
        </div>
        <div className={s.metaCell}>
          <span className={s.metaCell__label}>مدارک</span>
          <span className={s.metaCell__value}>{formatFaNumber(docs.length)} عدد</span>
        </div>
        <div className={s.metaCell}>
          <span className={s.metaCell__label}>زمان انتظار</span>
          <span className={s.metaCell__value}>{formatRelative(row.submittedAt)}</span>
        </div>
        <div className={s.metaCell}>
          <span className={s.metaCell__label}>وضعیت</span>
          <span className={cn(s.metaCell__value, s.metaPending)}>در انتظار بررسی</span>
        </div>
      </div>

      {/* Documents */}
      {docs.length > 0 && (
        <div className={s.docSection}>
          <div className={s.docSection__title}>
            <Shield size={12} /> مدارک بارگذاری‌شده
          </div>
          <div className={s.docGrid}>
            {docs.map((doc) => (
              <DocThumb key={doc.src} src={doc.src} alt={doc.label} label={doc.label} />
            ))}
          </div>
        </div>
      )}

      {docs.length === 0 && (
        <div className={s.noDocs}>
          <ImageOff size={24} aria-hidden />
          <span>هیچ مدرکی بارگذاری نشده</span>
        </div>
      )}

      {/* Actions — enforce UI: بدون اکشن، دکمه غیرفعال است (سرور هم enforce می‌کند) */}
      <div className={s.reviewActions}>
        <Button
          className={s.btnApprove}
          onClick={onApprove}
          disabled={isPending || docs.length === 0 || !canApprove}
        >
          <CheckCircle2 size={15} aria-hidden />
          تأیید هویت
        </Button>
        <Button
          variant="outline"
          className={s.btnReject}
          onClick={onReject}
          disabled={isPending || !canReview}
        >
          <XCircle size={15} aria-hidden />
          رد کردن
        </Button>
      </div>
    </div>
  );
}

// ─── Customer Review Panel ───────────────────────────────────────────────

function CustomerReviewPanel({
  row,
  onApprove,
  onReject,
  isPending,
  canApprove,
  canReview,
}: {
  row: CustomerKycRow;
  onApprove: () => void;
  onReject: () => void;
  isPending: boolean;
  canApprove: boolean;
  canReview: boolean;
}) {
  const hue = nameHue(row.customerName);
  const urgent = isUrgent(row.createdAt);

  return (
    <div className={s.reviewCard}>
      {/* Header */}
      <div className={s.reviewHeader}>
        <div className={s.reviewHeader__main}>
          <div
            className={s.reviewAvatar}
            aria-hidden
            style={{
              background: `oklch(91% 0.04 ${hue})`,
              color: `oklch(36% 0.12 ${hue})`,
            }}
          >
            {initials(row.customerName)}
          </div>
          <div className={s.reviewTitle}>
            <span className={s.reviewName}>{row.customerName}</span>
            <span className={s.reviewSub}>
              <span dir="ltr">{row.customerPhone}</span>
              {' · '}
              {row.exchangeName}
            </span>
          </div>
        </div>
        {urgent && <UrgentBadge />}
      </div>

      {/* Meta grid */}
      <div className={s.metaGrid}>
        <div className={s.metaCell}>
          <span className={s.metaCell__label}>نوع مدرک</span>
          <span className={s.metaCell__value}>{DOC_TYPE_LABELS[row.docType] ?? row.docType}</span>
        </div>
        <div className={s.metaCell}>
          <span className={s.metaCell__label}>شماره مدرک</span>
          <span className={s.metaCell__value} dir="ltr">
            {row.docNumber ?? '—'}
          </span>
        </div>
        <div className={s.metaCell}>
          <span className={s.metaCell__label}>سطح درخواستی</span>
          <span className={s.metaCell__value}>{KYC_LEVEL_LABELS[row.level] ?? row.level}</span>
        </div>
        <div className={s.metaCell}>
          <span className={s.metaCell__label}>تاریخ ارسال</span>
          <span className={s.metaCell__value}>{formatDate(row.createdAt)}</span>
        </div>
      </div>

      {/* Document */}
      {row.fileUrl ? (
        <div className={s.docSection}>
          <div className={s.docSection__title}>
            <Shield size={12} /> مدرک بارگذاری‌شده
          </div>
          <div className={s.docGrid}>
            <DocThumb src={row.fileUrl} alt={`مدرک ${row.customerName}`} label="تصویر مدرک" />
          </div>
        </div>
      ) : (
        <div className={s.noDocs}>
          <ImageOff size={24} aria-hidden />
          <span>مدرکی بارگذاری نشده</span>
        </div>
      )}

      {/* Actions */}
      <div className={s.reviewActions}>
        <Button className={s.btnApprove} onClick={onApprove} disabled={isPending || !canApprove}>
          <CheckCircle2 size={15} aria-hidden />
          تأیید KYC
        </Button>
        <Button
          variant="outline"
          className={s.btnReject}
          onClick={onReject}
          disabled={isPending || !canReview}
        >
          <XCircle size={15} aria-hidden />
          رد کردن
        </Button>
      </div>
    </div>
  );
}
