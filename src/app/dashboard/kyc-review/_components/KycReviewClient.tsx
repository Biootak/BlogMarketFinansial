'use client';

/**
 * KycReviewClient — Vault Command Center
 *
 * طراحی: Split-pane KYC review — لیست کارت‌های صف (راست) + پنل بررسی مداوم (چپ).
 * Mobile-first: stack عمودی. Desktop: split 55/45.
 *
 * ویژگی‌ها:
 *  - KPI strip مینیمال با accent stripe
 *  - Queue cards با glass + hover elevation + urgent pulse
 *  - Split-pane: انتخاب کارت → پنل بررسی بدون modal
 *  - Document preview با lazy load + fallback
 *  - Approve/Reject inline در پنل — بدون dialog اضافی
 *  - Dual-scope: کاربران پلتفرم + مشتریان صرافی‌ها
 *  - Search + filter inline
 *  - Keyboard nav: arrow keys روی کارت‌ها، Enter برای باز کردن، Esc برای بستن
 *  - Optimistic UI + rollback
 *  - Client-side rate-limit guard
 */

import { reviewCustomerKycRecord } from '@/actions/customer-portal';
import { reviewKycRecord } from '@/actions/kyc-onboarding';
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
  Building2,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  Fingerprint,
  ImageOff,
  Shield,
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

// ─── DocImage with fallback ────────────────────────────────────────────────────

function DocImage({ src, alt, label }: { src: string; alt: string; label: string }) {
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  if (error) {
    return (
      <div className={s.imgFallback}>
        <ImageOff size={24} aria-hidden />
        <span>{label} — بارگذاری ناموفق</span>
      </div>
    );
  }

  return (
    <div className={s.docImgWrap}>
      {!loaded && (
        <div className={s.docImgSkeleton}>
          <FileText size={20} aria-hidden />
        </div>
      )}
      <Image
        src={src}
        alt={alt}
        fill
        className={cn(s.docImg, loaded && s.docImgLoaded)}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
        unoptimized
        sizes="(max-width: 768px) 80vw, 400px"
      />
      <div className={s.docImgOverlay}>
        <span className={s.docImgLabel}>{label}</span>
        <button type="button" className={s.docZoomBtn} title="بزرگنمایی" aria-label="بزرگنمایی">
          <Eye size={14} />
        </button>
      </div>
    </div>
  );
}

// ─── Avatar ────────────────────────────────────────────────────────────────────

