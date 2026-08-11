'use client';

/**
 * UserDetail — 2026 Million-dollar User Detail View
 *
 * 360° view of a single user. Calm confidence, number-first, hairline borders.
 * Layout: hero (identity) → KPI strip → tabs (Overview / Activity / Content / KYC / Security).
 *
 * - All copy in Persian, all code English.
 * - All data comes from server-rendered props (no fetch on mount).
 * - Heavy widgets lazy-render via tab state to keep the first paint fast.
 */

import type { UserDetailPayload } from '@/actions/user-detail';
import {
  deleteUser,
  updateUser,
  updateUserPermissions,
  updateUserRole,
} from '@/actions/userActions';
import { ConfirmDialog, PageHeader } from '@/components/Dashboard/primitives';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import {
  ACTION_LABELS,
  ALWAYS_ALLOWED_ROUTES,
  DASHBOARD_SECTIONS,
  type DashboardSectionKey,
  type SectionActionKey,
  actionKey,
  actionsOfSection,
  isKnownPermissionKey,
  isKnownSectionKey,
  routesForSection,
  sectionOfKey,
} from '@/lib/dashboard-sections';
import {
  Activity,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  CircleUserRound,
  Eye,
  FileText,
  KeyRound,
  Link2,
  Mail,
  MailCheck,
  MailX,
  MessageSquare,
  Pencil,
  Phone,
  Route,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldOff,
  Smartphone,
  Trash2,
  UserMinus,
  Wallet,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import s from '../user-detail.module.css';

const _faNum = new Intl.NumberFormat('fa-IR');

interface Financials {
  virtualCardsCount: number;
  activeCards: number;
  dealsCount: number;
  openDeals: number;
  totalDealsVolume: number;
}

interface Props {
  user: UserDetailPayload;
  financials: Financials | null;
  currentUserId: string;
  currentUserRole: string;
}

type TabKey = 'overview' | 'activity' | 'content' | 'kyc' | 'security';

const ROLE_LABELS: Record<string, string> = {
  USER: 'کاربر',
  AUTHOR: 'نویسنده',
  SUPPORT: 'پشتیبانی',
  ADMIN: 'مدیر',
  OWNER: 'مالک',
  SUPERADMIN: 'سوپرادمین',
};

const STATUS_LABELS: Record<string, string> = {
  Active: 'فعال',
  Pending: 'در انتظار',
  Banned: 'مسدود',
  Rejected: 'رد شده',
};

const POST_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'پیش‌نویس',
  PENDING: 'در انتظار',
  PUBLISHED: 'منتشر شده',
  ARCHIVED: 'بایگانی',
  REJECTED: 'رد شده',
};

