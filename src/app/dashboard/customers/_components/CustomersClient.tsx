'use client';

/**
 * CustomersClient — 2026 Million-Dollar Customer Management
 *
 * طراحی: Mercury × Attio × Ramp — High-density fintech admin
 *
 * ویژگی‌ها:
 *  - KPI strip با StatCard primitive + sparkline زنده (7 روز)
 *  - Sticky glass toolbar (dash-toolbar--editorial + IntersectionObserver sentinel)
 *  - جدول با risk score gauge + KYC badge + status chip + stagger row animation
 *  - Detail Sheet با depth layer + stagger dl rows + action buttons
 *  - Form افزودن مشتری با FormField primitive
 *  - Pagination حرفه‌ای + page-jump input
 *  - EmptyState برای هر سناریو
 */

import {
  type CustomerRow,
  createCustomer,
  setCustomerStatus,
} from '@/actions/exchange-customers';
import type { ExchangeRow } from '@/actions/exchanges';
import {
  ConfirmDialog,
  EmptyState,
  FormField,
  MillionDollarEmpty,
  PageHeader,
} from '@/components/Dashboard/primitives';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/components/ui/use-toast';
import {
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Filter,
  Lock,
  Plus,
  Search,
  ShieldCheck,
  ShieldOff,
  Unlock,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  type KeyboardEvent,
  useCallback,
  useDeferredValue,
  useEffect,
  useRef,
  useState,
  useTransition,
} from 'react';
import s from './CustomersClient.module.css';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  customers: CustomerRow[];
  total: number;
  exchanges: ExchangeRow[];
  currentExchangeId: string;
  currentQuery: string;
  currentStatus: string;
  currentPage: number;
  pageSize: number;
  currentUserRole: string;
}

// ─── Label Maps ────────────────────────────────────────────────────────────────

const STATUS_FA: Record<string, string> = {
  PROSPECT: 'مشتری احتمالی',
  ACTIVE: 'فعال',
  FROZEN: 'مسدود',
  CLOSED: 'بسته',
};

const KYC_FA: Record<string, string> = {
  NONE: 'بدون احراز',
  LEVEL_1: 'سطح ۱',
  LEVEL_2: 'سطح ۲',
  LEVEL_3: 'سطح ۳',
};

