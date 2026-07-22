'use client';

/**
 * CustomersClient — 2026 Million-Dollar Customer Management
 *
 * طراحی: Ramp × Mercury — High-density fintech admin
 * ویژگی‌ها:
 * - KPI strip: total / active / frozen / pending KYC
 * - جدول با risk score gauge + KYC badge + status chip
 * - فیلتر صرافی + وضعیت + جستجو (URL-based)
 * - Detail Sheet: اطلاعات کامل + اقدامات (freeze/unfreeze/close)
 * - Form افزودن مشتری جدید در Sheet
 * - Pagination سمت سرور
 * - spring micro-interactions روی row‌ها
 */

import {
  type CustomerRow,
  createCustomer,
  setCustomerStatus,
  updateCustomer,
} from '@/actions/exchange-customers';
import type { ExchangeRow } from '@/actions/exchanges';
import { ConfirmDialog, EmptyState, PageHeader } from '@/components/Dashboard/primitives';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useToast } from '@/components/ui/use-toast';
import {
  AlertTriangle,
  Building2,
  ChevronLeft,
  ChevronRight,
  Filter,
  Lock,
  Plus,
  Search,
  ShieldCheck,
  ShieldOff,
  Unlock,
  User,
  Users,
  X,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useDeferredValue, useEffect, useRef, useState, useTransition } from 'react';
import s from './CustomersClient.module.css';

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Label Maps ───────────────────────────────────────────────────────────────

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
  PENDING: 'در انتظار بررسی',
  APPROVED: 'تأیید شده',
  REJECTED: 'رد شده',
  EXPIRED: 'منقضی',
};

function riskLabel(score: number): string {
  if (score >= 70) return 'پرریسک';
  if (score >= 40) return 'متوسط';
  return 'کم‌ریسک';
}

function riskClass(score: number): string {
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

// ── Mini Sparkline (7 روز اخیر — ثبت مشتری) ─────────────────────────────────
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
    return `${x},${y}`;
  });

  return (
    <svg
      viewBox={`-1 -1 ${W + 2} ${H + 2}`}
      className={s.kpiSparkline}
      aria-hidden="true"
      focusable="false"
      style={{ '--spark-color': color } as React.CSSProperties}
    >
      <title>sparkline</title>
      <polyline
        points={pts.join(' ')}
        fill="none"
        stroke="var(--spark-color, currentColor)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.65"
      />
      {/* dot آخر */}
      {pts[pts.length - 1] &&
        (() => {
          const [lx, ly] = (pts[pts.length - 1] ?? '0,0').split(',').map(Number);
          return (
            <circle cx={lx} cy={ly} r="2" fill="var(--spark-color, currentColor)" opacity="0.9" />
          );
        })()}
    </svg>
  );
}

// ─── Risk Arc SVG ─────────────────────────────────────────────────────────────