function Avatar({ name, size = 'sm' }: { name: string | null; size?: 'sm' | 'md' | 'lg' }) {
  const hue = nameHue(name);
  const sizeMap = { sm: s.avatarSm, md: s.avatarMd, lg: s.avatarLg };
  return (
    <div
      className={cn(s.avatar, sizeMap[size])}
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

// ─── UrgentBadge ───────────────────────────────────────────────────────────────

function UrgentBadge() {
  return (
    <span className={s.urgentBadge}>
      <span className={s.urgentDot} aria-hidden />
      فوری
    </span>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export function KycReviewClient({ records: initial, customerRecords: initialCustomer }: Props) {
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

  // ── Filtered rows ────────────────────────────────────────────────────────
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

  // ── Derived counts ───────────────────────────────────────────────────────
  const withDocs = useMemo(
    () => rows.filter((r) => r.docFrontUrl || r.docBackUrl || r.selfieUrl).length,
    [rows],
  );
  const withoutDocs = useMemo(
    () => rows.filter((r) => !r.docFrontUrl && !r.docBackUrl && !r.selfieUrl).length,
    [rows],
  );
  const urgentCount = useMemo(() => rows.filter((r) => isUrgent(r.submittedAt)).length, [rows]);
  const customerUrgentCount = useMemo(
    () => customerRows.filter((r) => isUrgent(r.createdAt)).length,
    [customerRows],
  );

  // ── Clear selection when switching scope ─────────────────────────────────
  const handleScopeChange = useCallback((next: Scope) => {
    setScope(next);
    setSelectedUser(null);
    setSelectedCustomer(null);
    setSearch('');
  }, []);

  // ── User KYC Actions ─────────────────────────────────────────────────────

  const handleUserApprove = useCallback(
    (row: KycRow) => {
      setRows((prev) => prev.filter((r) => r.id !== row.id));
      if (selectedUser?.id === row.id) setSelectedUser(null);
      setError(null);
      setLastAction(null);

      startTransition(async () => {
        const res = await reviewKycRecord({ userId: row.userId, approved: true });
        if (!res.success) {
          setRows((prev) =>
            [row, ...prev].sort(
              (a, b) =>
                new Date(a.submittedAt ?? 0).getTime() - new Date(b.submittedAt ?? 0).getTime(),
            ),
          );
          setError(res.error.message);
          return;
        }
        setLastAction(`هویت «${row.fullName ?? row.user?.name ?? '—'}» تأیید شد`);
      });
    },
    [selectedUser],
  );

  const handleUserReject = useCallback(
    (row: KycRow) => {
      setRejectTarget({
        name: row.fullName ?? row.user?.name ?? '—',
        handler: () => {
          if (actionLocked) return;
          setActionCooldown(1);
          const reason = rejectReason.trim() || 'اطلاعات ناقص یا نادرست';
          const name = row.fullName ?? row.user?.name ?? '—';

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
              setRows((prev) =>
                [row, ...prev].sort(
                  (a, b) =>
                    new Date(a.submittedAt ?? 0).getTime() - new Date(b.submittedAt ?? 0).getTime(),
                ),
              );
              setError(res.error.message);
              return;
            }
            setLastAction(`درخواست «${name}» رد شد`);
          });
        },
      });
    },
    [actionLocked, rejectReason, selectedUser],
  );

  // ── Customer KYC Actions ────────────────────────────────────────────────

  const handleCustomerApprove = useCallback(
    (row: CustomerKycRow) => {
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
        setLastAction(`KYC مشتری «${row.customerName}» تأیید شد`);
      });
    },
    [selectedCustomer],
  );

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

  // ── Keyboard navigation ─────────────────────────────────────────────────
  const activeList = scope === 'user' ? filteredRows : filteredCustomerRows;
  const activeIdx = selected
    ? activeList.findIndex((r) => r.id === selected.id)
    : -1;

  useEffect(() => {
    if (!selected) return;
    const handler = (e: KeyboardEvent<Document>) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const next = activeList[activeIdx + 1];
        if (next) {
          scope === 'user' ? setSelectedUser(next as KycRow) : setSelectedCustomer(next as CustomerKycRow);
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prev = activeList[activeIdx - 1];
        if (prev) {
          scope === 'user' ? setSelectedUser(prev as KycRow) : setSelectedCustomer(prev as CustomerKycRow);
        }
      } else if (e.key === 'Escape') {
        scope === 'user' ? setSelectedUser(null) : setSelectedCustomer(null);
      }
    };
    document.addEventListener('keydown' as any, handler as any);
    return () => document.removeEventListener('keydown' as any, handler as any);
  }, [selected, activeList, activeIdx, scope]);

  // ── KPI config ───────────────────────────────────────────────────────────
  const kpiItems = scope === 'user'
    ? [
        {
          label: 'در انتظار',
          value: rows.length,
          icon: <Users size={14} aria-hidden />,
          accent: 'var(--nova-amber, oklch(60% .16 70))',
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
          accent: 'var(--nova-rose, oklch(55% .18 25))',
        },
      ]
    : [
        {
          label: 'در انتظار',
          value: customerRows.length,
          icon: <Building2 size={14} aria-hidden />,
          accent: 'var(--nova-amber, oklch(60% .16 70))',
        },
        {
          label: 'فوری',
          value: customerUrgentCount,
          icon: <Clock size={14} aria-hidden />,
          accent: 'var(--nova-rose, oklch(55% .18 25))',
        },
      ];

  const totalQueue = rows.length + customerRows.length;

  return (
    <div className={s.root}>
      {/* ═══ Header ═══ */}
      <PageHeader
        variant="compact"
        title="مرکز بررسی احراز هویت"
        description={`${formatFaNumber(totalQueue)} درخواست در صف بررسی`}
        breadcrumb={[{ href: '/dashboard', label: 'داشبورد' }, { label: 'بررسی KYC' }]}
        eyebrow="احراز هویت"
        icon="shield-check"
        accent="violet"
      />

      {/* ═══ Controls Bar (scope tabs + search + KPI) ═══ */}
      <div className={s.controlsBar}>
        <div className={s.controlsRight}>
          {/* Scope tabs */}
          <div className={s.scopeTabs} role="tablist" aria-label="نوع KYC">
            <button
              type="button"
              role="tab"
              aria-selected={scope === 'user'}
              className={cn(s.scopeTab, scope === 'user' && s.scopeTabActive)}
              onClick={() => handleScopeChange('user')}
            >
              <User size={13} aria-hidden />
              <span>کاربران پلتفرم</span>
              {rows.length > 0 && (
                <span className={s.scopeTabCount}>{formatFaNumber(rows.length)}</span>
              )}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={scope === 'customer'}
              className={cn(s.scopeTab, scope === 'customer' && s.scopeTabActive)}
              onClick={() => handleScopeChange('customer')}
            >
              <Building2 size={13} aria-hidden />
              <span>مشتریان صرافی‌ها</span>
              {customerRows.length > 0 && (
                <span className={s.scopeTabCount}>{formatFaNumber(customerRows.length)}</span>
              )}
            </button>
          </div>

          {/* KPI strip */}
          <div className={s.kpiStrip}>
            {kpiItems.map((item, i) => (
              <div
                key={item.label}
                className={s.kpiCard}
                style={
                  { '--kpi-accent': item.accent, '--kpi-delay': `${i * 50}ms` } as React.CSSProperties
                }
              >
                <span className={s.kpiIcon}>{item.icon}</span>
                <span className={s.kpiValue}>{formatFaNumber(item.value)}</span>
                <span className={s.kpiLabel}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className={s.controlsLeft}>
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="جستجوی نام، ایمیل یا شماره…"
          />
        </div>
      </div>

      {/* ═══ Status banners ═══ */}
      {lastAction && (
        <div className={s.bannerSuccess} role="status" aria-live="polite">
          <CheckCircle2 size={14} aria-hidden />
          {lastAction}
        </div>
      )}
      {error && (
        <div className={s.bannerError} role="alert">
          <AlertCircle size={14} aria-hidden />
          {error}
        </div>
      )}

      {/* ═══ Split Pane ═══ */}
      <div className={s.splitPane}>
        {/* ── Queue List (right) ── */}
        <div className={s.queuePane}>
          {scope === 'user' && filteredRows.length === 0 ? (
            <div className={s.emptyState}>
              <MillionDollarEmpty
                variant="shield"
                tone={search.trim() ? 'amber' : 'neutral'}
                eyebrow={search.trim() ? 'نتیجه جستجو' : 'صف KYC'}
                title={search.trim() ? 'نتیجه‌ای یافت نشد' : 'همه KYC‌ها بررسی شدند'}
                description={
                  search.trim()
                    ? 'عبارت جستجو را تغییر دهید.'
                    : 'درخواست جدیدی در صف نیست.'
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
              <div className={s.queueHeader}>
                <span className={s.queueCount}>
                  {formatFaNumber(scope === 'user' ? filteredRows.length : filteredCustomerRows.length)}{' '}
                  مورد
                </span>
                {selected && (
                  <button
                    type="button"
                    className={s.clearSelectBtn}
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
              <div className={s.cardList} role="listbox" aria-label="لیست درخواست‌ها">
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
                          {/* Accent stripe */}
                          <div
                            className={s.cardStripe}
                            style={{
                              background: urgent
                                ? 'var(--nova-rose, oklch(55% .18 25))'
                                : `oklch(91% 0.04 ${nameHue(displayName)})`,
                            }}
                          />

                          <div className={s.cardBody}>
                            <div className={s.cardTop}>
                              <Avatar name={displayName} size="sm" />
                              <div className={s.cardIdentity}>
                                <span className={s.cardName}>{displayName}</span>
                                <span className={s.cardMeta}>
                                  {row.user?.email ?? '—'}
                                </span>
                              </div>
                            </div>

                            <div className={s.cardBottom}>
                              <div className={s.cardChips}>
                                <span className={s.chipDocs}>
                                  <Fingerprint size={10} aria-hidden />
                                  {formatFaNumber(docs)} مدرک
                                </span>
                                <span className={s.chipTime} dir="ltr">
                                  <Clock size={10} aria-hidden />
                                  {formatRelative(row.submittedAt)}
                                </span>
                              </div>
                              {urgent && <UrgentBadge />}
                            </div>
                          </div>

                          {isSelected && (
                            <div className={s.cardSelectedIndicator} aria-hidden>
                              <div className={s.cardSelectedDot} />
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
                          <div
                            className={s.cardStripe}
                            style={{
                              background: urgent
                                ? 'var(--nova-rose, oklch(55% .18 25))'
                                : `oklch(91% 0.04 ${nameHue(displayName)})`,
                            }}
                          />

                          <div className={s.cardBody}>
                            <div className={s.cardTop}>
                              <Avatar name={displayName} size="sm" />
                              <div className={s.cardIdentity}>
                                <span className={s.cardName}>{displayName}</span>
                                <span className={s.cardMeta}>{row.exchangeName}</span>
                              </div>
                            </div>

                            <div className={s.cardBottom}>
                              <div className={s.cardChips}>
                                <span className={s.chipDocType}>
                                  {DOC_TYPE_LABELS[row.docType] ?? row.docType}
                                </span>
                                <span className={s.chipLevel}>
                                  {KYC_LEVEL_LABELS[row.level] ?? row.level}
                                </span>
                                <span className={s.chipTime} dir="ltr">
                                  <Clock size={10} aria-hidden />
                                  {formatRelative(row.createdAt)}
                                </span>
                              </div>
                              {urgent && <UrgentBadge />}
                            </div>
                          </div>

                          {isSelected && (
                            <div className={s.cardSelectedIndicator} aria-hidden>
                              <div className={s.cardSelectedDot} />
                            </div>
                          )}
                        </button>
                      );
                    })}
              </div>
            </>
          )}
        </div>

        {/* ── Review Panel (left) ── */}
        <div className={s.reviewPane}>
          {selected ? (
            <div className={s.reviewContent}>
              {scope === 'user' && selectedUser ? (
                <UserReviewPanel
                  row={selectedUser}
                  onApprove={() => handleUserApprove(selectedUser)}
                  onReject={() => handleUserReject(selectedUser)}
                  isPending={isPending}
                />
              ) : scope === 'customer' && selectedCustomer ? (
                <CustomerReviewPanel
                  row={selectedCustomer}
                  onApprove={() => handleCustomerApprove(selectedCustomer)}
                  onReject={() => handleCustomerReject(selectedCustomer)}
                  isPending={isPending}
                />
              ) : null}
            </div>
          ) : (
            <div className={s.reviewPlaceholder}>
              <div className={s.placeholderIcon} aria-hidden>
                <Fingerprint size={32} />
              </div>
              <span className={s.placeholderTitle}>یک درخواست را انتخاب کنید</span>
              <span className={s.placeholderDesc}>
                {totalQueue > 0
                  ? `${formatFaNumber(totalQueue)} درخواست در صف — برای بررسی یکی را انتخاب کنید.`
                  : 'صف بررسی خالی است.'}
              </span>
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
            <Button variant="destructive" onClick={() => rejectTarget?.handler()} disabled={isPending}>
              {isPending ? 'در حال ارسال…' : 'رد کردن'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── User Review Panel ─────────────────────────────────────────────────────────

function UserReviewPanel({
  row,
  onApprove,
  onReject,
  isPending,
}: {
  row: KycRow;
  onApprove: () => void;
  onReject: () => void;
  isPending: boolean;
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
    <div className={s.reviewInner}>
      {/* Header */}
      <div className={s.reviewHeader}>
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
        <div className={s.reviewTitleGroup}>
          <span className={s.reviewName}>{displayName}</span>
          <span className={s.reviewMeta}>
            {row.user?.email}
            {row.user?.phone && ` · ${row.user.phone}`}
          </span>
        </div>
        {urgent && <UrgentBadge />}
      </div>

      {/* Meta grid */}
      <div className={s.metaGrid}>
        <div className={s.metaItem}>
          <span className={s.metaLabel}>تاریخ ارسال</span>
          <span className={s.metaValue}>{formatDate(row.submittedAt)}</span>
        </div>
        <div className={s.metaItem}>
          <span className={s.metaLabel}>مدارک</span>
          <span className={s.metaValue}>{formatFaNumber(docs.length)} عدد</span>
        </div>
        <div className={s.metaItem}>
          <span className={s.metaLabel}>زمان انتظار</span>
          <span className={s.metaValue}>{formatRelative(row.submittedAt)}</span>
        </div>
      </div>

      {/* Documents */}
      {docs.length === 0 ? (
        <div className={s.noDocs}>
          <ImageOff size={24} aria-hidden />
          <span>هیچ مدرکی بارگذاری نشده</span>
        </div>
      ) : (
        <div className={s.docGrid}>
          {docs.map((doc) => (
            <DocImage key={doc.src} src={doc.src} alt={doc.label} label={doc.label} />
          ))}
        </div>
      )}

      {/* Actions */}
      <div className={s.reviewActions}>
        <Button
          className={s.approveBtn}
          onClick={onApprove}
          disabled={isPending || docs.length === 0}
        >
          <CheckCircle2 size={15} aria-hidden />
          تأیید هویت
        </Button>
        <Button
          variant="outline"
          className={s.rejectBtn}
          onClick={onReject}
          disabled={isPending}
        >
          <XCircle size={15} aria-hidden />
          رد کردن
        </Button>
      </div>
    </div>
  );
}

// ─── Customer Review Panel ─────────────────────────────────────────────────────

function CustomerReviewPanel({
  row,
  onApprove,
  onReject,
  isPending,
}: {
  row: CustomerKycRow;
  onApprove: () => void;
  onReject: () => void;
  isPending: boolean;
}) {
  const hue = nameHue(row.customerName);
  const urgent = isUrgent(row.createdAt);

  return (
    <div className={s.reviewInner}>
      {/* Header */}
      <div className={s.reviewHeader}>
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
        <div className={s.reviewTitleGroup}>
          <span className={s.reviewName}>{row.customerName}</span>
          <span className={s.reviewMeta}>
            <span dir="ltr">{row.customerPhone}</span>
            {' · '}
            {row.exchangeName}
          </span>
        </div>
        {urgent && <UrgentBadge />}
      </div>

      {/* Meta grid */}
      <div className={s.metaGrid}>
        <div className={s.metaItem}>
          <span className={s.metaLabel}>نوع مدرک</span>
          <span className={s.metaValue}>
            {DOC_TYPE_LABELS[row.docType] ?? row.docType}
          </span>
        </div>
        <div className={s.metaItem}>
          <span className={s.metaLabel}>شماره مدرک</span>
          <span className={s.metaValue} dir="ltr">
            {row.docNumber ?? '—'}
          </span>
        </div>
        <div className={s.metaItem}>
          <span className={s.metaLabel}>سطح درخواستی</span>
          <span className={s.metaValue}>
            {KYC_LEVEL_LABELS[row.level] ?? row.level}
          </span>
        </div>
        <div className={s.metaItem}>
          <span className={s.metaLabel}>تاریخ ارسال</span>
          <span className={s.metaValue}>{formatDate(row.createdAt)}</span>
        </div>
      </div>

      {/* Document */}
      {row.fileUrl ? (
        <div className={s.docGrid}>
          <DocImage src={row.fileUrl} alt={`مدرک ${row.customerName}`} label="تصویر مدرک" />
        </div>
      ) : (
        <div className={s.noDocs}>
          <ImageOff size={24} aria-hidden />
          <span>مدرکی بارگذاری نشده</span>
        </div>
      )}

      {/* Actions */}
      <div className={s.reviewActions}>
        <Button
          className={s.approveBtn}
          onClick={onApprove}
          disabled={isPending}
        >
          <CheckCircle2 size={15} aria-hidden />
          تأیید KYC
        </Button>
        <Button
          variant="outline"
          className={s.rejectBtn}
          onClick={onReject}
          disabled={isPending}
        >
          <XCircle size={15} aria-hidden />
          رد کردن
        </Button>
      </div>
    </div>
  );
}