const KYC_STATUS_FA: Record<string, string> = {
  NOT_STARTED: 'شروع نشده',
  PENDING: 'در انتظار',
  APPROVED: 'تأیید شده',
  REJECTED: 'رد شده',
  EXPIRED: 'منقضی',
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

function riskLabel(score: number): string {
  if (score >= 70) return 'پرریسک';
  if (score >= 40) return 'متوسط';
  return 'کم‌ریسک';
}

function riskColorClass(score: number): string {
  if (score >= 70) return s.riskHigh;
  if (score >= 40) return s.riskMed;
  return s.riskLow;
}

function formatDate(d: Date | string): string {
  return new Date(d).toLocaleDateString('fa-IR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function fmtLimit(val: string | null): string {
  if (!val) return '—';
  return `${new Intl.NumberFormat('fa-IR').format(Number(val))} ؋`;
}

/** آواتار رنگی از نام — deterministic از charCode */
function avatarHue(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = ((h << 5) - h + name.charCodeAt(i)) & 0xffffffff;
  }
  return Math.abs(h) % 360;
}

// ─── Mini Sparkline ────────────────────────────────────────────────────────────

function MiniSparkline({
  customers,
  filter,
  color,
}: {
  customers: CustomerRow[];
  filter: (c: CustomerRow) => boolean;
  color: string;
}) {
  const now = Date.now();
  const DAY = 86_400_000;
  const buckets = Array.from({ length: 7 }, (_, i) => {
    const start = now - (6 - i) * DAY;
    const end = start + DAY;
    return customers.filter(
      (c) =>
        filter(c) &&
        new Date(c.createdAt).getTime() >= start &&
        new Date(c.createdAt).getTime() < end,
    ).length;
  });

  const W = 64;
  const H = 22;
  const max = Math.max(...buckets, 1);
  const pts = buckets.map((v, i) => {
    const x = (i / 6) * W;
    const y = H - (v / max) * H;
    return [x, y] as [number, number];
  });
  const pointsStr = pts.map(([x, y]) => `${x},${y}`).join(' ');
  const last = pts[pts.length - 1];

  return (
    <svg
      viewBox={`-1 -1 ${W + 2} ${H + 2}`}
      className={s.kpiSparkline}
      aria-hidden="true"
      focusable="false"
      style={{ '--spark-color': color } as React.CSSProperties}
    >
      <title>sparkline</title>
      <linearGradient id={`sg-${color.replace(/[^a-z0-9]/gi, '')}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="var(--spark-color)" stopOpacity="0.18" />
        <stop offset="100%" stopColor="var(--spark-color)" stopOpacity="0" />
      </linearGradient>
      <polygon
        points={[
          `0,${H}`,
          ...pts.map(([x, y]) => `${x},${y}`),
          `${W},${H}`,
        ].join(' ')}
        fill={`url(#sg-${color.replace(/[^a-z0-9]/gi, '')})`}
      />
      <polyline
        points={pointsStr}
        fill="none"
        stroke="var(--spark-color)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.75"
      />
      {last && (
        <circle cx={last[0]} cy={last[1]} r="2.5" fill="var(--spark-color)" opacity="0.9" />
      )}
    </svg>
  );
}

// ─── Risk Arc SVG ──────────────────────────────────────────────────────────────

function RiskArc({ score }: { score: number }) {
  const R = 12;
  const circ = Math.PI * R;
  const pct = Math.max(0, Math.min(100, score)) / 100;
  const dash = pct * circ;
  const strokeColor =
    score >= 70
      ? 'var(--nova-rose, oklch(55% 0.18 25))'
      : score >= 40
        ? 'var(--nova-amber, oklch(60% 0.16 70))'
        : 'var(--nova-emerald, oklch(50% 0.14 145))';

  return (
    <svg width="30" height="18" viewBox="0 0 30 18" aria-hidden="true">
      <path
        d="M3,16 A12,12 0 0,1 27,16"
        fill="none"
        stroke="var(--ds-border-subtle)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M3,16 A12,12 0 0,1 27,16"
        fill="none"
        stroke={strokeColor}
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circ}`}
      />
      <text
        x="15"
        y="15"
        textAnchor="middle"
        fontSize="6"
        fill={strokeColor}
        fontWeight="700"
        fontFamily="inherit"
      >
        {score}
      </text>
    </svg>
  );
}

// ─── Status Dot ────────────────────────────────────────────────────────────────

function StatusDot({ status }: { status: string }) {
  const cls =
    status === 'ACTIVE'
      ? s.dotActive
      : status === 'FROZEN'
        ? s.dotFrozen
        : status === 'CLOSED'
          ? s.dotClosed
          : s.dotProspect;
  return <span className={`${s.statusDot} ${cls}`} aria-hidden />;
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function CustomersClient({
  customers,
  total,
  exchanges,
  currentExchangeId,
  currentQuery,
  currentStatus,
  currentPage,
  pageSize,
  currentUserRole: _currentUserRole,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const noExchange = exchanges.length === 0;

  // ── Search debounce ────────────────────────────────────────────────────────
  const [searchInput, setSearchInput] = useState(currentQuery);
  const deferredSearch = useDeferredValue(searchInput);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const navigate = useCallback(
    (overrides: Record<string, string>) => {
      const p = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(overrides)) {
        if (v) p.set(k, v);
        else p.delete(k);
      }
      startTransition(() => router.push(`/dashboard/customers?${p.toString()}`));
    },
    [searchParams, router],
  );

  useEffect(() => {
    if (deferredSearch === currentQuery) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => navigate({ q: deferredSearch, page: '1' }), 340);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [deferredSearch, currentQuery, navigate]);

  // ── Scroll sentinel for toolbar ────────────────────────────────────────────
  const sentinelRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    const toolbar = toolbarRef.current;
    if (!sentinel || !toolbar) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        toolbar.dataset.scrolled = entry.isIntersecting ? 'false' : 'true';
      },
      { threshold: 0 },
    );
    io.observe(sentinel);
    return () => io.disconnect();
  }, []);

  // ── Detail Sheet ──────────────────────────────────────────────────────────
  const [selected, setSelected] = useState<CustomerRow | null>(null);
  const [sheetMode, setSheetMode] = useState<'detail' | 'add'>('detail');

  const openDetail = useCallback((c: CustomerRow) => {
    setSelected(c);
    setSheetMode('detail');
  }, []);

  const openAdd = useCallback(() => {
    setSelected(null);
    setSheetMode('add');
  }, []);

  // ── Status actions ────────────────────────────────────────────────────────
  const [statusPending, startStatusTransition] = useTransition();
  const [confirmTarget, setConfirmTarget] = useState<{
    customer: CustomerRow;
    newStatus: CustomerRow['status'];
  } | null>(null);

  const handleStatusChange = useCallback(
    (customer: CustomerRow, newStatus: 'PROSPECT' | 'ACTIVE' | 'FROZEN' | 'CLOSED') => {
      setConfirmTarget({ customer, newStatus });
    },
    [],
  );

  const doStatusChange = useCallback(() => {
    if (!confirmTarget) return;
    startStatusTransition(async () => {
      const result = await setCustomerStatus(
        confirmTarget.customer.exchangeId,
        confirmTarget.customer.id,
        confirmTarget.newStatus as 'PROSPECT' | 'ACTIVE' | 'FROZEN' | 'CLOSED',
      );
      if (result.success) {
        toast({ title: 'وضعیت به‌روز شد' });
        setConfirmTarget(null);
        if (selected?.id === confirmTarget.customer.id) setSelected(null);
        router.refresh();
      } else if (!result.success) {
        toast({ title: 'خطا', description: result.error.message, variant: 'destructive' });
        setConfirmTarget(null);
      }
    });
  }, [confirmTarget, toast, router, selected]);

  // ── Add customer form ─────────────────────────────────────────────────────
  const emptyForm = {
    fullName: '',
    fatherName: '',
    nationalId: '',
    phone: '',
    email: '',
    city: '',
    address: '',
    notes: '',
  };
  const [formState, setFormState] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState<Partial<typeof emptyForm>>({});
  const [addPending, startAddTransition] = useTransition();

  const validateForm = useCallback(() => {
    const errs: Partial<typeof emptyForm> = {};
    if (!formState.fullName.trim()) errs.fullName = 'نام الزامی است';
    if (!formState.phone.trim()) errs.phone = 'شماره تماس الزامی است';
    return errs;
  }, [formState]);

  const handleAdd = useCallback(() => {
    if (!currentExchangeId) return;
    const errs = validateForm();
    if (Object.keys(errs).length) {
      setFormErrors(errs);
      return;
    }
    setFormErrors({});
    startAddTransition(async () => {
      const result = await createCustomer(currentExchangeId, {
        fullName: formState.fullName,
        fatherName: formState.fatherName || null,
        nationalId: formState.nationalId || null,
        phone: formState.phone,
        email: formState.email || null,
        city: formState.city || null,
        address: formState.address || null,
        notes: formState.notes || null,
      });
      if (result.success) {
        toast({ title: 'مشتری اضافه شد', description: formState.fullName });
        setSheetMode('detail');
        setFormState(emptyForm);
        router.refresh();
      } else {
        toast({ title: 'خطا', description: result.error.message, variant: 'destructive' });
      }
    });
  }, [currentExchangeId, formState, toast, router, validateForm, emptyForm]);

  // ── Page Jump ─────────────────────────────────────────────────────────────
  const [pageInput, setPageInput] = useState('');
  const totalPages = Math.ceil(total / pageSize);

  const handlePageJump = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key !== 'Enter') return;
      const n = parseInt(pageInput, 10);
      if (!Number.isNaN(n) && n >= 1 && n <= totalPages) {
        navigate({ page: String(n) });
        setPageInput('');
      }
    },
    [pageInput, totalPages, navigate],
  );

  // ── KPI values ────────────────────────────────────────────────────────────
  const kpiActive = customers.filter((c) => c.status === 'ACTIVE').length;
  const kpiFrozen = customers.filter((c) => c.status === 'FROZEN').length;
  const kpiKyc = customers.filter((c) => c.kycStatus === 'PENDING').length;

  // ── Toolbar filter/search slots ───────────────────────────────────────────
  const toolbarFilters = (
    <>
      {exchanges.length > 1 && (
        <Select
          value={currentExchangeId}
          onValueChange={(v) => navigate({ exchange: v, page: '1' })}
        >
          <SelectTrigger className={s.filterSelect} aria-label="انتخاب صرافی">
            <Building2 size={13} className={s.selectIcon} aria-hidden />
            <SelectValue placeholder="صرافی…" />
          </SelectTrigger>
          <SelectContent>
            {exchanges.map((ex) => (
              <SelectItem key={ex.id} value={ex.id}>
                {ex.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <Select
        value={currentStatus}
        onValueChange={(v) => navigate({ status: v, page: '1' })}
      >
        <SelectTrigger className={s.filterSelect} aria-label="فیلتر وضعیت">
          <Filter size={13} className={s.selectIcon} aria-hidden />
          <SelectValue placeholder="وضعیت…" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">همه وضعیت‌ها</SelectItem>
          {Object.entries(STATUS_FA).map(([k, v]) => (
            <SelectItem key={k} value={k}>
              {v}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  );

  const toolbarSearch = (
    <div className={s.searchWrap}>
      <Search size={14} className={s.searchIcon} aria-hidden />
      <input
        ref={searchRef}
        className={s.searchInput}
        placeholder="جستجو نام، تلفن، شهر…"
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
        aria-label="جستجو مشتری"
      />
      {searchInput && (
        <button
          type="button"
          className={s.searchClear}
          onClick={() => {
            setSearchInput('');
            navigate({ q: '', page: '1' });
            searchRef.current?.focus();
          }}
          aria-label="پاک کردن جستجو"
        >
          <X size={12} aria-hidden />
        </button>
      )}
    </div>
  );

  const toolbarActions = (
    <>
      {isPending && (
        <span className={s.loadingDot} aria-label="در حال بارگذاری">
          <span className={s.dot} />
          <span className={s.dot} />
          <span className={s.dot} />
        </span>
      )}
      {total > 0 && (
        <span className={s.totalBadge} aria-live="polite">
          {new Intl.NumberFormat('fa-IR').format(total)} مشتری
        </span>
      )}
      <Button size="sm" onClick={openAdd}>
        <Plus size={13} aria-hidden /> جدید
      </Button>
    </>
  );

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <TooltipProvider>
      <div className={s.root}>
        {/* ── Scroll sentinel (must come before sticky toolbar) ────────── */}
        <div ref={sentinelRef} className={s.sentinel} aria-hidden />

        {/* ── Header ────────────────────────────────────────────────────── */}
        <PageHeader
          variant="compact"
          breadcrumb={[{ label: 'داشبورد', href: '/dashboard' }, { label: 'مشتریان' }]}
          title="مشتریان صرافی"
          description="مدیریت مشتریان، KYC، تراکنش‌ها و وضعیت حساب"
          eyebrow="فین‌تک"
          icon="users"
          accent="indigo"
          actions={
            currentExchangeId ? (
              <Button size="sm" onClick={openAdd}>
                <Plus size={14} aria-hidden /> افزودن مشتری
              </Button>
            ) : null
          }
        />

        {/* ── No-exchange guard ────────────────────────────────────────── */}
        {noExchange ? (
          <MillionDollarEmpty
            variant="card"
            tone="amber"
            eyebrow="پیش‌نیاز"
            title="برای مدیریت مشتریان، ابتدا یک صرافی ثبت کنید"
            description="صرافی شما باید توسط ادمین تأیید شود تا بتوانید مشتری اضافه کنید."
            primaryAction={
              <Button asChild>
                <a href="/dashboard/exchanges">رفتن به مدیریت صرافی‌ها</a>
              </Button>
            }
          />
        ) : (
          <>
            {/* ── KPI Strip ────────────────────────────────────────────── */}
            <div className={s.kpiStrip} aria-label="آمار مشتریان">
              {(
                [
                  {
                    label: 'کل مشتریان',
                    value: total,
                    icon: <Users size={16} aria-hidden />,
                    filter: () => true,
                    color: 'var(--ds-brand-500)',
                    accent: 'var(--ds-brand-500)',
                  },
                  {
                    label: 'فعال',
                    value: kpiActive,
                    icon: <UserCheck size={16} aria-hidden />,
                    filter: (c: CustomerRow) => c.status === 'ACTIVE',
                    color: 'var(--nova-emerald, oklch(50% 0.14 145))',
                    accent: 'var(--nova-emerald)',
                  },
                  {
                    label: 'مسدود',
                    value: kpiFrozen,
                    icon: <Lock size={16} aria-hidden />,
                    filter: (c: CustomerRow) => c.status === 'FROZEN',
                    color: 'var(--nova-rose, oklch(55% 0.18 25))',
                    accent: 'var(--nova-rose)',
                  },
                  {
                    label: 'KYC در انتظار',
                    value: kpiKyc,
                    icon: <ShieldCheck size={16} aria-hidden />,
                    filter: (c: CustomerRow) => c.kycStatus === 'PENDING',
                    color: 'var(--nova-amber, oklch(60% 0.16 70))',
                    accent: 'var(--nova-amber)',
                  },
                ] as const
              ).map((item, i) => (
                <div
                  key={item.label}
                  className={s.kpiCard}
                  style={{ '--kpi-accent': item.accent, '--kpi-delay': `${i * 60}ms` } as React.CSSProperties}
                >
                  {/* top row: icon + sparkline */}
                  <div className={s.kpiTop}>
                    <span className={s.kpiIcon}>{item.icon}</span>
                    <MiniSparkline
                      customers={customers}
                      filter={item.filter as (c: CustomerRow) => boolean}
                      color={item.color}
                    />
                  </div>
                  {/* big number */}
                  <span className={s.kpiValue}>
                    {new Intl.NumberFormat('fa-IR').format(item.value)}
                  </span>
                  {/* label */}
                  <span className={s.kpiLabel}>{item.label}</span>
                </div>
              ))}
            </div>

            {/* ── Sticky Toolbar (glass + frosted) ──────────────────── */}
            <div ref={toolbarRef} className={s.toolbar} role="search">
              {toolbarFilters}
              {toolbarSearch}
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--ds-space-2)', marginInlineStart: 'auto' }}>
                {toolbarActions}
              </div>
            </div>

            {/* ── Table ────────────────────────────────────────────────── */}
            {customers.length === 0 ? (
              <MillionDollarEmpty
                variant={currentQuery ? 'search' : 'inbox'}
                tone="primary"
                eyebrow={currentQuery ? 'جستجو' : 'فهرست مشتریان'}
                title={currentQuery ? `نتیجه‌ای برای «${currentQuery}» یافت نشد` : 'هنوز مشتری‌ای ثبت نشده'}
                description={
                  currentQuery
                    ? 'پیشنهاد می‌کنیم کلمات کلیدی دیگری امتحان کنید یا فیلترها را پاک کنید.'
                    : 'برای شروع، اولین مشتری این صرافی را اضافه کنید.'
                }
                primaryAction={
                  currentQuery ? (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSearchInput('');
                        navigate({ q: '', page: '1' });
                      }}
                    >
                      پاک کردن جستجو
                    </Button>
                  ) : (
                    <Button onClick={openAdd}>
                      <Plus size={13} aria-hidden /> افزودن اولین مشتری
                    </Button>
                  )
                }
              />
            ) : (
              <div className={s.tableWrap}>
                <table className={s.table} aria-label="جدول مشتریان">
                  <thead>
                    <tr>
                      <th scope="col">مشتری</th>
                      <th scope="col">تماس</th>
                      <th scope="col">KYC</th>
                      <th scope="col">ریسک</th>
                      <th scope="col">سقف</th>
                      <th scope="col">وضعیت</th>
                      <th scope="col">ثبت</th>
                      <th scope="col">
                        <span className="sr-only">اقدامات</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.map((c, i) => {
                      const hue = avatarHue(c.fullName);
                      return (
                        <tr
                          key={c.id}
                          className={s.tableRow}
                          style={{ '--row-i': i } as React.CSSProperties}
                          onClick={() => openDetail(c)}
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              openDetail(c);
                            }
                          }}
                          aria-label={`مشتری ${c.fullName}`}
                        >
                          {/* مشتری */}
                          <td>
                            <div className={s.customerCell}>
                              <span
                                className={s.avatar}
                                style={{
                                  background: `oklch(91% 0.04 ${hue})`,
                                  color: `oklch(36% 0.12 ${hue})`,
                                } as React.CSSProperties}
                                aria-hidden
                              >
                                {c.fullName.slice(0, 1)}
                              </span>
                              <div className={s.customerInfo}>
                                <span className={s.customerName}>{c.fullName}</span>
                                {c.fatherName && (
                                  <span className={s.customerFather}>فرزند {c.fatherName}</span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* تماس */}
                          <td>
                            <div className={s.contactCell}>
                              <span dir="ltr" className={s.phone}>
                                {c.phone}
                              </span>
                              {c.email && (
                                <span dir="ltr" className={s.email} title={c.email}>
                                  {c.email}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* KYC */}
                          <td>
                            <div className={s.kycCell}>
                              <span className={`${s.kycBadge} ${s[`kyc_${c.kycStatus}`] ?? ''}`}>
                                {KYC_FA[c.kycLevel] ?? c.kycLevel}
                              </span>
                              <span className={s.kycStatus}>
                                {KYC_STATUS_FA[c.kycStatus] ?? c.kycStatus}
                              </span>
                            </div>
                          </td>

                          {/* ریسک */}
                          <td>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className={s.riskCell}>
                                  <RiskArc score={c.riskScore} />
                                  <span className={`${s.riskLabel} ${riskColorClass(c.riskScore)}`}>
                                    {riskLabel(c.riskScore)}
                                  </span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                امتیاز ریسک: {c.riskScore} از ۱۰۰
                              </TooltipContent>
                            </Tooltip>
                          </td>

                          {/* سقف */}
                          <td>
                            <span className={s.limitCell}>{fmtLimit(c.personalLimitAf)}</span>
                          </td>

                          {/* وضعیت */}
                          <td>
                            <span className={`${s.statusBadge} ${s[`status_${c.status}`] ?? ''}`}>
                              <StatusDot status={c.status} />
                              {STATUS_FA[c.status] ?? c.status}
                            </span>
                          </td>

                          {/* تاریخ */}
                          <td>
                            <span className={s.dateCell}>{formatDate(c.createdAt)}</span>
                          </td>

                          {/* اقدامات */}
                          <td>
                            <div className={s.actionCell} onClick={(e) => e.stopPropagation()}>
                              {c.status === 'ACTIVE' && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      type="button"
                                      className={`${s.actionBtn} ${s.actionBtnFreeze}`}
                                      onClick={() => handleStatusChange(c, 'FROZEN')}
                                      aria-label="مسدود کردن"
                                    >
                                      <Lock size={13} aria-hidden />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top">مسدود کردن</TooltipContent>
                                </Tooltip>
                              )}
                              {c.status === 'FROZEN' && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      type="button"
                                      className={`${s.actionBtn} ${s.actionBtnActive}`}
                                      onClick={() => handleStatusChange(c, 'ACTIVE')}
                                      aria-label="رفع مسدودیت"
                                    >
                                      <Unlock size={13} aria-hidden />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top">رفع مسدودیت</TooltipContent>
                                </Tooltip>
                              )}
                              {c.status !== 'CLOSED' && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      type="button"
                                      className={`${s.actionBtn} ${s.actionBtnClose}`}
                                      onClick={() => handleStatusChange(c, 'CLOSED')}
                                      aria-label="بستن حساب"
                                    >
                                      <ShieldOff size={13} aria-hidden />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top">بستن حساب</TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* ── Pagination ────────────────────────────────────────────── */}
            {totalPages > 1 && (
              <nav className={s.pagination} aria-label="صفحه‌بندی">
                <button
                  type="button"
                  className={s.pageBtn}
                  disabled={currentPage <= 1}
                  onClick={() => navigate({ page: String(currentPage - 1) })}
                  aria-label="صفحه قبل"
                >
                  <ChevronRight size={15} aria-hidden />
                </button>

                <span className={s.pageInfo} aria-live="polite">
                  صفحه{' '}
                  <strong>{new Intl.NumberFormat('fa-IR').format(currentPage)}</strong>
                  {' از '}
                  {new Intl.NumberFormat('fa-IR').format(totalPages)}
                </span>

                {/* Page Jump */}
                <div className={s.pageJump}>
                  <input
                    type="number"
                    className={s.pageJumpInput}
                    placeholder="صفحه"
                    value={pageInput}
                    min={1}
                    max={totalPages}
                    onChange={(e) => setPageInput(e.target.value)}
                    onKeyDown={handlePageJump}
                    aria-label="رفتن به صفحه"
                  />
                </div>

                <button
                  type="button"
                  className={s.pageBtn}
                  disabled={currentPage >= totalPages}
                  onClick={() => navigate({ page: String(currentPage + 1) })}
                  aria-label="صفحه بعد"
                >
                  <ChevronLeft size={15} aria-hidden />
                </button>
              </nav>
            )}

            {/* ── Detail Modal (center) ─────────────────────────────────── */}
            <Dialog
              open={!!selected && sheetMode === 'detail'}
              onOpenChange={(o) => {
                if (!o) setSelected(null);
              }}
            >
              <DialogContent className={s.modalDetail} dir="rtl">
                {selected && (
                  <>
                    {/* Modal Header */}
                    <DialogHeader className={s.modalHeader}>
                      <div className={s.modalHeaderInner}>
                        <div
                          className={s.modalAvatar}
                          style={{
                            background: `oklch(91% 0.04 ${avatarHue(selected.fullName)})`,
                            color: `oklch(36% 0.12 ${avatarHue(selected.fullName)})`,
                          } as React.CSSProperties}
                          aria-hidden
                        >
                          {selected.fullName.slice(0, 1)}
                        </div>
                        <div className={s.modalTitleGroup}>
                          <DialogTitle className={s.modalName}>
                            {selected.fullName}
                          </DialogTitle>
                          <div className={s.modalMeta}>
                            <span className={`${s.statusBadge} ${s[`status_${selected.status}`] ?? ''}`}>
                              <StatusDot status={selected.status} />
                              {STATUS_FA[selected.status] ?? selected.status}
                            </span>
                            <span className={s.modalSubtitle}>
                              {selected.city && `${selected.city} · `}
                              {formatDate(selected.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </DialogHeader>

                    {/* Modal Body — 2-col grid */}
                    <div className={s.modalBody}>
                      {/* Col 1: اطلاعات پایه + KYC */}
                      <div className={s.modalCol}>
                        <section className={s.modalSection}>
                          <h3 className={s.modalSectionTitle}>اطلاعات پایه</h3>
                          <dl className={s.dl}>
                            {selected.fatherName && (
                              <>
                                <dt>نام پدر</dt>
                                <dd>{selected.fatherName}</dd>
                              </>
                            )}
                            <dt>شماره تماس</dt>
                            <dd dir="ltr">{selected.phone}</dd>
                            {selected.email && (
                              <>
                                <dt>ایمیل</dt>
                                <dd dir="ltr">{selected.email}</dd>
                              </>
                            )}
                            {selected.city && (
                              <>
                                <dt>شهر</dt>
                                <dd>{selected.city}</dd>
                              </>
                            )}
                            {selected.address && (
                              <>
                                <dt>آدرس</dt>
                                <dd>{selected.address}</dd>
                              </>
                            )}
                          </dl>
                        </section>

                        <section className={s.modalSection}>
                          <h3 className={s.modalSectionTitle}>احراز هویت (KYC)</h3>
                          <dl className={s.dl}>
                            <dt>سطح</dt>
                            <dd>
                              <span className={`${s.kycBadge} ${s[`kyc_${selected.kycStatus}`] ?? ''}`}>
                                {KYC_FA[selected.kycLevel] ?? selected.kycLevel}
                              </span>
                            </dd>
                            <dt>وضعیت</dt>
                            <dd>{KYC_STATUS_FA[selected.kycStatus] ?? selected.kycStatus}</dd>
                            <dt>سقف معامله</dt>
                            <dd className={s.limitDd}>{fmtLimit(selected.personalLimitAf)}</dd>
                          </dl>
                        </section>
                      </div>

                      {/* Col 2: ریسک + یادداشت + اقدامات */}
                      <div className={s.modalCol}>
                        <section className={s.modalSection}>
                          <h3 className={s.modalSectionTitle}>امتیاز ریسک</h3>
                          <div className={s.riskDetailWrap}>
                            <RiskArc score={selected.riskScore} />
                            <div className={s.riskDetailText}>
                              <span className={`${s.riskLabelLg} ${riskColorClass(selected.riskScore)}`}>
                                {riskLabel(selected.riskScore)}
                              </span>
                              <span className={s.riskScore}>{selected.riskScore} / ۱۰۰</span>
                            </div>
                          </div>
                          <div className={s.riskBar} style={{ marginBlockStart: 'var(--ds-space-2)' }}>
                            <div
                              className={`${s.riskBarFill} ${riskColorClass(selected.riskScore)}`}
                              style={{ '--risk-pct': `${selected.riskScore}%` } as React.CSSProperties}
                            />
                          </div>
                        </section>

                        {selected.notes && (
                          <section className={s.modalSection}>
                            <h3 className={s.modalSectionTitle}>یادداشت داخلی</h3>
                            <p className={s.notes}>{selected.notes}</p>
                          </section>
                        )}

                        <section className={s.modalSection}>
                          <h3 className={s.modalSectionTitle}>اقدامات حساب</h3>
                          <div className={s.modalActions}>
                            {selected.status !== 'ACTIVE' && (
                              <Button
                                variant="outline"
                                size="sm"
                                className={s.actionSheetBtn}
                                onClick={() => handleStatusChange(selected, 'ACTIVE')}
                                disabled={statusPending}
                              >
                                <CheckCircle2 size={14} aria-hidden />
                                فعال‌سازی
                              </Button>
                            )}
                            {selected.status === 'ACTIVE' && (
                              <Button
                                variant="outline"
                                size="sm"
                                className={`${s.actionSheetBtn} ${s.actionSheetFreeze}`}
                                onClick={() => handleStatusChange(selected, 'FROZEN')}
                                disabled={statusPending}
                              >
                                <Lock size={14} aria-hidden />
                                مسدود کردن
                              </Button>
                            )}
                            {selected.status !== 'CLOSED' && (
                              <Button
                                variant="outline"
                                size="sm"
                                className={`${s.actionSheetBtn} ${s.actionSheetClose}`}
                                onClick={() => handleStatusChange(selected, 'CLOSED')}
                                disabled={statusPending}
                              >
                                <ShieldOff size={14} aria-hidden />
                                بستن حساب
                              </Button>
                            )}
                          </div>
                        </section>
                      </div>
                    </div>
                  </>
                )}
              </DialogContent>
            </Dialog>

            {/* ── Add Customer Modal (center) ───────────────────────────── */}
            <Dialog
              open={sheetMode === 'add'}
              onOpenChange={(o) => {
                if (!o) {
                  setSheetMode('detail');
                  setFormErrors({});
                }
              }}
            >
              <DialogContent className={s.modalAdd} dir="rtl">
                <DialogHeader className={s.modalHeader}>
                  <div className={s.modalHeaderInner}>
                    <div className={s.modalAvatarPlus} aria-hidden>
                      <Plus size={20} />
                    </div>
                    <div className={s.modalTitleGroup}>
                      <DialogTitle className={s.modalName}>افزودن مشتری جدید</DialogTitle>
                      <span className={s.modalSubtitle}>اطلاعات مشتری را تکمیل کنید</span>
                    </div>
                  </div>
                </DialogHeader>

                <div className={s.addForm}>
                  <div className={s.formGrid}>
                    <FormField
                      label="نام و نام خانوادگی"
                      required
                      error={formErrors.fullName}
                    >
                      <Input
                        value={formState.fullName}
                        onChange={(e) => {
                          setFormState((p) => ({ ...p, fullName: e.target.value }));
                          if (formErrors.fullName) setFormErrors((p) => ({ ...p, fullName: '' }));
                        }}
                        placeholder="علی احمدی"
                        autoFocus
                      />
                    </FormField>

                    <FormField label="نام پدر">
                      <Input
                        value={formState.fatherName}
                        onChange={(e) =>
                          setFormState((p) => ({ ...p, fatherName: e.target.value }))
                        }
                        placeholder="محمد"
                      />
                    </FormField>
                  </div>

                  <div className={s.formGrid}>
                    <FormField label="شماره تماس" required error={formErrors.phone}>
                      <Input
                        dir="ltr"
                        value={formState.phone}
                        onChange={(e) => {
                          setFormState((p) => ({ ...p, phone: e.target.value }));
                          if (formErrors.phone) setFormErrors((p) => ({ ...p, phone: '' }));
                        }}
                        placeholder="09XXXXXXXXX"
                      />
                    </FormField>

                    <FormField label="تذکره / کارت ملی">
                      <Input
                        dir="ltr"
                        value={formState.nationalId}
                        onChange={(e) =>
                          setFormState((p) => ({ ...p, nationalId: e.target.value }))
                        }
                        placeholder="XXXXXXXXXX"
                      />
                    </FormField>
                  </div>

                  <div className={s.formGrid}>
                    <FormField label="ایمیل">
                      <Input
                        dir="ltr"
                        type="email"
                        value={formState.email}
                        onChange={(e) => setFormState((p) => ({ ...p, email: e.target.value }))}
                        placeholder="example@email.com"
                      />
                    </FormField>

                    <FormField label="شهر">
                      <Input
                        value={formState.city}
                        onChange={(e) => setFormState((p) => ({ ...p, city: e.target.value }))}
                        placeholder="کابل"
                      />
                    </FormField>
                  </div>

                  <FormField label="آدرس">
                    <Input
                      value={formState.address}
                      onChange={(e) =>
                        setFormState((p) => ({ ...p, address: e.target.value }))
                      }
                      placeholder="آدرس کامل"
                    />
                  </FormField>

                  <FormField label="یادداشت داخلی">
                    <Textarea
                      value={formState.notes}
                      onChange={(e) => setFormState((p) => ({ ...p, notes: e.target.value }))}
                      rows={3}
                      placeholder="توضیحات اختیاری…"
                    />
                  </FormField>

                  <div className={s.formActions}>
                    <Button
                      className={s.addSubmitBtn}
                      onClick={handleAdd}
                      disabled={addPending || !formState.fullName.trim() || !formState.phone.trim()}
                    >
                      {addPending ? <span className={s.spinner} aria-hidden /> : <Plus size={14} aria-hidden />}
                      {addPending ? 'در حال ذخیره…' : 'ذخیره مشتری'}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setSheetMode('detail');
                        setFormState(emptyForm);
                        setFormErrors({});
                      }}
                    >
                      انصراف
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* ── Confirm Status Change ─────────────────────────────────── */}
            <ConfirmDialog
              open={!!confirmTarget}
              onOpenChange={(o) => {
                if (!o) setConfirmTarget(null);
              }}
              title={
                confirmTarget?.newStatus === 'FROZEN'
                  ? 'مسدود کردن حساب'
                  : confirmTarget?.newStatus === 'ACTIVE'
                    ? 'فعال‌سازی حساب'
                    : 'بستن حساب'
              }
              description={
                confirmTarget
                  ? `حساب «${confirmTarget.customer.fullName}» ${
                      confirmTarget.newStatus === 'FROZEN'
                        ? 'مسدود می‌شود. معاملات جدید ممکن نخواهد بود.'
                        : confirmTarget.newStatus === 'ACTIVE'
                          ? 'فعال می‌شود و می‌تواند معامله کند.'
                          : 'برای همیشه بسته می‌شود. این عملیات برگشت‌پذیر نیست.'
                    }`
                  : ''
              }
              confirmLabel="تأیید"
              cancelLabel="انصراف"
              variant={confirmTarget?.newStatus === 'ACTIVE' ? 'default' : 'danger'}
              onConfirm={doStatusChange}
              loading={statusPending}
            />
          </>
        )}
      </div>
    </TooltipProvider>
  );
}
