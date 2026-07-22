'use client';

/**
 * ExchangeStaffClient — مدیریت کارکنان صراف‌ها
 *
 * طراحی: Mercury × Stripe — High-density fintech admin
 * ویژگی‌ها:
 * - KPI strip: total / active / revoked / by role
 * - جدول با avatar + role badge + status + actions
 * - Sheet فرم برای دعوت کارمند جدید
 * - Confirm dialog برای لغو دسترسی / حذف کامل
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
import { ConfirmDialog, EmptyState, PageHeader } from '@/components/Dashboard/primitives';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useToast } from '@/components/ui/use-toast';
import {
  Building2,
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
import {
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

// ─── Label maps ───────────────────────────────────────────────────────────────

const ROLE_FA: Record<string, string> = {
  OWNER: 'مالک',
  MANAGER: 'مدیر',
  STAFF: 'کارمند',
  VIEWER: 'ناظر',
};

const ROLE_CLASS: Record<string, string> = {
  OWNER: s.roleOwner,
  MANAGER: s.roleManager,
  STAFF: s.roleStaff,
  VIEWER: s.roleViewer,
};

function formatDate(d: Date | string): string {
  return new Date(d).toLocaleDateString('fa-IR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// ─── Avatar cell ──────────────────────────────────────────────────────────────

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

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ExchangeStaffClient({ staff: initialStaff, exchanges }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [rows, setRows] = useState(initialStaff);
  const [query, setQuery] = useState('');
  const [exchangeFilter, setExchangeFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [isPending, startTransition] = useTransition();
  const deferredQuery = useDeferredValue(query);

  // Sheet state
  const [sheetOpen, setSheetOpen] = useState(false);
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [inviteExchangeId, setInviteExchangeId] = useState('');
  const [inviteUserId, setInviteUserId] = useState('');
  const [inviteRole, setInviteRole] = useState<'OWNER' | 'MANAGER' | 'STAFF' | 'VIEWER'>('STAFF');
  const [inviteTitle, setInviteTitle] = useState('');

  // User search autocomplete
  const [userSearch, setUserSearch] = useState('');
  const [userSearchResults, setUserSearchResults] = useState<UserSearchResult[]>([]);
  const [userSearchLoading, setUserSearchLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Confirm dialog state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState('');
  const [confirmDesc, setConfirmDesc] = useState('');
  const [confirmAction, setConfirmAction] = useState<() => Promise<void>>(() => async () => {});

  // ── KPI stats ────────────────────────────────────────────────────────────────

  const kpi = useMemo(() => {
    const active = rows.filter((r) => !r.revokedAt).length;
    const revoked = rows.filter((r) => r.revokedAt).length;
    const managers = rows.filter(
      (r) => ['OWNER', 'MANAGER'].includes(r.role) && !r.revokedAt,
    ).length;
    return { total: rows.length, active, revoked, managers };
  }, [rows]);

  // ── Filtered rows ─────────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    let list = rows;
    if (exchangeFilter !== 'all') list = list.filter((r) => r.exchangeId === exchangeFilter);
    if (roleFilter !== 'all') list = list.filter((r) => r.role === roleFilter);
    if (deferredQuery.trim()) {
      const q = deferredQuery.trim().toLowerCase();
      list = list.filter(
        (r) =>
          (r.userName?.toLowerCase().includes(q) ?? false) ||
          (r.userEmail?.toLowerCase().includes(q) ?? false) ||
          r.exchangeName.toLowerCase().includes(q),
      );
    }
    return list;
  }, [rows, exchangeFilter, roleFilter, deferredQuery]);

  // ── User search debounce ──────────────────────────────────────────────────────

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
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [userSearch]);

  // Close dropdown on outside click
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

  // ── Actions ───────────────────────────────────────────────────────────────────

  const handleInvite = useCallback(async () => {
    if (!inviteExchangeId || !inviteUserId) {
      setFormError('صرافی و انتخاب کاربر الزامی است');
      return;
    }
    setFormError('');
    setFormLoading(true);
    const res = await inviteStaff({
      exchangeId: inviteExchangeId,
      userId: inviteUserId,
      role: inviteRole,
      title: inviteTitle || null,
      permissions: [],
    });
    setFormLoading(false);
    if (!res.success) {
      setFormError(res.error.message);
      return;
    }
    toast({ title: 'کارمند با موفقیت اضافه شد.' });
    setSheetOpen(false);
    setInviteExchangeId('');
    setInviteUserId('');
    setInviteRole('STAFF');
    setInviteTitle('');
    setSelectedUser(null);
    setUserSearch('');
    startTransition(() => router.refresh());
  }, [inviteExchangeId, inviteUserId, inviteRole, inviteTitle, toast, router]);

  const handleRevoke = useCallback(
    (row: StaffRow) => {
      setConfirmTitle(`لغو دسترسی ${row.userName ?? row.userId}`);
      setConfirmDesc(
        `دسترسی این کارمند به صرافی «${row.exchangeName}» لغو می‌شود. می‌توان بعداً بازگرداند.`,
      );
      setConfirmAction(() => async () => {
        const res = await revokeStaff(row.id);
        if (!res.success) {
          toast({ title: 'خطا', description: res.error.message, variant: 'destructive' });
          return;
        }
        setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, revokedAt: new Date() } : r)));
        toast({ title: 'دسترسی با موفقیت لغو شد.' });
      });
      setConfirmOpen(true);
    },
    [toast],
  );

  const handleRemove = useCallback(
    (row: StaffRow) => {
      setConfirmTitle(`حذف کارمند ${row.userName ?? row.userId}`);
      setConfirmDesc(`این کارمند به طور کامل از صرافی «${row.exchangeName}» حذف خواهد شد.`);
      setConfirmAction(() => async () => {
        const res = await removeStaff(row.id);
        if (!res.success) {
          toast({ title: 'خطا', description: res.error.message, variant: 'destructive' });
          return;
        }
        setRows((prev) => prev.filter((r) => r.id !== row.id));
        toast({ title: 'کارمند با موفقیت حذف شد.' });
      });
      setConfirmOpen(true);
    },
    [toast],
  );

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className={s.root}>
      <PageHeader
        breadcrumb={[
          { label: 'داشبورد', href: '/dashboard' },
          { label: 'صراف‌ها', href: '/dashboard/exchanges' },
          { label: 'کارکنان' },
        ]}
        title="مدیریت کارکنان"
        description="مشاهده، دعوت و مدیریت کارکنان تمام صراف‌های پلتفرم"
      />

      {/* KPI Strip */}
      <div className={s.kpiStrip} aria-label="آمار کارکنان">
        <div className={s.kpiCard}>
          <span className={s.kpiIcon} aria-hidden>
            <Users size={16} />
          </span>
          <span className={s.kpiNum}>{kpi.total.toLocaleString('fa-IR')}</span>
          <span className={s.kpiLabel}>کل کارکنان</span>
        </div>
        <div className={s.kpiCard}>
          <span className={s.kpiIcon} aria-hidden>
            <ShieldCheck size={16} />
          </span>
          <span className={s.kpiNum}>{kpi.active.toLocaleString('fa-IR')}</span>
          <span className={s.kpiLabel}>فعال</span>
        </div>
        <div className={s.kpiCard}>
          <span className={s.kpiIcon} aria-hidden>
            <ShieldBan size={16} />
          </span>
          <span className={s.kpiNum}>{kpi.revoked.toLocaleString('fa-IR')}</span>
          <span className={s.kpiLabel}>لغو شده</span>
        </div>
        <div className={s.kpiCard}>
          <span className={s.kpiIcon} aria-hidden>
            <UserCog size={16} />
          </span>
          <span className={s.kpiNum}>{kpi.managers.toLocaleString('fa-IR')}</span>
          <span className={s.kpiLabel}>مدیران و مالکان</span>
        </div>
      </div>

      {/* Toolbar */}
      <div className={s.toolbar}>
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

        <select
          value={exchangeFilter}
          onChange={(e) => setExchangeFilter(e.target.value)}
          className={s.select}
          aria-label="فیلتر بر اساس صرافی"
        >
          <option value="all">همه صراف‌ها</option>
          {exchanges.map((ex) => (
            <option key={ex.id} value={ex.id}>
              {ex.name}
            </option>
          ))}
        </select>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className={s.select}
          aria-label="فیلتر بر اساس نقش"
        >
          <option value="all">همه نقش‌ها</option>
          <option value="OWNER">مالک</option>
          <option value="MANAGER">مدیر</option>
          <option value="STAFF">کارمند</option>
          <option value="VIEWER">ناظر</option>
        </select>

        <button
          type="button"
          className={s.inviteBtn}
          onClick={() => setSheetOpen(true)}
          disabled={isPending}
        >
          <Plus size={15} aria-hidden />
          دعوت کارمند
        </button>
      </div>

      {/* Table */}
      <div className={s.tableWrap}>
        {filtered.length === 0 ? (
          <EmptyState
            icon={Users}
            title="کارمندی یافت نشد"
            description={
              query || exchangeFilter !== 'all' || roleFilter !== 'all'
                ? 'فیلترهای جستجو را تغییر دهید'
                : 'هنوز کارمندی برای صراف‌ها تعریف نشده است'
            }
          />
        ) : (
          <table className={s.table} aria-label="لیست کارکنان صراف‌ها">
            <thead className={s.thead}>
              <tr>
                <th scope="col">کارمند</th>
                <th scope="col">صرافی</th>
                <th scope="col">نقش</th>
                <th scope="col">عنوان</th>
                <th scope="col">وضعیت</th>
                <th scope="col">تاریخ عضویت</th>
                <th scope="col">
                  <span className="sr-only">اقدامات</span>
                </th>
              </tr>
            </thead>
            <tbody className={s.tbody}>
              {filtered.map((row) => (
                <tr key={row.id}>
                  <td>
                    <div className={s.userCell}>
                      <UserAvatar name={row.userName} image={row.userImage} />
                      <div>
                        <p className={s.userName}>{row.userName ?? '—'}</p>
                        {row.userEmail && <p className={s.userEmail}>{row.userEmail}</p>}
                      </div>
                    </div>
                  </td>
                  <td>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <Building2
                        size={13}
                        aria-hidden
                        style={{ color: 'var(--ds-text-secondary)' }}
                      />
                      {row.exchangeName}
                    </span>
                  </td>
                  <td>
                    <span className={`${s.badge} ${ROLE_CLASS[row.role] ?? s.roleStaff}`}>
                      {ROLE_FA[row.role] ?? row.role}
                    </span>
                  </td>
                  <td>
                    {row.title ?? <span style={{ color: 'var(--ds-text-secondary)' }}>—</span>}
                  </td>
                  <td>
                    {row.revokedAt ? (
                      <span className={`${s.badge} ${s.statusRevoked}`}>
                        <ShieldBan size={11} aria-hidden />
                        لغو شده
                      </span>
                    ) : (
                      <span className={`${s.badge} ${s.statusActive}`}>
                        <ShieldCheck size={11} aria-hidden />
                        فعال
                      </span>
                    )}
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>{formatDate(row.joinedAt)}</td>
                  <td>
                    <div className={s.actions}>
                      {!row.revokedAt && (
                        <button
                          type="button"
                          className={`${s.iconBtn} ${s.iconBtnDanger}`}
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

      {/* Invite Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="left">
          <SheetHeader>
            <SheetTitle>دعوت کارمند جدید</SheetTitle>
          </SheetHeader>
          <div className={s.sheetBody}>
            {formError && (
              <p className={s.errorMsg} role="alert">
                {formError}
              </p>
            )}

            <div className={s.formGroup}>
              <label className={s.formLabel} htmlFor="invite-exchange">
                صرافی <span aria-hidden>*</span>
              </label>
              <select
                id="invite-exchange"
                value={inviteExchangeId}
                onChange={(e) => setInviteExchangeId(e.target.value)}
                className={s.formSelect}
                required
              >
                <option value="">— انتخاب صرافی —</option>
                {exchanges.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.name}
                  </option>
                ))}
              </select>
            </div>

            {/* User search autocomplete */}
            <div className={s.formGroup}>
              <label className={s.formLabel} htmlFor="invite-user-search">
                کاربر <span aria-hidden>*</span>
              </label>
              <div className={s.autocompleteWrap} ref={searchRef}>
                {selectedUser ? (
                  /* Selected user chip */
                  <div className={s.selectedChip}>
                    {selectedUser.image ? (
                      <Image
                        src={selectedUser.image}
                        alt=""
                        width={24}
                        height={24}
                        className={s.chipAvatar}
                      />
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
                    <button
                      type="button"
                      onClick={clearSelectedUser}
                      className={s.chipClear}
                      aria-label="حذف کاربر انتخاب‌شده"
                    >
                      <X size={12} aria-hidden />
                    </button>
                  </div>
                ) : (
                  /* Search input */
                  <div className={s.searchInputWrap}>
                    <Search size={14} className={s.searchIcon} aria-hidden />
                    <input
                      id="invite-user-search"
                      type="search"
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      onFocus={() => userSearchResults.length > 0 && setShowDropdown(true)}
                      className={s.formInput}
                      placeholder="نام یا ایمیل کاربر را جستجو کنید…"
                      autoComplete="off"
                      aria-expanded={showDropdown}
                      aria-autocomplete="list"
                      aria-controls="invite-user-listbox"
                    />
                    {userSearchLoading && (
                      <span className={s.searchSpinner} aria-label="در حال جستجو" />
                    )}
                  </div>
                )}

                {/* Dropdown results */}
                {showDropdown && (
                  <div
                    id="invite-user-listbox"
                    className={s.autocompleteDropdown}
                    aria-label="نتایج جستجوی کاربر"
                  >
                    {userSearchResults.map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        aria-pressed={inviteUserId === u.id}
                        className={s.autocompleteOption}
                        onClick={() => selectUser(u)}
                      >
                        {u.image ? (
                          <Image
                            src={u.image}
                            alt=""
                            width={28}
                            height={28}
                            className={s.optionAvatar}
                          />
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

            <div className={s.formGroup}>
              <label className={s.formLabel} htmlFor="invite-role">
                نقش
              </label>
              <select
                id="invite-role"
                value={inviteRole}
                onChange={(e) =>
                  setInviteRole(e.target.value as 'OWNER' | 'MANAGER' | 'STAFF' | 'VIEWER')
                }
                className={s.formSelect}
              >
                <option value="OWNER">مالک</option>
                <option value="MANAGER">مدیر</option>
                <option value="STAFF">کارمند</option>
                <option value="VIEWER">ناظر</option>
              </select>
            </div>

            <div className={s.formGroup}>
              <label className={s.formLabel} htmlFor="invite-title">
                عنوان شغلی (اختیاری)
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
        </SheetContent>
      </Sheet>

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={confirmTitle}
        description={confirmDesc}
        confirmLabel="تأیید"
        variant="danger"
        onConfirm={() => {
          void confirmAction();
          setConfirmOpen(false);
        }}
      />
    </div>
  );
}