function getInitials(name: string | null | undefined): string {
  if (!name) return '؟';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function formatNumber(n: number): string {
  return _faNum.format(n);
}

function formatDate(date: Date | string | null): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('fa-IR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(d);
}

function formatDateTime(date: Date | string | null): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('fa-IR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

function timeAgo(date: Date | string | null): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  const diff = Date.now() - d.getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'لحظاتی پیش';
  if (minutes < 60) return `${formatNumber(minutes)} دقیقه پیش`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${formatNumber(hours)} ساعت پیش`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${formatNumber(days)} روز پیش`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${formatNumber(months)} ماه پیش`;
  const years = Math.floor(months / 12);
  return `${formatNumber(years)} سال پیش`;
}

function roleBadgeClass(role: string): string {
  switch (role) {
    case 'OWNER':
    case 'SUPERADMIN':
      return s.badgeOwner;
    case 'ADMIN':
      return s.badgeAdmin;
    case 'AUTHOR':
    case 'SUPPORT':
      return s.badgeAuthor;
    default:
      return s.badgeUser;
  }
}

function statusBadgeClass(status: string): string {
  switch (status) {
    case 'Active':
      return s.badgeActive;
    case 'Pending':
      return s.badgePending;
    case 'Banned':
      return s.badgeBanned;
    case 'Rejected':
      return s.badgeRejected;
    default:
      return s.badgeUser;
  }
}

export default function UserDetail({ user, financials, currentUserId, currentUserRole }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [tab, setTab] = useState<TabKey>('overview');
  const [isPending, startTransition] = useTransition();
  const [showDelete, setShowDelete] = useState(false);
  const [showBan, setShowBan] = useState(false);

  const isSelf = user.id === currentUserId;
  const isPrivileged = currentUserRole === 'OWNER' || currentUserRole === 'SUPERADMIN';
  const canManage =
    !isSelf &&
    (isPrivileged ||
      (currentUserRole === 'ADMIN' &&
        user.role !== 'OWNER' &&
        user.role !== 'SUPERADMIN' &&
        user.role !== 'ADMIN'));

  const roleLabel = ROLE_LABELS[user.role] ?? user.role;
  const statusLabel = STATUS_LABELS[user.status] ?? user.status;
  const avatarSrc = user.profile?.avatar || user.image;

  const handleRoleChange = (newRole: 'USER' | 'AUTHOR' | 'SUPPORT' | 'ADMIN' | 'SUPERADMIN') => {
    startTransition(async () => {
      const res = await updateUserRole(user.id, newRole);
      if (res.success) {
        toast({
          title: 'نقش به‌روز شد',
          description: `نقش کاربر به «${ROLE_LABELS[newRole]}» تغییر کرد.`,
        });
        router.refresh();
      } else {
        toast({
          title: 'خطا',
          description: res.message ?? 'تغییر نقش ناموفق بود',
          variant: 'destructive',
        });
      }
    });
  };

  const handleStatusToggle = () => {
    const nextStatus = user.status === 'Banned' ? 'Active' : 'Banned';
    startTransition(async () => {
      const res = await updateUser(user.id, { status: nextStatus });
      if (res.success) {
        toast({
          title: nextStatus === 'Banned' ? 'کاربر مسدود شد' : 'کاربر فعال شد',
          description: `وضعیت به «${STATUS_LABELS[nextStatus]}» تغییر کرد.`,
        });
        router.refresh();
        setShowBan(false);
      } else {
        toast({
          title: 'خطا',
          description: res.message ?? 'تغییر وضعیت ناموفق بود',
          variant: 'destructive',
        });
      }
    });
  };

  const handleDelete = () => {
    startTransition(async () => {
      const res = await deleteUser(user.id);
      if (res.success) {
        toast({
          title: 'کاربر حذف شد',
          description: `${user.name ?? user.email} از سیستم حذف شد.`,
        });
        router.push('/dashboard/users');
      } else {
        toast({
          title: 'خطا',
          description: res.message ?? 'حذف ناموفق بود',
          variant: 'destructive',
        });
      }
      setShowDelete(false);
    });
  };

  return (
    <div className={s.page}>
      <PageHeader
        breadcrumb={[
          { label: 'داشبورد', href: '/dashboard' },
          { label: 'کاربران', href: '/dashboard/users' },
          { label: user.name ?? user.email },
        ]}
        eyebrow="جزئیات کاربر"
        title="نمای ۳۶۰° کاربر"
        description="هویت، فعالیت، محتوا، امنیت و ممیزی — همه در یک نگاه"
        icon="user-circle"
        accent="indigo"
      />

      {/* ── Hero / Identity ───────────────────────────────────────── */}
      <div className={s.hero}>
        <div className={s.identity}>
          <div className={s.avatar} aria-hidden>
            {avatarSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarSrc} alt="" />
            ) : (
              <span>{getInitials(user.name)}</span>
            )}
            <span className={s.avatarRing} />
          </div>
          <div className={s.idText}>
            <h1 className={s.idName}>
              <span>{user.name ?? 'بدون نام'}</span>
              <span className={`${s.badge} ${roleBadgeClass(user.role)}`}>{roleLabel}</span>
              <span className={`${s.badge} ${statusBadgeClass(user.status)}`}>{statusLabel}</span>
            </h1>
            <div className={s.idSub}>
              <a href={`mailto:${user.email}`} dir="ltr" className="inline-flex items-center gap-1">
                <Mail className="size-3.5" aria-hidden />
                <span>{user.email}</span>
              </a>
              {user.phoneNumber ? (
                <>
                  <span className={s.idSubSep} />
                  <a
                    href={`tel:${user.phoneNumber}`}
                    dir="ltr"
                    className="inline-flex items-center gap-1"
                  >
                    <Phone className="size-3.5" aria-hidden />
                    <span>{user.phoneNumber}</span>
                  </a>
                </>
              ) : null}
              <span className={s.idSubSep} />
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="size-3.5" aria-hidden />
                <span>عضو از {formatDate(user.createdAt)}</span>
              </span>
            </div>
          </div>
        </div>

        <div className={s.heroActions}>
          {canManage ? (
            <>
              <Link href={`/dashboard/users/${user.id}/edit`}>
                <button type="button" className={s.actionBtn} data-variant="primary">
                  <Pencil className="size-3.5" aria-hidden />
                  <span>ویرایش</span>
                </button>
              </Link>
              {isPrivileged &&
              user.role !== 'OWNER' &&
              (currentUserRole !== 'SUPERADMIN' || user.role !== 'SUPERADMIN') ? (
                <RoleMenu
                  currentRole={user.role}
                  currentUserRole={currentUserRole}
                  onChange={handleRoleChange}
                  disabled={isPending}
                />
              ) : null}
              <button
                type="button"
                className={s.actionBtn}
                data-variant="danger"
                onClick={() => setShowBan(true)}
                disabled={isPending}
              >
                {user.status === 'Banned' ? (
                  <>
                    <ShieldCheck className="size-3.5" aria-hidden />
                    <span>رفع مسدودیت</span>
                  </>
                ) : (
                  <>
                    <ShieldOff className="size-3.5" aria-hidden />
                    <span>مسدود کردن</span>
                  </>
                )}
              </button>
            </>
          ) : null}
        </div>
      </div>

      {/* ── KPI strip ────────────────────────────────────────────── */}
      <div className={s.kpiGrid}>
        <KpiCard
          label="پست‌ها"
          value={user._count.posts}
          hint={`${formatNumber(user._count.posts)} مطلب`}
          icon={<FileText className="size-3.5" aria-hidden />}
        />
        <KpiCard
          label="دیدگاه‌ها"
          value={user._count.comments}
          hint={`${formatNumber(user._count.comments)} دیدگاه`}
          icon={<MessageSquare className="size-3.5" aria-hidden />}
        />
        <KpiCard
          label="نشست‌های فعال"
          value={user._count.sessions}
          hint={`${formatNumber(user._count.sessions)} نشست`}
          icon={<Smartphone className="size-3.5" aria-hidden />}
        />
        <KpiCard
          label="احراز ۲ مرحله‌ای"
          value={user.twoFactorEnabled ? 'فعال' : 'غیرفعال'}
          hint={user.twoFactorEnabled ? 'ایمن' : 'توصیه می‌شود فعال شود'}
          icon={
            user.twoFactorEnabled ? (
              <ShieldCheck className="size-3.5" aria-hidden />
            ) : (
              <ShieldAlert className="size-3.5" aria-hidden />
            )
          }
          isText
        />
        {financials ? (
          <KpiCard
            label="معاملات"
            value={financials.dealsCount}
            hint={`${formatNumber(financials.openDeals)} در جریان`}
            icon={<Activity className="size-3.5" aria-hidden />}
          />
        ) : null}
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────── */}
      <div className={s.tabs} role="tablist" aria-label="تب‌های کاربر">
        <TabButton
          active={tab === 'overview'}
          onClick={() => setTab('overview')}
          label="نمای کلی"
        />
        <TabButton
          active={tab === 'content'}
          onClick={() => setTab('content')}
          label="محتوا"
          count={user._count.posts + user._count.comments}
        />
        <TabButton
          active={tab === 'activity'}
          onClick={() => setTab('activity')}
          label="فعالیت"
          count={user._count.activities}
        />
        <TabButton active={tab === 'kyc'} onClick={() => setTab('kyc')} label="احراز هویت" />
        <TabButton
          active={tab === 'security'}
          onClick={() => setTab('security')}
          label="امنیت"
          count={user.twoFactorEnabled ? 1 : 0}
        />
      </div>

      {/* ── Content + Side rail ──────────────────────────────────── */}
      <div className={s.content}>
        <div className="flex flex-col gap-3 min-w-0">
          {tab === 'overview' ? (
            <OverviewPanel user={user} currentUserRole={currentUserRole} />
          ) : null}
          {tab === 'content' ? <ContentPanel user={user} /> : null}
          {tab === 'activity' ? <ActivityPanel user={user} /> : null}
          {tab === 'kyc' ? <KycPanel user={user} /> : null}
          {tab === 'security' ? <SecurityPanel user={user} /> : null}
        </div>

        <aside className={s.side}>
          <SummaryCard user={user} />
          {canManage ? (
            <div className={`${s.panel} ${s.dangerZone}`}>
              <div className={s.panelHeader}>
                <h3 className={`${s.panelTitle} ${s.dangerTitle}`}>
                  <ShieldAlert className="size-4" aria-hidden />
                  منطقه خطر
                </h3>
              </div>
              <div className={s.panelBody}>
                <p className={s.dangerText}>
                  عملیات‌های این بخش غیرقابل بازگشت هستند. قبل از اقدام مطمئن شوید.
                </p>
                <div className={s.dangerActions}>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowBan(true)}
                    disabled={isPending}
                    className="justify-start"
                  >
                    <ShieldOff className="size-4 ms-2" aria-hidden />
                    {user.status === 'Banned' ? 'رفع مسدودیت کاربر' : 'مسدود کردن کاربر'}
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => setShowDelete(true)}
                    disabled={isPending}
                    className="justify-start"
                  >
                    <Trash2 className="size-4 ms-2" aria-hidden />
                    حذف کامل کاربر
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </aside>
      </div>

      {/* ── Confirm dialogs ─────────────────────────────────────── */}
      <ConfirmDialog
        open={showBan}
        onOpenChange={setShowBan}
        title={user.status === 'Banned' ? 'رفع مسدودیت کاربر' : 'مسدود کردن کاربر'}
        description={
          user.status === 'Banned'
            ? `با تأیید، دسترسی ${user.name ?? user.email} به سیستم باز خواهد شد.`
            : `با تأیید، ${user.name ?? user.email} از تمام بخش‌ها مسدود خواهد شد و نمی‌تواند وارد شود.`
        }
        confirmLabel={user.status === 'Banned' ? 'رفع مسدودیت' : 'مسدود کردن'}
        cancelLabel="انصراف"
        onConfirm={handleStatusToggle}
        variant={user.status !== 'Banned' ? 'danger' : 'default'}
      />

      <ConfirmDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        title="حذف کامل کاربر"
        description={`این عملیات غیرقابل بازگشت است. ${user.name ?? user.email} و تمام داده‌های مرتبط (پست‌ها، دیدگاه‌ها، فعالیت‌ها) حذف خواهند شد.`}
        confirmLabel="حذف برای همیشه"
        cancelLabel="انصراف"
        onConfirm={handleDelete}
        variant="danger"
      />
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  hint,
  icon,
  isText = false,
}: {
  label: string;
  value: number | string;
  hint: string;
  icon: React.ReactNode;
  isText?: boolean;
}) {
  return (
    <div className={s.kpiCard}>
      <span className={s.kpiLabel}>
        {icon}
        <span>{label}</span>
      </span>
      <span className={s.kpiValue} style={isText ? { fontSize: '1.1rem' } : undefined}>
        {typeof value === 'number' ? formatNumber(value) : value}
      </span>
      <span className={s.kpiHint}>{hint}</span>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count?: number;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      data-active={active}
      className={s.tab}
      onClick={onClick}
    >
      <span>{label}</span>
      {typeof count === 'number' && count > 0 ? (
        <span className={s.tabBadge}>{count > 999 ? '۹۹۹+' : formatNumber(count)}</span>
      ) : null}
    </button>
  );
}

// ─── Section access editor (OWNER only) ────────────────────────────────────
// 2026-08-11: whitelist دسترسی‌های بخشی کاربر. فهرست خالی = پیش‌فرض نقش؛
// غیرخالی = همان بخش‌ها، دسترسیِ مؤثرِ آن کاربر (middleware + sidebar هر دو
// اعمال می‌کنند). فقط مالک می‌تواند ویرایش کند.

/** وضعیت مؤثر یک بخش با توجه به grants/denies فعلی */
type SectionAccessState =
  | 'denied' // deny کامل → کاربر به هیچ‌وجه وارد نمی‌شود
  | 'full' // همهٔ اکشن‌های بخش grant شده
  | 'view-only' // فقط `view` grant شده
  | 'partial' // ترکیبی از اکشن‌ها (نه همه، نه فقط view)
  | 'closed' // whitelist فعال ولی این بخش grant نشده → بسته
  | 'default'; // بدون grant/deny → پیش‌فرض نقش (باز)

const SECTION_STATE_LABEL: Record<SectionAccessState, string> = {
  denied: 'مسدود',
  full: 'کامل',
  'view-only': 'فقط مشاهده',
  partial: 'جزئی',
  closed: 'بسته',
  default: 'پیش‌فرض نقش',
};

const SECTION_STATE_COLOR: Record<SectionAccessState, string> = {
  denied: 'var(--at-danger)',
  full: 'var(--nova-emerald)',
  'view-only': 'var(--at-accent)',
  partial: 'var(--nova-amber)',
  closed: 'var(--at-fg-muted)',
  default: 'var(--at-fg-muted)',
};

/**
 * بخش‌های حساس — «فقط مشاهده» روی این‌ها حتی بدون ازدست‌دادن اکشن (مثلاً رفع
 * مسدودیت عمدی) هم ConfirmDialog می‌گیرد؛ جایی که اکشن‌های پرقدرت (approve،
 * create، block، manage، publish، resolve) در خطر حذف‌شدن‌اند.
 */
const SENSITIVE_VIEW_ONLY_SECTIONS = new Set<DashboardSectionKey>([
  'kyc',
  'settlements',
  'users',
  'settings',
  'roles',
  'content',
  'fraud',
]);

function SectionStateBadge({ state }: { state: SectionAccessState }) {
  const color = SECTION_STATE_COLOR[state];
  return (
    <span
      style={{
        fontSize: '9.5px',
        fontWeight: 700,
        lineHeight: 1,
        padding: '3px 6px',
        borderRadius: '999px',
        whiteSpace: 'nowrap',
        color,
        border: `1px solid color-mix(in oklch, ${color} 45%, transparent)`,
        background: `color-mix(in oklch, ${color} 12%, transparent)`,
      }}
    >
      {SECTION_STATE_LABEL[state]}
    </span>
  );
}

function SummaryChip({
  label,
  text,
  color,
  routes,
}: {
  label: string;
  text: string;
  color: string;
  routes: readonly string[];
}) {
  return (
    <span
      title={routes.length > 0 ? routes.join('\n') : undefined}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '11px',
        fontWeight: 600,
        color,
        padding: '4px 9px',
        borderRadius: '8px',
        border: `1px solid color-mix(in oklch, ${color} 40%, transparent)`,
        background: `color-mix(in oklch, ${color} 10%, transparent)`,
        whiteSpace: 'nowrap',
        cursor: routes.length > 0 ? 'help' : 'default',
      }}
    >
      <span style={{ opacity: 0.7 }}>{label}:</span>
      <span>{text}</span>
    </span>
  );
}

function SectionAccessEditor({ user }: { user: UserDetailPayload }) {
  const { toast } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // grants: بخش → Set<اکشن>. کلید سطح بخش (مثلاً `kyc`) به همهٔ اکشن‌ها باز می‌شود.
  const expandGrants = (keys: string[]): Map<DashboardSectionKey, Set<SectionActionKey>> => {
    const map = new Map<DashboardSectionKey, Set<SectionActionKey>>();
    for (const key of keys) {
      if (!isKnownPermissionKey(key)) continue;
      const section = sectionOfKey(key) as DashboardSectionKey;
      const hasAction = key.includes(':');
      if (!hasAction) {
        map.set(section, new Set(actionsOfSection(section)));
      } else {
        const action = key.split(':')[1] as SectionActionKey;
        const set = new Set(map.get(section) ?? []);
        set.add(action);
        map.set(section, set);
      }
    }
    return map;
  };

  const [grants, setGrants] = useState(() => expandGrants(user.permissions));
  const [denies, setDenies] = useState<Set<DashboardSectionKey>>(
    () => new Set(user.deniedPermissions.filter(isKnownSectionKey)),
  );
  const hasOverride = [...grants.values()].some((actions) => actions.size > 0) || denies.size > 0;

  // خلاصهٔ زندهٔ تأثیر whitelist/deny فعلی روی بخش‌ها و مسیرهای کاربر.
  const summary = useMemo(() => {
    const states = new Map<DashboardSectionKey, SectionAccessState>();
    const whitelistActive = grants.size > 0;
    let openSections = 0;
    let blockedSections = 0;
    let defaultSections = 0;
    let closedSections = 0;
    const openRoutes: string[] = [];
    const blockedRoutes: string[] = [];
    for (const section of DASHBOARD_SECTIONS) {
      const denied = denies.has(section.key);
      const granted = grants.get(section.key) ?? new Set<SectionActionKey>();
      let state: SectionAccessState;
      if (denied) {
        state = 'denied';
        blockedSections += 1;
        blockedRoutes.push(...routesForSection(section.key));
      } else if (granted.size > 0) {
        const all = actionsOfSection(section.key).length;
        state =
          granted.size === all
            ? 'full'
            : granted.size === 1 && granted.has('view')
              ? 'view-only'
              : 'partial';
        openSections += 1;
        openRoutes.push(...routesForSection(section.key));
      } else if (whitelistActive) {
        // whitelist فعال + این بخش grant نشده → deny-by-default
        state = 'closed';
        closedSections += 1;
      } else {
        state = 'default';
        defaultSections += 1;
        // در حالت پیش‌فرض نقش، همهٔ بخش‌های غیرمسدود عملاً باز هستند
        openSections += 1;
        openRoutes.push(...routesForSection(section.key));
      }
      states.set(section.key, state);
    }
    return {
      states,
      whitelistActive,
      openSections,
      blockedSections,
      defaultSections,
      closedSections,
      openRoutes,
      blockedRoutes,
    };
  }, [grants, denies]);

  const toggleGrant = (section: DashboardSectionKey, action: SectionActionKey) => {
    setGrants((prev) => {
      const next = new Map(prev);
      const set = new Set(next.get(section) ?? []);
      if (set.has(action)) set.delete(action);
      else set.add(action);
      if (set.size === 0) next.delete(section);
      else next.set(section, set);
      return next;
    });
  };

  const toggleDeny = (section: DashboardSectionKey) => {
    setDenies((prev) => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  };

  // فقط مشاهده: همهٔ اکشن‌های بخش به `view` کاهش می‌یابد و deny برداشته می‌شود
  const setViewOnly = (section: DashboardSectionKey) => {
    setGrants((prev) => {
      const next = new Map(prev);
      next.set(section, new Set<SectionActionKey>(['view']));
      return next;
    });
    setDenies((prev) => {
      const next = new Set(prev);
      next.delete(section);
      return next;
    });
  };

  // ── Confirm برای «فقط مشاهده» در حالت‌های پرمخاطره ────────────────────────
  const [viewOnlyTarget, setViewOnlyTarget] = useState<DashboardSectionKey | null>(null);

  // ── Confirm برای «بازگشت به پیش‌فرض نقش» — حذف همهٔ grants/denies ────────
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // مسیرهای بازشدهٔ هر ردیف (فقط برای بخش‌های «بسته/مسدود» نمایش داده می‌شود)
  const [expandedRoutes, setExpandedRoutes] = useState<Set<DashboardSectionKey>>(new Set());
  const toggleExpandedRoutes = (section: DashboardSectionKey) => {
    setExpandedRoutes((prev) => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  };

  const needsViewOnlyConfirm = (section: DashboardSectionKey): boolean => {
    const granted = grants.get(section) ?? new Set<SectionActionKey>();
    const losing = [...granted].filter((a) => a !== 'view');
    // اکشن غیر-view در این بخش grant شده → با «فقط مشاهده» حذف می‌شود
    if (losing.length > 0) return true;
    // اولین grant در کل ویرایشگر → whitelist فعال می‌شود و بقیهٔ بخش‌ها بسته می‌شوند
    if (grants.size === 0) return true;
    // رفع مسدودیت عمدی یک بخش حساس (مثل KYC یا تسویه)
    if (SENSITIVE_VIEW_ONLY_SECTIONS.has(section) && denies.has(section)) return true;
    return false;
  };

  const requestViewOnly = (section: DashboardSectionKey) => {
    if (needsViewOnlyConfirm(section)) setViewOnlyTarget(section);
    else setViewOnly(section);
  };

  const viewOnlyDescription = (section: DashboardSectionKey): string => {
    const label = DASHBOARD_SECTIONS.find((s) => s.key === section)?.label ?? section;
    const granted = grants.get(section);
    const losing = granted ? [...granted].filter((a) => a !== 'view') : [];
    const parts: string[] = [];
    if (losing.length > 0)
      parts.push(`اکشن ${losing.map((a) => ACTION_LABELS[a]).join('، ')} برداشته می‌شود`);
    if (denies.has(section)) parts.push('مسدودیت بخش برداشته می‌شود');
    if (grants.size === 0) parts.push('با فعال‌شدن whitelist، دسترسی بقیهٔ بخش‌ها بسته می‌شود');
    if (parts.length === 0) parts.push('دسترسی بخش فقط به مشاهده محدود می‌شود');
    return `بخش «${label}» — ${parts.join('؛ ')}. با تأیید، این تغییر بلافاصله ذخیره می‌شود.`;
  };

  // تأیید «فقط مشاهده» → اعمال تغییر روی state و ذخیرهٔ خودکار همان لحظه
  const confirmViewOnly = () => {
    if (!viewOnlyTarget) return;
    const section = viewOnlyTarget;
    const nextGrants = new Map(grants);
    nextGrants.set(section, new Set<SectionActionKey>(['view']));
    const nextDenies = new Set(denies);
    nextDenies.delete(section);
    setViewOnly(section);
    save(flattenGrants(nextGrants), [...nextDenies]);
    setViewOnlyTarget(null);
  };

  // توضیح داینامیک «بازگشت به پیش‌فرض نقش» بر اساس وضعیت فعلی
  const resetDescription = (): string => {
    const parts: string[] = [];
    if (grants.size > 0)
      parts.push(
        'در حالت whitelist، همهٔ بخش‌ها (از جمله بخش‌های بسته) طبق نقش کاربر دوباره باز می‌شوند',
      );
    if (denies.size > 0) parts.push('مسدودیت‌های بخشی هم برداشته می‌شوند');
    return parts.join(' و ');
  };

  // فشرده‌سازی: همهٔ اکشن‌های یک بخش → کلید بخش؛ در غیر این صورت کلیدهای اکشن
  const flattenGrants = (
    source: Map<DashboardSectionKey, Set<SectionActionKey>> = grants,
  ): string[] => {
    const out: string[] = [];
    for (const [section, actions] of source) {
      const all = actionsOfSection(section);
      if (actions.size === all.length) out.push(section);
      else for (const a of actions) out.push(actionKey(section, a));
    }
    return out;
  };

  const save = (g: string[], d: string[]) => {
    startTransition(async () => {
      const res = await updateUserPermissions(user.id, g, d);
      if (res.success) {
        toast({ title: 'ذخیره شد', description: res.message });
        router.refresh();
      } else {
        toast({ title: 'خطا', description: res.message, variant: 'destructive' });
      }
    });
  };

  return (
    <div className={s.panel}>
      <div className={s.panelHeader}>
        <h3 className={s.panelTitle}>
          <Shield className="size-4" aria-hidden />
          دسترسی‌های بخشی
        </h3>
        <span className={`${s.badge} ${hasOverride ? s.badgeOk : s.badgeOff}`}>
          {hasOverride ? 'سفارشی (اکشن‌ها)' : 'پیش‌فرض نقش'}
        </span>
      </div>
      <div className={s.panelBody}>
        <p
          style={{
            margin: 0,
            fontSize: '12px',
            color: 'var(--at-fg-muted)',
            lineHeight: 1.7,
          }}
        >
          نقش کاربر ({ROLE_LABELS[user.role]}) مبنای دسترسی است. با انتخاب اکشن‌ها در «فقط این
          بخش‌ها»، دسترسی کاربر به همان اکشن‌ها محدود می‌شود (whitelist) — مثلاً «تأیید KYC» بدون
          «مشتریان». با «مسدود» بخشی از دسترسی او کم می‌شود حتی اگر نقش اجازه بدهد. deny بر grant
          اولویت دارد. با «فقط مشاهده» همهٔ اکشن‌های یک بخش در یک کلیک به مشاهده کاهش می‌یابد و مسدودیت
          برداشته می‌شود. خالی = پیش‌فرض نقش.
        </p>

        {/* خلاصهٔ زندهٔ تأثیر بر بخش‌ها و مسیرها */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            marginTop: '12px',
            padding: '10px 12px',
            borderRadius: '10px',
            border: '1px solid var(--at-line)',
            background: 'color-mix(in oklch, var(--at-surface-2) 45%, transparent)',
          }}
        >
          <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--at-fg)' }}>
            {summary.whitelistActive
              ? 'حالت whitelist فعال است — دسترسی کاربر فقط به همین بخش‌های انتخاب‌شده است'
              : 'پیش‌فرض نقش — کاربر به همهٔ بخش‌های غیرمسدود دسترسی دارد'}{' '}
            <span style={{ fontWeight: 500, color: 'var(--at-fg-muted)' }}>
              — مسیرهای شخصی (پروفایل، کیف پول، انتقال و…) مستقل از این تنظیمات همیشه باز هستند.
            </span>
          </span>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <SummaryChip
              label="باز"
              text={`${summary.openSections} بخش · ${summary.openRoutes.length} مسیر`}
              color="var(--nova-emerald)"
              routes={summary.openRoutes}
            />
            <SummaryChip
              label="مسدود"
              text={`${summary.blockedSections} بخش · ${summary.blockedRoutes.length} مسیر`}
              color="var(--at-danger)"
              routes={summary.blockedRoutes}
            />
            <SummaryChip
              label="همیشه باز"
              text={`${ALWAYS_ALLOWED_ROUTES.length} مسیر شخصی`}
              color="var(--nova-violet)"
              routes={ALWAYS_ALLOWED_ROUTES}
            />
            {summary.whitelistActive && summary.closedSections > 0 ? (
              <SummaryChip
                label="بسته"
                text={`${summary.closedSections} بخش`}
                color="var(--at-fg-muted)"
                routes={[]}
              />
            ) : null}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            marginTop: '12px',
          }}
        >
          {DASHBOARD_SECTIONS.map((section) => {
            const denied = denies.has(section.key);
            const sectionGrants = grants.get(section.key) ?? new Set<SectionActionKey>();
            const accessState = summary.states.get(section.key) ?? 'default';
            const showRoutes = accessState === 'closed' || accessState === 'denied';
            const routesOpen = expandedRoutes.has(section.key);
            const sectionRoutes = routesForSection(section.key);
            return (
              <div
                key={section.key}
                className={s.accessRow}
                style={{
                  background: denied
                    ? 'color-mix(in oklch, var(--at-danger) 6%, transparent)'
                    : sectionGrants.size > 0
                      ? 'color-mix(in oklch, var(--at-accent) 4%, transparent)'
                      : 'transparent',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    minWidth: 0,
                  }}
                >
                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: 'var(--at-fg)',
                    }}
                  >
                    {section.label}
                    <SectionStateBadge state={accessState} />
                  </span>

                  {/* مسیرهای بخش برای وضعیت «بسته/مسدود» — جمع‌شده با امکان بازشدن */}
                  {showRoutes && (
                    <button
                      type="button"
                      onClick={() => toggleExpandedRoutes(section.key)}
                      title="مسیرهای این بخش را نشان بده"
                      aria-expanded={routesOpen}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        alignSelf: 'flex-start',
                        padding: '2px 6px',
                        borderRadius: '6px',
                        border: '1px solid var(--at-line)',
                        background: 'transparent',
                        fontSize: '9.5px',
                        fontWeight: 600,
                        color: 'var(--at-fg-muted)',
                        cursor: 'pointer',
                      }}
                    >
                      <Route size={10} aria-hidden />
                      {sectionRoutes.length} مسیر
                      <ChevronDown
                        size={10}
                        aria-hidden
                        style={{
                          transform: routesOpen ? 'rotate(180deg)' : undefined,
                          transition: 'transform 120ms',
                        }}
                      />
                    </button>
                  )}
                  {showRoutes && routesOpen && (
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1px',
                        paddingInlineStart: '2px',
                      }}
                    >
                      {sectionRoutes.map((r) => (
                        <code
                          key={r}
                          dir="ltr"
                          style={{
                            fontSize: '9.5px',
                            color: 'var(--at-fg-muted)',
                            opacity: 0.8,
                            textAlign: 'start',
                          }}
                        >
                          {r}
                        </code>
                      ))}
                    </div>
                  )}
                </div>
                <div className={s.accessRowActions}>
                  {section.actions.map((action) => {
                    const on = sectionGrants.has(action);
                    return (
                      <label
                        key={action}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '4px 8px',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          border: '1px solid var(--at-line)',
                          background: on
                            ? 'color-mix(in oklch, var(--at-accent) 14%, transparent)'
                            : 'transparent',
                          fontSize: '11px',
                          fontWeight: on ? 700 : 500,
                          color: on ? 'var(--at-fg)' : 'var(--at-fg-muted)',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={on}
                          onChange={() => toggleGrant(section.key, action)}
                          disabled={isPending || denied}
                        />
                        {ACTION_LABELS[action]}
                      </label>
                    );
                  })}
                </div>
                <div className={s.accessRowTools}>
                  <button
                    type="button"
                    onClick={() => requestViewOnly(section.key)}
                    disabled={isPending}
                    title="همهٔ اکشن‌های این بخش فقط به مشاهده کاهش می‌یابد"
                    className={s.accessToolBtn}
                  >
                    <Eye size={11} aria-hidden />
                    فقط مشاهده
                  </button>
                  <label
                    className={s.accessDenyLabel}
                    style={{
                      fontWeight: denied ? 700 : 500,
                      color: denied ? 'var(--at-danger)' : 'var(--at-fg-muted)',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={denied}
                      onChange={() => toggleDeny(section.key)}
                      disabled={isPending}
                    />
                    مسدود
                  </label>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: '8px', marginTop: '14px', flexWrap: 'wrap' }}>
          <Button size="sm" onClick={() => save(flattenGrants(), [...denies])} disabled={isPending}>
            ذخیره دسترسی‌ها
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowResetConfirm(true)}
            disabled={isPending || !hasOverride}
            title={!hasOverride ? 'دسترسی خاصی تنظیم نشده است' : undefined}
          >
            بازگشت به پیش‌فرض نقش (حذف همه)
          </Button>
        </div>

        <ConfirmDialog
          open={showResetConfirm}
          onOpenChange={(o) => {
            if (!o) setShowResetConfirm(false);
          }}
          title="بازگشت به پیش‌فرض نقش؟"
          description={`همهٔ دسترسی‌های بخشی این کاربر حذف می‌شود؛ ${resetDescription()}.`}
          confirmLabel="حذف همه و بازگشت"
          cancelLabel="انصراف"
          variant="danger"
          onConfirm={() => {
            save([], []);
            setShowResetConfirm(false);
          }}
        />
        <ConfirmDialog
          open={viewOnlyTarget !== null}
          onOpenChange={(o) => {
            if (!o) setViewOnlyTarget(null);
          }}
          title={
            viewOnlyTarget
              ? `فقط مشاهده برای «${DASHBOARD_SECTIONS.find((s) => s.key === viewOnlyTarget)?.label ?? viewOnlyTarget}»؟`
              : ''
          }
          description={viewOnlyTarget ? viewOnlyDescription(viewOnlyTarget) : ''}
          confirmLabel="فقط مشاهده"
          cancelLabel="انصراف"
          variant="danger"
          onConfirm={confirmViewOnly}
        />
      </div>
    </div>
  );
}

function OverviewPanel({
  user,
  currentUserRole,
}: {
  user: UserDetailPayload;
  currentUserRole: string;
}) {
  return (
    <>
      {currentUserRole === 'OWNER' && user.role !== 'OWNER' ? (
        <SectionAccessEditor user={user} />
      ) : null}
      <div className={s.panel}>
        <div className={s.panelHeader}>
          <h3 className={s.panelTitle}>
            <CircleUserRound className="size-4" aria-hidden />
            اطلاعات هویتی
          </h3>
        </div>
        <div className={s.panelBody}>
          <dl className={s.dl}>
            <dt>
              <Mail className="size-3.5" aria-hidden />
              <span>ایمیل</span>
            </dt>
            <dd dir="ltr" className="text-start">
              {user.email}
            </dd>

            <dt>
              {user.emailVerified ? (
                <MailCheck className="size-3.5" aria-hidden />
              ) : (
                <MailX className="size-3.5" aria-hidden />
              )}
              <span>تأیید ایمیل</span>
            </dt>
            <dd>
              <span className={`${s.badge} ${user.emailVerified ? s.badgeOk : s.badgeOff}`}>
                {user.emailVerified
                  ? `تأیید شده · ${formatDate(user.emailVerified)}`
                  : 'تأیید نشده'}
              </span>
            </dd>

            <dt>
              <Phone className="size-3.5" aria-hidden />
              <span>تلفن</span>
            </dt>
            <dd dir="ltr" className="text-start">
              {user.phoneNumber ?? '—'}
            </dd>

            <dt>
              <UserMinus className="size-3.5" aria-hidden />
              <span>نقش</span>
            </dt>
            <dd>
              <span className={`${s.badge} ${roleBadgeClass(user.role)}`}>
                {ROLE_LABELS[user.role] ?? user.role}
              </span>
            </dd>

            <dt>
              <Shield className="size-3.5" aria-hidden />
              <span>وضعیت</span>
            </dt>
            <dd>
              <span className={`${s.badge} ${statusBadgeClass(user.status)}`}>
                {STATUS_LABELS[user.status] ?? user.status}
              </span>
            </dd>

            <dt>
              <CalendarDays className="size-3.5" aria-hidden />
              <span>تاریخ عضویت</span>
            </dt>
            <dd>{formatDateTime(user.createdAt)}</dd>

            <dt>
              <CalendarDays className="size-3.5" aria-hidden />
              <span>آخرین به‌روزرسانی</span>
            </dt>
            <dd>{formatDateTime(user.updatedAt)}</dd>
          </dl>
        </div>
      </div>

      {user.profile ? (
        <div className={s.panel}>
          <div className={s.panelHeader}>
            <h3 className={s.panelTitle}>
              <FileText className="size-4" aria-hidden />
              پروفایل عمومی
              <small>نمایش برای دیگران در سایت</small>
            </h3>
          </div>
          <div className={s.panelBody}>
            <dl className={s.dl}>
              <dt>شغل</dt>
              <dd>{user.profile.jobName ?? '—'}</dd>
              <dt>شرکت</dt>
              <dd>{user.profile.company ?? '—'}</dd>
              <dt>درباره</dt>
              <dd>{user.profile.bio ?? '—'}</dd>
            </dl>
          </div>
        </div>
      ) : null}
    </>
  );
}

function ContentPanel({ user }: { user: UserDetailPayload }) {
  return (
    <>
      <div className={s.panel}>
        <div className={s.panelHeader}>
          <h3 className={s.panelTitle}>
            <FileText className="size-4" aria-hidden />
            آخرین پست‌ها
            <small>{formatNumber(user._count.posts)} پست در مجموع</small>
          </h3>
        </div>
        <div className={s.panelBody} data-dense="true">
          {user.recentPosts.length === 0 ? (
            <div className={s.listEmpty}>پستی ثبت نشده است.</div>
          ) : (
            <div className={s.list}>
              {user.recentPosts.map((post) => (
                <div key={post.id} className={s.listItem}>
                  <div className={s.listIcon}>
                    <FileText className="size-4" aria-hidden />
                  </div>
                  <div className={s.listText}>
                    {/* C3-fix: /dashboard/posts/[id] صفحه ندارد → 404. صفحهٔ
                        ویرایش پست (edit/[postId]) مقصد صحیح است. */}
                    <Link
                      href={`/dashboard/posts/edit/${post.id}`}
                      className={s.listTitle}
                      style={{ textDecoration: 'none' }}
                    >
                      {post.title}
                    </Link>
                    <span className={s.listSub}>
                      {formatNumber(post._count.comments)} دیدگاه ·{' '}
                      {formatNumber(post._count.likes)} پسند
                    </span>
                  </div>
                  <span className={s.listMeta}>
                    <span
                      className={`${s.badge} ${post.status === 'PUBLISHED' ? s.badgeOk : s.badgePending}`}
                    >
                      {POST_STATUS_LABELS[post.status] ?? post.status}
                    </span>
                    <span>{timeAgo(post.createdAt)}</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className={s.panel}>
        <div className={s.panelHeader}>
          <h3 className={s.panelTitle}>
            <MessageSquare className="size-4" aria-hidden />
            آخرین دیدگاه‌ها
            <small>{formatNumber(user._count.comments)} دیدگاه در مجموع</small>
          </h3>
        </div>
        <div className={s.panelBody} data-dense="true">
          {user.recentComments.length === 0 ? (
            <div className={s.listEmpty}>دیدگاهی ثبت نشده است.</div>
          ) : (
            <div className={s.list}>
              {user.recentComments.map((c) => (
                <div key={c.id} className={s.listItem}>
                  <div className={s.listIcon}>
                    <MessageSquare className="size-4" aria-hidden />
                  </div>
                  <div className={s.listText}>
                    {/* C3-fix: /dashboard/posts/[id] صفحه ندارد → 404. */}
                    <Link
                      href={`/dashboard/posts/edit/${c.post.id}`}
                      className={s.listTitle}
                      style={{ textDecoration: 'none' }}
                    >
                      {c.post.title}
                    </Link>
                    <span className={s.listSub}>{c.content.slice(0, 120)}</span>
                  </div>
                  <span className={s.listMeta}>
                    <Link
                      href={`/dashboard/posts/edit/${c.post.id}`}
                      className="inline-flex items-center gap-1"
                      style={{ color: 'inherit' }}
                    >
                      <Link2 className="size-3" aria-hidden />
                      <span>مشاهده</span>
                    </Link>
                    <span>{timeAgo(c.createdAt)}</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function ActivityPanel({ user }: { user: UserDetailPayload }) {
  return (
    <div className={s.panel}>
      <div className={s.panelHeader}>
        <h3 className={s.panelTitle}>
          <Activity className="size-4" aria-hidden />
          گزارش فعالیت
          <small>{formatNumber(user._count.activities)} فعالیت ثبت شده</small>
        </h3>
      </div>
      <div className={s.panelBody} data-dense="true">
        {user.recentActivities.length === 0 ? (
          <div className={s.listEmpty}>هنوز فعالیتی ثبت نشده است.</div>
        ) : (
          <div className={s.list}>
            {user.recentActivities.map((a) => (
              <div key={a.id} className={s.listItem}>
                <div className={s.listIcon}>
                  <Activity className="size-4" aria-hidden />
                </div>
                <div className={s.listText}>
                  <span className={s.listTitle}>{a.action}</span>
                  <span className={s.listSub}>{a.details}</span>
                </div>
                <span className={s.listMeta}>
                  <span title={formatDateTime(a.createdAt)}>{timeAgo(a.createdAt)}</span>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function KycPanel({ user }: { user: UserDetailPayload }) {
  const kyc = user.kycRecord;
  const kycStatus = !kyc
    ? 'NOT_STARTED'
    : kyc.reviewedAt
      ? kyc.rejectedReason
        ? 'REJECTED'
        : kyc.expiresAt && kyc.expiresAt < new Date()
          ? 'EXPIRED'
          : 'APPROVED'
      : 'PENDING';

  const kycLabel: Record<string, string> = {
    NOT_STARTED: 'شروع نشده',
    PENDING: 'در انتظار بررسی',
    APPROVED: 'تأیید شده',
    REJECTED: 'رد شده',
    EXPIRED: 'منقضی شده',
  };

  const kycClass: Record<string, string> = {
    NOT_STARTED: s.badgeUser,
    PENDING: s.badgePending,
    APPROVED: s.badgeOk,
    REJECTED: s.badgeBanned,
    EXPIRED: s.badgeRejected,
  };

  return (
    <div className={s.panel}>
      <div className={s.panelHeader}>
        <h3 className={s.panelTitle}>
          <ShieldCheck className="size-4" aria-hidden />
          وضعیت احراز هویت (KYC)
        </h3>
        <span className={`${s.badge} ${kycClass[kycStatus]}`}>{kycLabel[kycStatus]}</span>
      </div>
      <div className={s.panelBody}>
        {kyc ? (
          <dl className={s.dl}>
            <dt>نام ثبت شده</dt>
            <dd>{kyc.fullName ?? '—'}</dd>
            <dt>تاریخ ارسال</dt>
            <dd>{formatDateTime(kyc.submittedAt)}</dd>
            <dt>تاریخ بررسی</dt>
            <dd>{kyc.reviewedAt ? formatDateTime(kyc.reviewedAt) : '—'}</dd>
            <dt>انقضا</dt>
            <dd>{kyc.expiresAt ? formatDate(kyc.expiresAt) : '—'}</dd>
            {kyc.rejectedReason ? (
              <>
                <dt>دلیل رد</dt>
                <dd className="text-rose-500">{kyc.rejectedReason}</dd>
              </>
            ) : null}
          </dl>
        ) : (
          <div className={s.notice}>
            <Shield className="size-4" aria-hidden />
            <span>این کاربر هنوز هیچ درخواست احراز هویتی ارسال نکرده است.</span>
          </div>
        )}
      </div>
    </div>
  );
}

function SecurityPanel({ user }: { user: UserDetailPayload }) {
  return (
    <>
      <div className={s.panel}>
        <div className={s.panelHeader}>
          <h3 className={s.panelTitle}>
            <Shield className="size-4" aria-hidden />
            احراز ۲ مرحله‌ای
          </h3>
          <span className={`${s.badge} ${user.twoFactorEnabled ? s.badgeOk : s.badgeOff}`}>
            {user.twoFactorEnabled ? 'فعال' : 'غیرفعال'}
          </span>
        </div>
        <div className={s.panelBody}>
          {user.twoFactorEnabled ? (
            <div className={s.notice}>
              <ShieldCheck className="size-4" aria-hidden />
              <span>کاربر با اپلیکیشن احرازکننده وارد می‌شود. کدهای پشتیبان در دسترس اوست.</span>
            </div>
          ) : (
            <div className={s.notice}>
              <ShieldAlert className="size-4" aria-hidden />
              <span>
                احراز ۲ مرحله‌ای غیرفعال است. برای افزایش امنیت حساب، فعال‌سازی آن توصیه می‌شود.
              </span>
            </div>
          )}
        </div>
      </div>

      <div className={s.panel}>
        <div className={s.panelHeader}>
          <h3 className={s.panelTitle}>
            <Smartphone className="size-4" aria-hidden />
            نشست‌ها و دستگاه‌ها
            <small>{formatNumber(user._count.sessions)} نشست ثبت شده</small>
          </h3>
        </div>
        <div className={s.panelBody} data-dense="true">
          {user.lastSession ? (
            <div className={s.list}>
              <div className={s.listItem}>
                <div className={s.listIcon}>
                  <Smartphone className="size-4" aria-hidden />
                </div>
                <div className={s.listText}>
                  <span className={s.listTitle}>آخرین نشست</span>
                  <span className={`${s.listSub} text-start`} dir="ltr">
                    {user.lastSession.deviceId ?? 'دستگاه ناشناس'}
                  </span>
                </div>
                <span className={s.listMeta}>
                  <span title={formatDateTime(user.lastSession.expires)}>
                    انقضا: {formatDate(user.lastSession.expires)}
                  </span>
                </span>
              </div>
            </div>
          ) : (
            <div className={s.listEmpty}>نشست فعالی ثبت نشده است.</div>
          )}
        </div>
      </div>

      <div className={s.panel}>
        <div className={s.panelHeader}>
          <h3 className={s.panelTitle}>
            <KeyRound className="size-4" aria-hidden />
            حساب‌های متصل
            <small>{formatNumber(user._count.accounts)} حساب OAuth</small>
          </h3>
        </div>
        <div className={s.panelBody}>
          {user._count.accounts > 0 ? (
            <div className={s.notice}>
              <Wallet className="size-4" aria-hidden />
              <span>
                این کاربر {formatNumber(user._count.accounts)} حساب OAuth (Google/GitHub/...) متصل
                دارد.
              </span>
            </div>
          ) : (
            <div className={s.notice}>این کاربر فقط با ایمیل و رمز عبور وارد می‌شود.</div>
          )}
        </div>
      </div>
    </>
  );
}

function SummaryCard({ user }: { user: UserDetailPayload }) {
  return (
    <div className={s.panel}>
      <div className={s.panelHeader}>
        <h3 className={s.panelTitle}>
          <Eye className="size-4" aria-hidden />
          خلاصه
        </h3>
      </div>
      <div className={s.panelBody}>
        <dl className={s.dl}>
          <dt>شناسه</dt>
          <dd dir="ltr" className="text-start font-mono text-xs">
            {user.id}
          </dd>
          <dt>نقش</dt>
          <dd>
            <span className={`${s.badge} ${roleBadgeClass(user.role)}`}>
              {ROLE_LABELS[user.role] ?? user.role}
            </span>
          </dd>
          <dt>وضعیت</dt>
          <dd>
            <span className={`${s.badge} ${statusBadgeClass(user.status)}`}>
              {STATUS_LABELS[user.status] ?? user.status}
            </span>
          </dd>
          <dt>۲FA</dt>
          <dd>
            <span className={`${s.badge} ${user.twoFactorEnabled ? s.badgeOk : s.badgeOff}`}>
              {user.twoFactorEnabled ? 'فعال' : 'غیرفعال'}
            </span>
          </dd>
          <dt>ایمیل تأیید</dt>
          <dd>
            <span className={`${s.badge} ${user.emailVerified ? s.badgeOk : s.badgeOff}`}>
              {user.emailVerified ? 'بله' : 'خیر'}
            </span>
          </dd>
          <dt>عضویت</dt>
          <dd>{formatDate(user.createdAt)}</dd>
        </dl>
      </div>
    </div>
  );
}

// ─── Role menu (OWNER/SUPERADMIN only) ──────────────────────────────────

function RoleMenu({
  currentRole,
  currentUserRole,
  onChange,
  disabled,
}: {
  currentRole: string;
  currentUserRole: string;
  onChange: (r: 'USER' | 'AUTHOR' | 'SUPPORT' | 'ADMIN' | 'SUPERADMIN') => void;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  // SUPERADMIN قابل اعطا فقط توسط OWNER است — سوپرادمین خودش نمی‌تواند
  // سوپرادمین دیگری بسازد (سرور هم همین را enforce می‌کند).
  const canGrantSuperAdmin = currentUserRole === 'OWNER';
  const options: Array<{
    value: 'USER' | 'AUTHOR' | 'SUPPORT' | 'ADMIN' | 'SUPERADMIN';
    label: string;
  }> = [
    { value: 'USER', label: 'کاربر' },
    { value: 'AUTHOR', label: 'نویسنده' },
    { value: 'SUPPORT', label: 'پشتیبانی' },
    { value: 'ADMIN', label: 'مدیر' },
    ...(canGrantSuperAdmin ? [{ value: 'SUPERADMIN' as const, label: 'سوپرادمین' }] : []),
  ];

  return (
    <div className="relative">
      <button
        type="button"
        className={s.actionBtn}
        onClick={() => setOpen((o) => !o)}
        disabled={disabled}
      >
        <Shield className="size-3.5" aria-hidden />
        <span>تغییر نقش</span>
        <ChevronRight
          className="size-3.5 transition-transform"
          style={{ transform: open ? 'rotate(-90deg)' : 'rotate(90deg)' }}
          aria-hidden
        />
      </button>
      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setOpen(false)}
            aria-label="بستن منو"
          />
          <div
            className="absolute top-full mt-1 left-0 z-50 min-w-[160px] rounded-xl border shadow-lg overflow-hidden"
            style={{
              background: 'var(--at-surface-1)',
              borderColor: 'var(--at-line)',
            }}
          >
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className="w-full text-right px-3 py-2 text-sm flex items-center justify-between hover:bg-[color:var(--at-surface-2)] transition-colors"
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                disabled={opt.value === currentRole}
                style={{
                  color: opt.value === currentRole ? 'var(--at-fg-muted)' : 'var(--at-fg)',
                  fontWeight: opt.value === currentRole ? 500 : 600,
                }}
              >
                <span>{opt.label}</span>
                {opt.value === currentRole ? <span className="text-xs">فعلی</span> : null}
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