function RiskArc({ score }: { score: number }) {
  const R = 12;
  const circ = Math.PI * R; // half circle
  const pct = Math.max(0, Math.min(100, score)) / 100;
  const dash = pct * circ;
  return (
    <svg width="30" height="18" viewBox="0 0 30 18" aria-hidden="true">
      <path
        d="M3,16 A12,12 0 0,1 27,16"
        fill="none"
        stroke="var(--ds-border-default)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M3,16 A12,12 0 0,1 27,16"
        fill="none"
        stroke={
          score >= 70
            ? 'var(--nova-rose,#ef4444)'
            : score >= 40
              ? 'var(--nova-amber,#f59e0b)'
              : 'var(--nova-emerald,#22c55e)'
        }
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circ}`}
      />
    </svg>
  );
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

  // ── No-exchange early return ───────────────────────────────────────────────
  // باید بعد از همه hooks باشد — React قانون: hooks قبل از هر early return
  const noExchange = exchanges.length === 0;

  // ── Search debounce ────────────────────────────────────────────────────────
  const [searchInput, setSearchInput] = useState(currentQuery);
  const deferredSearch = useDeferredValue(searchInput);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    debounceRef.current = setTimeout(() => {
      navigate({ q: deferredSearch, page: '1' });
    }, 340);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [deferredSearch, currentQuery, navigate]);

  // ── Detail Sheet ──────────────────────────────────────────────────────────
  const [selected, setSelected] = useState<CustomerRow | null>(null);
  const [sheetMode, setSheetMode] = useState<'detail' | 'add'>('detail');

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
        router.refresh();
      } else if (!result.success) {
        toast({ title: 'خطا', description: result.error.message, variant: 'destructive' });
        setConfirmTarget(null);
      }
    });
  }, [confirmTarget, toast, router]);

  // ── Add customer form ─────────────────────────────────────────────────────
  const [formState, setFormState] = useState({
    fullName: '',
    fatherName: '',
    nationalId: '',
    phone: '',
    email: '',
    city: '',
    address: '',
    notes: '',
  });
  const [addPending, startAddTransition] = useTransition();

  const handleAdd = useCallback(() => {
    if (!currentExchangeId) return;
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
        setFormState({
          fullName: '',
          fatherName: '',
          nationalId: '',
          phone: '',
          email: '',
          city: '',
          address: '',
          notes: '',
        });
        router.refresh();
      } else {
        toast({ title: 'خطا', description: result.error.message, variant: 'destructive' });
      }
    });
  }, [currentExchangeId, formState, toast, router]);

  // ── KPI ───────────────────────────────────────────────────────────────────
  const totalPages = Math.ceil(total / pageSize);
  const kpiActive = customers.filter((c) => c.status === 'ACTIVE').length;
  const kpiFrozen = customers.filter((c) => c.status === 'FROZEN').length;
  const kpiKyc = customers.filter((c) => c.kycStatus === 'PENDING').length;

  return (
    <div className={s.root}>
      {/* ── Header ──────────────────────────────────────────────────── */}
      <PageHeader
        breadcrumb={[{ label: 'داشبورد', href: '/dashboard' }, { label: 'مشتریان' }]}
        title="مشتریان صرافی"
        description="مدیریت مشتریان، KYC، تراکنش‌ها و وضعیت حساب"
        eyebrow="فین‌تک"
        actions={
          currentExchangeId ? (
            <Button
              size="sm"
              onClick={() => {
                setSheetMode('add');
                setSelected(null);
              }}
            >
              <Plus size={14} aria-hidden /> افزودن مشتری
            </Button>
          ) : null
        }
      />

      {/* ── No-exchange guard ────────────────────────────────────────── */}
      {noExchange && (
        <div className={s.tableWrap} style={{ padding: 'var(--ds-space-6)' }}>
          <EmptyState
            icon={Building2}
            title="هنوز صرافی‌ای ندارید"
            description="برای مدیریت مشتریان، ابتدا باید یک صرافی ثبت و تأیید شده داشته باشید."
            action={
              <Button size="sm" asChild>
                <a href="/dashboard/exchanges">رفتن به مدیریت صراف‌ها</a>
              </Button>
            }
          />
        </div>
      )}

      {!noExchange && (
        <>
          {/* ── KPI Strip ───────────────────────────────────────────────── */}
          <div className={s.kpiStrip} aria-label="آمار مشتریان">
            {(
              [
                {
                  label: 'کل مشتریان',
                  value: total,
                  icon: <Users size={16} />,
                  sparkFilter: (_: CustomerRow) => true,
                  sparkColor: 'var(--ds-brand-500)',
                },
                {
                  label: 'فعال',
                  value: kpiActive,
                  icon: <User size={16} />,
                  sparkFilter: (c: CustomerRow) => c.status === 'ACTIVE',
                  sparkColor: 'var(--nova-emerald, oklch(50% 0.14 145))',
                },
                {
                  label: 'مسدود',
                  value: kpiFrozen,
                  icon: <Lock size={16} />,
                  sparkFilter: (c: CustomerRow) => c.status === 'FROZEN',
                  sparkColor: 'var(--nova-rose, oklch(55% 0.18 25))',
                },
                {
                  label: 'KYC در انتظار',
                  value: kpiKyc,
                  icon: <ShieldCheck size={16} />,
                  sparkFilter: (c: CustomerRow) => c.kycStatus === 'PENDING',
                  sparkColor: 'var(--nova-amber, oklch(60% 0.16 70))',
                },
              ] as const
            ).map((item) => (
              <div key={item.label} className={s.kpiCard}>
                <div className={s.kpiTop}>
                  <span className={s.kpiIcon} aria-hidden>
                    {item.icon}
                  </span>
                  <MiniSparkline
                    customers={customers}
                    filter={item.sparkFilter as (c: CustomerRow) => boolean}
                    color={item.sparkColor}
                  />
                </div>
                <span className={s.kpiValue}>
                  {new Intl.NumberFormat('fa-IR').format(item.value)}
                </span>
                <span className={s.kpiLabel}>{item.label}</span>
              </div>
            ))}
          </div>

          {/* ── Filters ─────────────────────────────────────────────────── */}
          <div className={s.toolbar}>
            {/* فیلتر صرافی */}
            {exchanges.length > 1 && (
              <Select
                value={currentExchangeId}
                onValueChange={(v) => navigate({ exchange: v, page: '1' })}
              >
                <SelectTrigger className={s.filterSelect} aria-label="انتخاب صرافی">
                  <Building2 size={14} className={s.selectIcon} aria-hidden />
                  <SelectValue placeholder="صرافی..." />
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

            {/* فیلتر وضعیت */}
            <Select value={currentStatus} onValueChange={(v) => navigate({ status: v, page: '1' })}>
              <SelectTrigger className={s.filterSelect} aria-label="فیلتر وضعیت">
                <Filter size={14} className={s.selectIcon} aria-hidden />
                <SelectValue placeholder="وضعیت..." />
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

            {/* جستجو */}
            <div className={s.searchWrap}>
              <Search size={14} className={s.searchIcon} aria-hidden />
              <input
                className={s.searchInput}
                placeholder="جستجو نام، تلفن..."
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
                  }}
                  aria-label="پاک کردن جستجو"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {isPending && <span className={s.spinner} aria-label="در حال بارگذاری" />}
          </div>

          {/* ── Table ────────────────────────────────────────────────────── */}
          {customers.length === 0 ? (
            <EmptyState
              icon={Users}
              title="مشتری‌ای یافت نشد"
              description={
                currentQuery ? 'جستجو نتیجه‌ای نداشت' : 'هنوز مشتری‌ای در این صرافی ثبت نشده'
              }
              action={
                currentExchangeId ? (
                  <Button
                    size="sm"
                    onClick={() => {
                      setSheetMode('add');
                    }}
                  >
                    <Plus size={14} aria-hidden /> افزودن اولین مشتری
                  </Button>
                ) : null
              }
            />
          ) : (
            <div className={s.tableWrap}>
              <table className={s.table} aria-label="جدول مشتریان">
                <thead>
                  <tr>
                    <th>مشتری</th>
                    <th>تماس</th>
                    <th>KYC</th>
                    <th>ریسک</th>
                    <th>سقف معامله</th>
                    <th>وضعیت</th>
                    <th>تاریخ ثبت</th>
                    <th>
                      <span className="sr-only">اقدامات</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((c, i) => (
                    <tr
                      key={c.id}
                      className={s.tableRow}
                      style={{ '--row-i': i } as React.CSSProperties}
                      onClick={() => {
                        setSelected(c);
                        setSheetMode('detail');
                      }}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          setSelected(c);
                          setSheetMode('detail');
                        }
                      }}
                      aria-label={`مشتری ${c.fullName}`}
                    >
                      {/* مشتری */}
                      <td>
                        <div className={s.customerCell}>
                          <span className={s.avatar}>{c.fullName.slice(0, 1)}</span>
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
                            <span dir="ltr" className={s.email}>
                              {c.email}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* KYC */}
                      <td>
                        <div className={s.kycCell}>
                          <span className={`${s.kycBadge} ${s[`kyc_${c.kycStatus}`]}`}>
                            {KYC_FA[c.kycLevel] ?? c.kycLevel}
                          </span>
                          <span className={s.kycStatus}>
                            {KYC_STATUS_FA[c.kycStatus] ?? c.kycStatus}
                          </span>
                        </div>
                      </td>

                      {/* ریسک */}
                      <td>
                        <div className={s.riskCell}>
                          <RiskArc score={c.riskScore} />
                          <span className={`${s.riskLabel} ${riskClass(c.riskScore)}`}>
                            {riskLabel(c.riskScore)}
                          </span>
                        </div>
                      </td>

                      {/* سقف */}
                      <td>
                        <span className={s.limitCell}>{fmtLimit(c.personalLimitAf)}</span>
                      </td>

                      {/* وضعیت */}
                      <td>
                        <span className={`${s.statusBadge} ${s[`status_${c.status}`]}`}>
                          {STATUS_FA[c.status] ?? c.status}
                        </span>
                      </td>

                      {/* تاریخ */}
                      <td>
                        <span className={s.dateCell}>{formatDate(c.createdAt)}</span>
                      </td>

                      {/* اقدامات */}
                      <td>
                        <div className={s.actionCell}>
                          {c.status === 'ACTIVE' && (
                            <button
                              type="button"
                              className={s.actionBtn}
                              title="مسدود کردن"
                              onClick={() => handleStatusChange(c, 'FROZEN')}
                            >
                              <Lock size={13} aria-hidden />
                            </button>
                          )}
                          {c.status === 'FROZEN' && (
                            <button
                              type="button"
                              className={s.actionBtn}
                              title="رفع مسدودیت"
                              onClick={() => handleStatusChange(c, 'ACTIVE')}
                            >
                              <Unlock size={13} aria-hidden />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Pagination ──────────────────────────────────────────────── */}
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
              <span className={s.pageInfo}>
                صفحه {new Intl.NumberFormat('fa-IR').format(currentPage)} از{' '}
                {new Intl.NumberFormat('fa-IR').format(totalPages)}
              </span>
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

          {/* ── Detail Sheet ────────────────────────────────────────────── */}
          <Sheet
            open={!!selected && sheetMode === 'detail'}
            onOpenChange={(o) => {
              if (!o) setSelected(null);
            }}
          >
            <SheetContent side="left" className={s.detailSheet} dir="rtl">
              {selected && (
                <>
                  <SheetHeader className={s.sheetHeader}>
                    <div className={s.sheetAvatar}>{selected.fullName.slice(0, 1)}</div>
                    <div className={s.sheetTitleGroup}>
                      <SheetTitle className={s.sheetName}>{selected.fullName}</SheetTitle>
                      <span className={`${s.statusBadge} ${s[`status_${selected.status}`]}`}>
                        {STATUS_FA[selected.status] ?? selected.status}
                      </span>
                    </div>
                  </SheetHeader>

                  <div className={s.sheetBody}>
                    {/* اطلاعات پایه */}
                    <section className={s.sheetSection}>
                      <h3 className={s.sheetSectionTitle}>اطلاعات پایه</h3>
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
                        <dt>تاریخ ثبت</dt>
                        <dd>{formatDate(selected.createdAt)}</dd>
                      </dl>
                    </section>

                    {/* KYC */}
                    <section className={s.sheetSection}>
                      <h3 className={s.sheetSectionTitle}>احراز هویت</h3>
                      <dl className={s.dl}>
                        <dt>سطح KYC</dt>
                        <dd>
                          <span className={`${s.kycBadge} ${s[`kyc_${selected.kycStatus}`]}`}>
                            {KYC_FA[selected.kycLevel]}
                          </span>
                        </dd>
                        <dt>وضعیت</dt>
                        <dd>{KYC_STATUS_FA[selected.kycStatus] ?? selected.kycStatus}</dd>
                      </dl>
                    </section>

                    {/* ریسک */}
                    <section className={s.sheetSection}>
                      <h3 className={s.sheetSectionTitle}>امتیاز ریسک</h3>
                      <div className={s.riskDetail}>
                        <RiskArc score={selected.riskScore} />
                        <span className={`${s.riskLabel} ${riskClass(selected.riskScore)}`}>
                          {selected.riskScore} — {riskLabel(selected.riskScore)}
                        </span>
                      </div>
                    </section>

                    {/* محدودیت‌ها */}
                    <section className={s.sheetSection}>
                      <h3 className={s.sheetSectionTitle}>محدودیت‌های معامله</h3>
                      <dl className={s.dl}>
                        <dt>سقف شخصی</dt>
                        <dd>{fmtLimit(selected.personalLimitAf)}</dd>
                      </dl>
                    </section>

                    {/* یادداشت */}
                    {selected.notes && (
                      <section className={s.sheetSection}>
                        <h3 className={s.sheetSectionTitle}>یادداشت داخلی</h3>
                        <p className={s.notes}>{selected.notes}</p>
                      </section>
                    )}

                    {/* اقدامات */}
                    <section className={s.sheetSection}>
                      <h3 className={s.sheetSectionTitle}>اقدامات</h3>
                      <div className={s.sheetActions}>
                        {selected.status !== 'ACTIVE' && (
                          <button
                            type="button"
                            className={`${s.actionFullBtn} ${s.actionActive}`}
                            onClick={() => handleStatusChange(selected, 'ACTIVE')}
                          >
                            <Unlock size={14} aria-hidden /> فعال‌سازی
                          </button>
                        )}
                        {selected.status === 'ACTIVE' && (
                          <button
                            type="button"
                            className={`${s.actionFullBtn} ${s.actionFreeze}`}
                            onClick={() => handleStatusChange(selected, 'FROZEN')}
                          >
                            <Lock size={14} aria-hidden /> مسدود کردن
                          </button>
                        )}
                        {selected.status !== 'CLOSED' && (
                          <button
                            type="button"
                            className={`${s.actionFullBtn} ${s.actionClose}`}
                            onClick={() => handleStatusChange(selected, 'CLOSED')}
                          >
                            <ShieldOff size={14} aria-hidden /> بستن حساب
                          </button>
                        )}
                      </div>
                    </section>
                  </div>
                </>
              )}
            </SheetContent>
          </Sheet>

          {/* ── Add Customer Sheet ──────────────────────────────────────── */}
          <Sheet
            open={sheetMode === 'add'}
            onOpenChange={(o) => {
              if (!o) setSheetMode('detail');
            }}
          >
            <SheetContent side="left" className={s.detailSheet} dir="rtl">
              <SheetHeader className={s.sheetHeader}>
                <SheetTitle className={s.sheetName}>افزودن مشتری جدید</SheetTitle>
              </SheetHeader>

              <div className={s.sheetBody}>
                <div className={s.addForm}>
                  {[
                    {
                      id: 'fullName',
                      label: 'نام و نام خانوادگی *',
                      key: 'fullName' as const,
                      required: true,
                    },
                    { id: 'fatherName', label: 'نام پدر', key: 'fatherName' as const },
                    {
                      id: 'phone',
                      label: 'شماره تماس *',
                      key: 'phone' as const,
                      required: true,
                      dir: 'ltr',
                    },
                    {
                      id: 'nationalId',
                      label: 'کد ملی / شناسنامه',
                      key: 'nationalId' as const,
                      dir: 'ltr',
                    },
                    { id: 'email', label: 'ایمیل', key: 'email' as const, dir: 'ltr' },
                    { id: 'city', label: 'شهر', key: 'city' as const },
                    { id: 'address', label: 'آدرس', key: 'address' as const },
                  ].map(({ id, label, key, required, dir }) => (
                    <div key={id} className={s.formField}>
                      <Label htmlFor={id}>{label}</Label>
                      <Input
                        id={id}
                        value={formState[key]}
                        onChange={(e) => setFormState((p) => ({ ...p, [key]: e.target.value }))}
                        dir={dir as 'ltr' | 'rtl' | undefined}
                        required={required}
                      />
                    </div>
                  ))}
                  <div className={s.formField}>
                    <Label htmlFor="notes">یادداشت</Label>
                    <textarea
                      id="notes"
                      className={s.textarea}
                      value={formState.notes}
                      onChange={(e) => setFormState((p) => ({ ...p, notes: e.target.value }))}
                      rows={3}
                    />
                  </div>
                  <Button
                    className={s.addSubmitBtn}
                    onClick={handleAdd}
                    disabled={addPending || !formState.fullName.trim() || !formState.phone.trim()}
                  >
                    {addPending ? (
                      <span className={s.spinner} aria-label="در حال ذخیره" />
                    ) : (
                      <Plus size={14} aria-hidden />
                    )}
                    ذخیره مشتری
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>

          {/* ── Confirm Status Change ──────────────────────────────────── */}
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
                        ? 'فعال می‌شود.'
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
  );
}
