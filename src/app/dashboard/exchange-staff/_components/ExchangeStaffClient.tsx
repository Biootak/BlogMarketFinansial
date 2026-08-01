'use client';

/**
 * ExchangeStaffClient — مدیریت کارکنان صراف‌ها
 *
 * طراحی: Atelier Nova 2026 — Ramp × Linear × Attio
 * ساختار: دو‌ستونی — filter sidebar + main data panel
 * رنگ: ds-brand / nova / at tokens — بدون رنگ جیغ
 * Dropdowns: همه Select shadcn (Radix)
 */

import {
  type StaffRow,
  type UserSearchResult,
  inviteStaff,
  removeStaff,
  revokeStaff,
  searchUsersForStaff,
} from '@/actions/exchange-staff';
import type { ExchangeRow } from '@/actions/exchanges';
import { ConfirmDialog, EmptyState, MillionDollarEmpty, PageHeader } from '@/components/Dashboard/primitives';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import cm from '@/components/Dashboard/primitives/CenterModal.module.css';
import {
  Dialog,
  DialogClose,
  DialogOverlay,
  DialogPortal,
  DialogTitle as SheetTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import {
  AlertCircle,
  Building2,
  Filter,
  Plus,
  Search,
  ShieldBan,
  ShieldCheck,
  Trash2,
  UserCog,
  Users,
  X,
} from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import React, {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from 'react';
import s from './ExchangeStaffClient.module.css';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  staff: StaffRow[];
  exchanges: ExchangeRow[];
}

type RoleFilter = 'all' | 'OWNER' | 'MANAGER' | 'STAFF' | 'VIEWER';

// ─── Label maps ───────────────────────────────────────────────────────────────

const ROLE_FA: Record<string, string> = {
  OWNER:   'مالک',
  MANAGER: 'مدیر',
  STAFF:   'کارمند',
  VIEWER:  'ناظر',
};

const ROLE_CLASS: Record<string, string> = {
  OWNER:   s.roleOwner,
  MANAGER: s.roleManager,
  STAFF:   s.roleStaff,
  VIEWER:  s.roleViewer,
};

const ROW_CLASS: Record<string, string> = {
  OWNER:   s.rowOwner,
  MANAGER: s.rowManager,
  STAFF:   s.rowStaff,
  VIEWER:  s.rowViewer,
};

const ROLE_HINT: Record<string, string> = {
  OWNER:   'دسترسی کامل به تمام بخش‌های صرافی',
  MANAGER: 'مدیریت معاملات، کارکنان و تنظیمات',
  STAFF:   'ثبت و پیگیری معاملات روزانه',
  VIEWER:  'فقط مشاهده گزارش‌ها و آمار',
};

const ROLE_TABS: { value: RoleFilter; label: string }[] = [
  { value: 'all',     label: 'همه' },
  { value: 'OWNER',   label: 'مالک' },
  { value: 'MANAGER', label: 'مدیر' },
  { value: 'STAFF',   label: 'کارمند' },
  { value: 'VIEWER',  label: 'ناظر' },
];

function formatDate(d: Date | string): string {
  return new Date(d).toLocaleDateString('fa-IR', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

// ─── Avatar ────────────────────────────────────────────────────────────────────

function UserAvatar({ name, image }: { name: string | null; image: string | null }) {
  if (image) {
    return <Image src={image} alt="" width={36} height={36} className={s.avatar} />;
  }
  return (
    <span className={s.avatarFallback} aria-hidden>
      {(name ?? '؟').charAt(0)}
    </span>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ExchangeStaffClient({ staff: initialStaff, exchanges }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [rows, setRows] = useState(initialStaff);
  const [query, setQuery] = useState('');
  const [exchangeFilter, setExchangeFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [isPending, startTransition] = useTransition();
  const deferredQuery = useDeferredValue(query);

  // Modal
  const [sheetOpen, setSheetOpen] = useState(false);
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [inviteExchangeId, setInviteExchangeId] = useState('');
  const [inviteUserId, setInviteUserId] = useState('');
  const [inviteRole, setInviteRole] = useState<'OWNER' | 'MANAGER' | 'STAFF' | 'VIEWER'>('STAFF');
  const [inviteTitle, setInviteTitle] = useState('');

  // Autocomplete
  const [userSearch, setUserSearch] = useState('');
  const [userSearchResults, setUserSearchResults] = useState<UserSearchResult[]>([]);
  const [userSearchLoading, setUserSearchLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Confirm
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState('');
  const [confirmDesc, setConfirmDesc] = useState('');
  const [confirmAction, setConfirmAction] = useState<() => Promise<void>>(() => async () => {});

  // ── KPI ───────────────────────────────────────────────────────────────────────

  const kpi = useMemo(() => {
    const active   = rows.filter((r) => !r.revokedAt).length;
    const revoked  = rows.filter((r) => r.revokedAt).length;
    const managers = rows.filter((r) => ['OWNER', 'MANAGER'].includes(r.role) && !r.revokedAt).length;
    return { total: rows.length, active, revoked, managers };
  }, [rows]);

  // ── Filtered ──────────────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    let list = rows;
    if (exchangeFilter !== 'all') list = list.filter((r) => r.exchangeId === exchangeFilter);
    if (roleFilter !== 'all')     list = list.filter((r) => r.role === roleFilter);
    if (deferredQuery.trim()) {
      const q = deferredQuery.trim().toLowerCase();
      list = list.filter(
        (r) =>
          (r.userName?.toLowerCase().includes(q)  ?? false) ||
          (r.userEmail?.toLowerCase().includes(q) ?? false) ||
          r.exchangeName.toLowerCase().includes(q),
      );
    }
    return list;
  }, [rows, exchangeFilter, roleFilter, deferredQuery]);

  // ── Autocomplete debounce ─────────────────────────────────────────────────────

  useEffect(() => {
    if (!userSearch || userSearch.trim().length < 2) {
      setUserSearchResults([]);
      setShowDropdown(false);
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setUserSearchLoading(true);
      const results = await searchUsersForStaff(userSearch.trim());
      if (!cancelled) {
        setUserSearchResults(results);
        setShowDropdown(results.length > 0);
        setUserSearchLoading(false);
      }
    }, 250);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [userSearch]);

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const selectUser = useCallback((u: UserSearchResult) => {
    setSelectedUser(u);
    setInviteUserId(u.id);
    setUserSearch(u.name ?? u.email ?? u.id);
    setShowDropdown(false);
  }, []);

  const clearSelectedUser = useCallback(() => {
    setSelectedUser(null);
    setInviteUserId('');
    setUserSearch('');
    setUserSearchResults([]);
  }, []);

  const handleSheetOpenChange = useCallback((open: boolean) => {
    setSheetOpen(open);
    if (!open) {
      setFormError('');
      setInviteExchangeId('');
      setInviteUserId('');
      setInviteRole('STAFF');
      setInviteTitle('');
      setSelectedUser(null);
      setUserSearch('');
    }
  }, []);

  // ── Actions ───────────────────────────────────────────────────────────────────

  const handleInvite = useCallback(async () => {
    if (!inviteExchangeId || !inviteUserId) {
      setFormError('انتخاب صرافی و کاربر الزامی است');
      return;
    }
    setFormError('');
    setFormLoading(true);
    const res = await inviteStaff({
      exchangeId:  inviteExchangeId,
      userId:      inviteUserId,
      role:        inviteRole,
      title:       inviteTitle || null,
      permissions: [],
    });
    setFormLoading(false);
    if (!res.success) { setFormError(res.error.message); return; }
    toast({ title: 'کارمند با موفقیت اضافه شد.' });
    handleSheetOpenChange(false);
    startTransition(() => router.refresh());
  }, [inviteExchangeId, inviteUserId, inviteRole, inviteTitle, toast, router, handleSheetOpenChange]);

  const handleRevoke = useCallback((row: StaffRow) => {
    setConfirmTitle(`لغو دسترسی ${row.userName ?? row.userId}`);
    setConfirmDesc(`دسترسی این کارمند به صرافی «${row.exchangeName}» لغو می‌شود.`);
    setConfirmAction(() => async () => {
      const res = await revokeStaff(row.id);
      if (!res.success) { toast({ title: 'خطا', description: res.error.message, variant: 'destructive' }); return; }
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, revokedAt: new Date() } : r)));
      toast({ title: 'دسترسی با موفقیت لغو شد.' });
    });
    setConfirmOpen(true);
  }, [toast]);

  const handleRemove = useCallback((row: StaffRow) => {
    setConfirmTitle(`حذف کارمند ${row.userName ?? row.userId}`);
    setConfirmDesc(`این کارمند به طور کامل از صرافی «${row.exchangeName}» حذف خواهد شد.`);
    setConfirmAction(() => async () => {
      const res = await removeStaff(row.id);
      if (!res.success) { toast({ title: 'خطا', description: res.error.message, variant: 'destructive' }); return; }
      setRows((prev) => prev.filter((r) => r.id !== row.id));
      toast({ title: 'کارمند با موفقیت حذف شد.' });
    });
    setConfirmOpen(true);
  }, [toast]);

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className={s.root}>

      {/* PageHeader */}
      <PageHeader
        variant="compact"
        icon="building"
        accent="indigo"
        breadcrumb={[
          { label: 'داشبورد', href: '/dashboard' },
          { label: 'صراف‌ها', href: '/dashboard/exchanges' },
          { label: 'کارکنان' },
        ]}
        title="مدیریت کارکنان"
        description="مشاهده، دعوت و مدیریت کارکنان تمام صراف‌های پلتفرم"
      />

      {/* ── KPI Strip ── */}
      <div className={s.kpiStrip} aria-label="آمار کارکنان">

        <div className={s.kpiCard} style={{ '--kd': '0ms' } as React.CSSProperties}>
          <div className={s.kpiIconBox}><Users size={16} aria-hidden /></div>
          <div className={s.kpiBody}>
            <span className={s.kpiVal}>{kpi.total.toLocaleString('fa-IR')}</span>
            <span className={s.kpiLbl}>کل کارکنان</span>
          </div>
        </div>

        <div className={`${s.kpiCard} ${s.kpiCardGreen}`} style={{ '--kd': '50ms' } as React.CSSProperties}>
          <div className={s.kpiIconBox}><ShieldCheck size={16} aria-hidden /></div>
          <div className={s.kpiBody}>
            <span className={s.kpiVal}>{kpi.active.toLocaleString('fa-IR')}</span>
            <span className={s.kpiLbl}>دسترسی فعال</span>
          </div>
        </div>

        <div className={`${s.kpiCard} ${s.kpiCardRed}`} style={{ '--kd': '100ms' } as React.CSSProperties}>
          <div className={s.kpiIconBox}><ShieldBan size={16} aria-hidden /></div>
          <div className={s.kpiBody}>
            <span className={s.kpiVal}>{kpi.revoked.toLocaleString('fa-IR')}</span>
            <span className={s.kpiLbl}>لغو شده</span>
          </div>
        </div>

        <div className={`${s.kpiCard} ${s.kpiCardViolet}`} style={{ '--kd': '150ms' } as React.CSSProperties}>
          <div className={s.kpiIconBox}><UserCog size={16} aria-hidden /></div>
          <div className={s.kpiBody}>
            <span className={s.kpiVal}>{kpi.managers.toLocaleString('fa-IR')}</span>
            <span className={s.kpiLbl}>مدیران و مالکان</span>
          </div>
        </div>

      </div>

      {/* ── Main Layout: filter sidebar + table ── */}
      <div className={s.layout}>

        {/* ── Sidebar Filters ── */}
        <aside className={s.sidebar} aria-label="فیلترها">

          <div className={s.sideSection}>
            <p className={s.sideLabel}>
              <Filter size={12} aria-hidden />
              فیلتر صرافی
            </p>
            <Select value={exchangeFilter} onValueChange={setExchangeFilter}>
              <SelectTrigger className={s.sideSelect} aria-label="فیلتر صرافی">
                <SelectValue placeholder="همه صراف‌ها" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه صراف‌ها</SelectItem>
                {exchanges.map((ex) => (
                  <SelectItem key={ex.id} value={ex.id}>{ex.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className={s.sideSection}>
            <p className={s.sideLabel}>نقش</p>
            <div className={s.roleTabs} role="tablist" aria-label="فیلتر نقش">
              {ROLE_TABS.map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  role="tab"
                  aria-selected={roleFilter === tab.value}
                  className={`${s.roleTab} ${roleFilter === tab.value ? s.roleTabActive : ''}`}
                  onClick={() => setRoleFilter(tab.value)}
                >
                  {tab.label}
                  {tab.value !== 'all' && (
                    <span className={s.roleTabCount}>
                      {rows.filter((r) => r.role === tab.value).length.toLocaleString('fa-IR')}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className={s.sideSection}>
            <p className={s.sideLabel}>وضعیت</p>
            <div className={s.statusFilters}>
              <button
                type="button"
                className={`${s.statusChip} ${s.statusChipActive}`}
                aria-label={`فعال: ${kpi.active} نفر`}
              >
                <span className={s.dot} />
                فعال
                <span className={s.statusChipCount}>{kpi.active.toLocaleString('fa-IR')}</span>
              </button>
              <button
                type="button"
                className={`${s.statusChip} ${s.statusChipRevoked}`}
                aria-label={`لغو شده: ${kpi.revoked} نفر`}
              >
                <span className={`${s.dot} ${s.dotRevoked}`} />
                لغو شده
                <span className={s.statusChipCount}>{kpi.revoked.toLocaleString('fa-IR')}</span>
              </button>
            </div>
          </div>

          <div className={s.sideSection}>
            <button
              type="button"
              className={s.inviteBtn}
              onClick={() => setSheetOpen(true)}
              disabled={isPending}
            >
              <Plus size={14} aria-hidden />
              دعوت کارمند جدید
            </button>
          </div>

        </aside>

        {/* ── Main Panel ── */}
        <div className={s.main}>

          {/* Search + count bar */}
          <div className={s.searchBar}>
            <div className={s.searchWrap}>
              <Search size={14} className={s.searchIcon} aria-hidden />
              <input
                type="search"
                placeholder="جستجو نام، ایمیل، صرافی…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className={s.searchInput}
                aria-label="جستجو در کارکنان"
              />
            </div>
            <span className={s.resultCount} aria-live="polite">
              {filtered.length.toLocaleString('fa-IR')} نفر
            </span>
          </div>

          {/* Table */}
          <div className={s.tableWrap}>
            {filtered.length === 0 ? (
              <MillionDollarEmpty
                variant={query || exchangeFilter !== 'all' || roleFilter !== 'all' ? 'search' : 'inbox'}
                tone="primary"
                eyebrow="صراف‌ها"
                title="کارمندی یافت نشد"
                description={
                  query || exchangeFilter !== 'all' || roleFilter !== 'all'
                    ? 'فیلترهای جستجو را تغییر دهید یا پاک کنید.'
                    : 'هنوز کارمندی برای صراف‌ها تعریف نشده است.'
                }
              />
            ) : (
              <table className={s.table} aria-label="لیست کارکنان صراف‌ها">
                <thead>
                  <tr>
                    <th className={s.th}>کارمند</th>
                    <th className={s.th}>صرافی</th>
                    <th className={s.th}>نقش</th>
                    <th className={s.th}>عنوان</th>
                    <th className={s.th}>وضعیت</th>
                    <th className={s.th}>تاریخ عضویت</th>
                    <th className={s.th}><span className="sr-only">اقدامات</span></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row, idx) => (
                    <tr
                      key={row.id}
                      className={[
                        s.tr,
                        ROW_CLASS[row.role] ?? s.rowStaff,
                        row.revokedAt ? s.trRevoked : '',
                      ].filter(Boolean).join(' ')}
                      style={{ '--ri': idx } as React.CSSProperties}
                    >
                      <td className={s.td}>
                        <div className={s.userCell}>
                          <UserAvatar name={row.userName} image={row.userImage} />
                          <div className={s.userInfo}>
                            <p className={s.userName}>{row.userName ?? '—'}</p>
                            {row.userEmail && <p className={s.userEmail}>{row.userEmail}</p>}
                          </div>
                        </div>
                      </td>
                      <td className={s.td}>
                        <span className={s.exchangeCell}>
                          <Building2 size={12} aria-hidden />
                          {row.exchangeName}
                        </span>
                      </td>
                      <td className={s.td}>
                        <span className={`${s.roleBadge} ${ROLE_CLASS[row.role] ?? s.roleStaff}`}>
                          {ROLE_FA[row.role] ?? row.role}
                        </span>
                      </td>
                      <td className={s.td}>
                        <span className={s.titleCell}>{row.title ?? '—'}</span>
                      </td>
                      <td className={s.td}>
                        {row.revokedAt ? (
                          <span className={`${s.statusBadge} ${s.statusRevoked}`}>
                            <span className={s.dot} />
                            لغو شده
                          </span>
                        ) : (
                          <span className={`${s.statusBadge} ${s.statusActive}`}>
                            <span className={`${s.dot} ${s.dotActive}`} />
                            فعال
                          </span>
                        )}
                      </td>
                      <td className={s.td}>
                        <span className={s.dateCell}>{formatDate(row.joinedAt)}</span>
                      </td>
                      <td className={s.td}>
                        <div className={s.actions}>
                          {!row.revokedAt && (
                            <button
                              type="button"
                              className={s.iconBtn}
                              onClick={() => handleRevoke(row)}
                              aria-label={`لغو دسترسی ${row.userName ?? row.userId}`}
                              title="لغو دسترسی"
                            >
                              <ShieldBan size={14} aria-hidden />
                            </button>
                          )}
                          <button
                            type="button"
                            className={`${s.iconBtn} ${s.iconBtnDanger}`}
                            onClick={() => handleRemove(row)}
                            aria-label={`حذف کارمند ${row.userName ?? row.userId}`}
                            title="حذف کامل"
                          >
                            <Trash2 size={14} aria-hidden />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

        </div>
      </div>

      {/* ── Invite Modal ── */}
      <Dialog open={sheetOpen} onOpenChange={handleSheetOpenChange}>
        <DialogPortal>
          <DialogOverlay className={cm.overlay} />
          <DialogPrimitive.Content dir="rtl" className={cm.panel} aria-label="دعوت کارمند جدید">

            <div className={cm.header}>
              <SheetTitle>دعوت کارمند جدید</SheetTitle>
              <DialogClose className={cm.close} aria-label="بستن">
                <X size={15} aria-hidden />
              </DialogClose>
            </div>

            <div className={cm.body}>
              <div className={s.formBody}>

                {formError && (
                  <p className={s.errorMsg} role="alert">
                    <AlertCircle size={14} className={s.errorIcon} aria-hidden />
                    {formError}
                  </p>
                )}

                {/* صرافی */}
                <div className={s.formGroup}>
                  <label className={s.formLabel} htmlFor="invite-exchange">
                    صرافی <span className={s.req} aria-hidden>*</span>
                  </label>
                  <Select value={inviteExchangeId} onValueChange={setInviteExchangeId}>
                    <SelectTrigger id="invite-exchange" className={s.formSelect} aria-label="انتخاب صرافی">
                      <SelectValue placeholder="— انتخاب صرافی —" />
                    </SelectTrigger>
                    <SelectContent>
                      {exchanges.map((ex) => (
                        <SelectItem key={ex.id} value={ex.id}>{ex.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* کاربر */}
                <div className={s.formGroup}>
                  <label className={s.formLabel} htmlFor="invite-user-search">
                    کاربر <span className={s.req} aria-hidden>*</span>
                  </label>
                  <div className={s.autocompleteWrap} ref={searchRef}>
                    {selectedUser ? (
                      <div className={s.selectedChip}>
                        {selectedUser.image ? (
                          <Image src={selectedUser.image} alt="" width={24} height={24} className={s.chipAvatar} />
                        ) : (
                          <span className={s.chipAvatarFallback} aria-hidden>
                            {(selectedUser.name ?? '؟').charAt(0)}
                          </span>
                        )}
                        <span className={s.chipName}>
                          {selectedUser.name ?? selectedUser.email ?? selectedUser.id}
                        </span>
                        {selectedUser.email && (
                          <span className={s.chipEmail}>{selectedUser.email}</span>
                        )}
                        <button type="button" onClick={clearSelectedUser} className={s.chipClear} aria-label="حذف">
                          <X size={12} aria-hidden />
                        </button>
                      </div>
                    ) : (
                      <div className={s.searchInputWrap}>
                        <Search size={14} className={s.searchIcon} aria-hidden />
                        <input
                          id="invite-user-search"
                          type="search"
                          value={userSearch}
                          onChange={(e) => setUserSearch(e.target.value)}
                          onFocus={() => userSearchResults.length > 0 && setShowDropdown(true)}
                          className={s.formInput}
                          placeholder="نام یا ایمیل کاربر…"
                          autoComplete="off"
                          aria-expanded={showDropdown}
                          aria-autocomplete="list"
                          aria-controls="invite-user-listbox"
                        />
                        {userSearchLoading && <span className={s.searchSpinner} aria-label="در حال جستجو" />}
                      </div>
                    )}
                    {showDropdown && (
                      <div id="invite-user-listbox" role="listbox" className={s.autocompleteDropdown}>
                        {userSearchResults.map((u) => (
                          <button
                            key={u.id}
                            type="button"
                            role="option"
                            aria-selected={inviteUserId === u.id}
                            className={s.autocompleteOption}
                            onClick={() => selectUser(u)}
                          >
                            {u.image ? (
                              <Image src={u.image} alt="" width={30} height={30} className={s.optionAvatar} />
                            ) : (
                              <span className={s.optionAvatarFallback} aria-hidden>
                                {(u.name ?? '؟').charAt(0)}
                              </span>
                            )}
                            <span className={s.optionInfo}>
                              <span className={s.optionName}>{u.name ?? '—'}</span>
                              {u.email && <span className={s.optionEmail}>{u.email}</span>}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* نقش */}
                <div className={s.formGroup}>
                  <label className={s.formLabel} htmlFor="invite-role">نقش</label>
                  <Select
                    value={inviteRole}
                    onValueChange={(v) => setInviteRole(v as typeof inviteRole)}
                  >
                    <SelectTrigger id="invite-role" className={s.formSelect}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="OWNER">مالک — دسترسی کامل</SelectItem>
                      <SelectItem value="MANAGER">مدیر — مدیریت معاملات</SelectItem>
                      <SelectItem value="STAFF">کارمند — ثبت معاملات</SelectItem>
                      <SelectItem value="VIEWER">ناظر — فقط مشاهده</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className={s.roleHint}>{ROLE_HINT[inviteRole]}</p>
                </div>

                {/* عنوان شغلی */}
                <div className={s.formGroup}>
                  <label className={s.formLabel} htmlFor="invite-title">
                    عنوان شغلی
                    <span className={s.optional}>(اختیاری)</span>
                  </label>
                  <input
                    id="invite-title"
                    type="text"
                    value={inviteTitle}
                    onChange={(e) => setInviteTitle(e.target.value)}
                    className={s.formInput}
                    placeholder="مثلاً: مسئول حسابداری"
                  />
                </div>

                <button
                  type="button"
                  className={s.submitBtn}
                  onClick={() => void handleInvite()}
                  disabled={formLoading}
                >
                  {formLoading ? 'در حال ثبت…' : 'ثبت کارمند'}
                </button>

              </div>
            </div>
          </DialogPrimitive.Content>
        </DialogPortal>
      </Dialog>

      {/* Confirm */}
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={confirmTitle}
        description={confirmDesc}
        confirmLabel="تأیید"
        variant="danger"
        onConfirm={() => { void confirmAction(); setConfirmOpen(false); }}
      />

    </div>
  );
}
