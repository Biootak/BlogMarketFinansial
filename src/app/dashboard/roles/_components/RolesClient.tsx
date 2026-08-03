'use client';

/**
 * RolesClient — مدیریت نقش‌های پلتفرم
 *
 * ساختار:
 * - Hero tile: آمار کلی + hierarchy نمایش
 * - Role cards: کارت هر نقش با user count + hierarchy badge
 * - User drawer: لیست کاربران یک نقش + inline role change
 */

import {
  type RoleStat,
  type RoleUserRow,
  getUsersByRole,
  updateUserRole,
} from '@/actions/role-actions';
import { ConfirmDialog, MillionDollarEmpty } from '@/components/Dashboard/primitives';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Role } from '@prisma/client';
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Lock,
  Search,
  Shield,
  ShieldCheck,
  X,
} from 'lucide-react';
import React, { useCallback, useMemo, useRef, useState, useTransition } from 'react';
import s from './RolesClient.module.css';

// ─── Constants ────────────────────────────────────────────────────────────────

const ROLE_FA: Record<string, string> = {
  USER: 'کاربر عادی',
  AUTHOR: 'نویسنده',
  SUPPORT: 'پشتیبانی',
  ADMIN: 'مدیر',
  OWNER: 'مالک',
  SUPERADMIN: 'سوپرادمین',
};

const ROLE_DESC: Record<string, string> = {
  USER: 'دسترسی پایه — مشاهده محتوا، پروفایل شخصی و خدمات فین‌تک.',
  AUTHOR: 'نویسنده وبلاگ — ایجاد و مدیریت پست‌ها و دسته‌بندی‌ها.',
  SUPPORT: 'تیم پشتیبانی — مشاهده read-only موجودیت‌های حساس.',
  ADMIN: 'مدیر پلتفرم — مدیریت کامل کاربران و محتوا.',
  OWNER: 'مالک سیستم — دسترسی کامل به همه بخش‌ها.',
  SUPERADMIN: 'سوپرادمین — alias برای OWNER، دسترسی کامل.',
};

const ROLE_COLOR: Record<string, string> = {
  USER: 'var(--nova-cyan)',
  AUTHOR: 'var(--nova-violet)',
  SUPPORT: 'var(--nova-emerald)',
  ADMIN: 'var(--ds-brand-500)',
  OWNER: 'var(--ds-brand-700)',
  SUPERADMIN: 'var(--nova-rose)',
};

const HIERARCHY_LABEL: Record<number, string> = {
  4: 'سطح ۴',
  3: 'سطح ۳',
  2: 'سطح ۲',
  1: 'سطح ۱',
  0: 'فین‌تک',
};

// نقش‌هایی که در این UI قابل اعطا هستند (hierarchy < 4)
const ASSIGNABLE: Role[] = [Role.USER, Role.AUTHOR, Role.SUPPORT, Role.ADMIN];

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  stats: RoleStat[];
  currentUserRole: string;
}

// ─── Hierarchy Arc SVG ────────────────────────────────────────────────────────

function HierarchyBar({ level, maxLevel = 4 }: { level: number; maxLevel?: number }) {
  return (
    <div className={s.hBar} aria-label={`سطح ${level} از ${maxLevel}`} role="img">
      {[...Array(maxLevel).keys()].map((i) => (
        <span
          key={`h${i}`}
          className={`${s.hBarSegment} ${i < level ? s.hBarSegmentOn : ''}`}
          aria-hidden
        />
      ))}
    </div>
  );
}

// ─── Role Card ────────────────────────────────────────────────────────────────

function RoleCard({
  stat,
  isSelected,
  onSelect,
}: {
  stat: RoleStat;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const color = ROLE_COLOR[stat.role] ?? 'var(--at-fg-muted)';
  const isLocked = !stat.assignable;

  return (
    <button
      type="button"
      className={`${s.roleCard} ${isSelected ? s.roleCardActive : ''} ${isLocked ? s.roleCardLocked : ''}`}
      style={{ '--rc-color': color } as React.CSSProperties}
      onClick={onSelect}
      aria-pressed={isSelected}
      aria-label={`نقش ${ROLE_FA[stat.role]} — ${stat.count} کاربر`}
    >
      {isSelected && <div className={s.roleCardBar} aria-hidden />}
      <div className={s.roleCardGlow} aria-hidden />

      {/* Header */}
      <div className={s.roleCardTop}>
        <span className={s.roleCardDot} style={{ background: color }} aria-hidden />
        <span className={s.roleCardName}>{ROLE_FA[stat.role]}</span>
        {isLocked && (
          <span className={s.roleCardLockBadge} title="read-only — دسترسی کامل">
            <Lock size={9} aria-hidden />
          </span>
        )}
      </div>

      {/* Count */}
      <div className={s.roleCardCount}>
        <span className={s.roleCardCountNum}>{stat.count.toLocaleString('fa-IR')}</span>
        <span className={s.roleCardCountLabel}>کاربر</span>
      </div>

      {/* Active indicator */}
      <div className={s.roleCardActive2}>
        <span className={s.roleCardActiveNum} style={{ color }}>
          {stat.activeCount.toLocaleString('fa-IR')}
        </span>
        <span className={s.roleCardActiveLabel}>فعال</span>
      </div>

      {/* Hierarchy */}
      <div className={s.roleCardHier}>
        <HierarchyBar level={stat.hierarchy} />
        <span className={s.roleCardHierLabel}>{HIERARCHY_LABEL[stat.hierarchy]}</span>
      </div>
    </button>
  );
}

// ─── User Row ─────────────────────────────────────────────────────────────────

function UserRow({
  user,
  currentRole,
  currentUserRole,
  onChangeRole,
  isPending,
}: {
  user: RoleUserRow;
  currentRole: Role;
  currentUserRole: string;
  onChangeRole: (userId: string, newRole: Role) => void;
  isPending: boolean;
}) {
  const [showPicker, setShowPicker] = useState(false);

  const canChange =
    !isPending &&
    (currentUserRole === 'OWNER' ||
      currentUserRole === 'SUPERADMIN' ||
      currentUserRole === 'ADMIN') &&
    ASSIGNABLE.some((r) => r !== currentRole);

  const initials = (user.name ?? user.email).slice(0, 2).toUpperCase();
  const statusActive = user.status === 'ACTIVE';

  return (
    <div className={s.userRow}>
      <div className={s.userAvatar} aria-hidden>
        {user.image ? (
          <img src={user.image} alt={user.name ?? ''} className={s.userAvatarImg} />
        ) : (
          <span className={s.userAvatarFallback}>{initials}</span>
        )}
        <span className={`${s.userStatusDot} ${statusActive ? s.userStatusDotActive : ''}`} />
      </div>
      <div className={s.userInfo}>
        <span className={s.userName}>{user.name ?? '—'}</span>
        <span className={s.userEmail}>{user.email}</span>
      </div>
      <div className={s.userActions}>
        {canChange ? (
          <div className={s.rolePicker}>
            <button
              type="button"
              className={s.rolePickerTrigger}
              onClick={() => setShowPicker((v) => !v)}
              aria-expanded={showPicker}
              aria-label="تغییر نقش"
            >
              {ROLE_FA[currentRole]}
              <ChevronLeft size={11} aria-hidden />
            </button>
            {showPicker && (
              <div className={s.rolePickerMenu} role="menu">
                {ASSIGNABLE.filter((r) => r !== currentRole).map((role) => (
                  <button
                    key={role}
                    type="button"
                    className={s.rolePickerItem}
                    style={{ '--rc': ROLE_COLOR[role] } as React.CSSProperties}
                    onClick={() => {
                      setShowPicker(false);
                      onChangeRole(user.id, role);
                    }}
                    role="menuitem"
                  >
                    <span className={s.rolePickerDot} aria-hidden />
                    {ROLE_FA[role]}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <span
            className={s.roleTag}
            style={{ '--rc': ROLE_COLOR[currentRole] } as React.CSSProperties}
          >
            {ROLE_FA[currentRole]}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Drawer (کاربران یک نقش) ──────────────────────────────────────────────────

function RoleUsersDrawer({
  role,
  currentUserRole,
  onClose,
}: {
  role: Role;
  currentUserRole: string;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [data, setData] = useState<{ users: RoleUserRow[]; total: number; pages: number } | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [changeTarget, setChangeTarget] = useState<{ userId: string; newRole: Role } | null>(null);
  const [changePending, startChange] = useTransition();
  const searchRef = useRef<HTMLInputElement>(null);
  const color = ROLE_COLOR[role] ?? 'var(--at-fg-muted)';

  const load = useCallback(
    async (pg: number, q: string) => {
      setLoading(true);
      const res = await getUsersByRole({ role, page: pg, search: q });
      setLoading(false);
      if (res.success && res.data) {
        setData({ users: res.data.users, total: res.data.total, pages: res.data.pages });
      } else if (!res.success) {
        toast({ title: 'خطا', description: res.error.message, variant: 'destructive' });
      }
    },
    [role, toast],
  );

  // load on mount + deps
  React.useEffect(() => {
    load(page, search);
  }, [load, page, search]);

  const handleRoleChange = useCallback((userId: string, newRole: Role) => {
    setChangeTarget({ userId, newRole });
  }, []);

  const confirmChange = useCallback(() => {
    if (!changeTarget) return;
    startChange(async () => {
      const res = await updateUserRole({
        userId: changeTarget.userId,
        newRole: changeTarget.newRole,
      });
      if (res.success) {
        toast({
          title: 'نقش تغییر کرد',
          description: `به ${ROLE_FA[changeTarget.newRole]} تغییر یافت`,
        });
        setChangeTarget(null);
        load(page, search);
      } else {
        toast({ title: 'خطا', description: res.error.message, variant: 'destructive' });
        setChangeTarget(null);
      }
    });
  }, [changeTarget, load, page, search, toast]);

  return (
    <div className={s.drawer} role="complementary" aria-label={`کاربران ${ROLE_FA[role]}`}>
      {/* Overlay */}
      <div
        className={s.drawerOverlay}
        onClick={onClose}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose();
        }}
        aria-hidden
      />

      {/* Panel */}
      <div className={s.drawerPanel} style={{ '--rc': color } as React.CSSProperties}>
        {/* Header */}
        <div className={s.drawerHead}>
          <div className={s.drawerHeadBar} aria-hidden />
          <div className={s.drawerHeadInner}>
            <span className={s.drawerDot} style={{ background: color }} aria-hidden />
            <div className={s.drawerHeadText}>
              <h2 className={s.drawerTitle}>{ROLE_FA[role]}</h2>
              <p className={s.drawerDesc}>{ROLE_DESC[role]}</p>
            </div>
            <button type="button" className={s.drawerClose} onClick={onClose} aria-label="بستن">
              <X size={16} aria-hidden />
            </button>
          </div>

          {/* Search */}
          <div className={s.drawerSearch}>
            <Search size={13} className={s.drawerSearchIcon} aria-hidden />
            <input
              ref={searchRef}
              className={s.drawerSearchInput}
              placeholder="جستجو در کاربران..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              aria-label="جستجو"
            />
            {search && (
              <button
                type="button"
                className={s.drawerSearchClear}
                onClick={() => {
                  setSearch('');
                  setPage(1);
                }}
                aria-label="پاک‌کردن"
              >
                <X size={10} />
              </button>
            )}
          </div>
        </div>

        {/* Body */}
        <div className={s.drawerBody}>
          {loading ? (
            <div className={s.drawerLoading}>
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div key={`sk${i}`} className={s.userRowSkeleton} />
              ))}
            </div>
          ) : !data || data.users.length === 0 ? (
            <MillionDollarEmpty
              variant="search"
              tone="neutral"
              eyebrow={`نقش ${ROLE_FA[role]}`}
              title="کاربری یافت نشد"
              description={
                search
                  ? `جستجوی «${search}» نتیجه‌ای نداشت.`
                  : `هیچ کاربری با نقش ${ROLE_FA[role]} وجود ندارد.`
              }
              primaryAction={
                search ? (
                  <Button variant="outline" onClick={() => setSearch('')}>
                    <X size={12} /> پاک‌کردن جستجو
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className={s.userList}>
              {data.users.map((u) => (
                <UserRow
                  key={u.id}
                  user={u}
                  currentRole={role}
                  currentUserRole={currentUserRole}
                  onChangeRole={handleRoleChange}
                  isPending={changePending}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer pagination */}
        {data && data.pages > 1 && (
          <div className={s.drawerFooter}>
            <span className={s.drawerPagInfo}>
              {data.total.toLocaleString('fa-IR')} کاربر — صفحه {page.toLocaleString('fa-IR')} از{' '}
              {data.pages.toLocaleString('fa-IR')}
            </span>
            <div className={s.drawerPagBtns}>
              <button
                type="button"
                className={s.pagBtn}
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                aria-label="صفحه قبل"
              >
                <ChevronRight size={14} />
              </button>
              <button
                type="button"
                className={s.pagBtn}
                disabled={page >= data.pages}
                onClick={() => setPage((p) => p + 1)}
                aria-label="صفحه بعد"
              >
                <ChevronLeft size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Confirm role change */}
      <ConfirmDialog
        open={!!changeTarget}
        onOpenChange={(o) => {
          if (!o) setChangeTarget(null);
        }}
        title="تغییر نقش کاربر"
        description={
          changeTarget ? `نقش کاربر به «${ROLE_FA[changeTarget.newRole]}» تغییر می‌یابد.` : ''
        }
        confirmLabel="تأیید تغییر"
        cancelLabel="انصراف"
        variant="default"
        onConfirm={confirmChange}
        loading={changePending}
      />
    </div>
  );
}

// ─── Hierarchy Diagram ────────────────────────────────────────────────────────

function HierarchyDiagram({ stats }: { stats: RoleStat[] }) {
  const levels = useMemo(() => {
    const m: Record<number, RoleStat[]> = {};
    for (const s of stats) {
      if (!m[s.hierarchy]) m[s.hierarchy] = [];
      m[s.hierarchy]?.push(s);
    }
    return Object.entries(m)
      .sort(([a], [b]) => Number(b) - Number(a))
      .map(([level, roles]) => ({ level: Number(level), roles }));
  }, [stats]);

  return (
    <div className={s.hierDiagram} aria-label="سلسله‌مراتب نقش‌ها" role="img">
      {levels.map(({ level, roles }, idx) => (
        <div key={level} className={s.hierLevel}>
          <div className={s.hierLevelLine} aria-hidden>
            {idx > 0 && <span className={s.hierConnector} aria-hidden />}
          </div>
          <div className={s.hierLevelContent}>
            <span className={s.hierLevelLabel}>{HIERARCHY_LABEL[level]}</span>
            <div className={s.hierLevelRoles}>
              {roles.map((r) => (
                <span
                  key={r.role}
                  className={s.hierRolePill}
                  style={{ '--rc': ROLE_COLOR[r.role] } as React.CSSProperties}
                >
                  {!r.assignable && <Lock size={9} aria-hidden />}
                  {ROLE_FA[r.role]}
                </span>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function RolesClient({ stats, currentUserRole }: Props) {
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const isSuperAdmin = currentUserRole === 'OWNER' || currentUserRole === 'SUPERADMIN';

  const totalUsers = useMemo(() => stats.reduce((a, s) => a + s.count, 0), [stats]);
  const totalActive = useMemo(() => stats.reduce((a, s) => a + s.activeCount, 0), [stats]);

  const handleRoleSelect = useCallback((role: Role) => {
    setSelectedRole((prev) => (prev === role ? null : role));
  }, []);

  return (
    <div className={s.root} dir="rtl">
      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className={`at-tile ${s.heroTile}`} aria-label="مدیریت نقش‌ها">
        {/* Brand mark */}
        <div className={s.heroMark} aria-hidden>
          <Shield className={s.heroMarkIcon} aria-hidden />
        </div>

        <header className={s.heroHead}>
          <span className={s.heroEyebrow}>
            <span className={s.heroLiveDot} aria-hidden />
            <ShieldCheck size={10} aria-hidden />
            <span>مدیریت دسترسی · Roles</span>
          </span>
        </header>

        <h1 className={s.heroTitle}>
          نقش‌های پلتفرم
          <em className={s.heroTitleAccent}> RBAC</em>
        </h1>
        <p className={s.heroSubtitle}>سطوح دسترسی، hierarchy نقش‌ها و مدیریت کاربران هر سطح</p>

        {/* KPI */}
        <div className={s.heroKpi}>
          <div className={s.heroKpiItem}>
            <span className={s.heroKpiValue}>{stats.length}</span>
            <span className={s.heroKpiLabel}>نقش پلتفرم</span>
          </div>
          <div className={s.heroKpiItem}>
            <span className={s.heroKpiValue}>{totalUsers.toLocaleString('fa-IR')}</span>
            <span className={s.heroKpiLabel}>کاربر کل</span>
          </div>
          <div className={s.heroKpiItem}>
            <span className={s.heroKpiValue}>{totalActive.toLocaleString('fa-IR')}</span>
            <span className={s.heroKpiLabel}>کاربر فعال</span>
          </div>
          <div className={s.heroKpiItem}>
            <span className={s.heroKpiValue}>{ASSIGNABLE.length}</span>
            <span className={s.heroKpiLabel}>نقش قابل اعطا</span>
          </div>
        </div>

        {/* Hierarchy diagram inside hero */}
        <div className={s.heroDiagramWrap}>
          <HierarchyDiagram stats={stats} />
        </div>
      </section>

      {/* ── Role Cards ──────────────────────────────────────────────────── */}
      <div className={s.rolesGrid}>
        {stats.map((stat) => (
          <RoleCard
            key={stat.role}
            stat={stat}
            isSelected={selectedRole === stat.role}
            onSelect={() => handleRoleSelect(stat.role)}
          />
        ))}
      </div>

      {/* ── Info Banner for non-assignable roles ────────────────────────── */}
      {isSuperAdmin && (
        <div className={s.infoBanner}>
          <AlertTriangle size={14} className={s.infoBannerIcon} aria-hidden />
          <p className={s.infoBannerText}>
            نقش‌های <strong>OWNER</strong> و <strong>SUPERADMIN</strong> از این صفحه قابل تغییر
            نیستند — برای تغییر مستقیماً از دیتابیس یا CLI اقدام کنید.
          </p>
        </div>
      )}

      {/* ── Users Drawer ────────────────────────────────────────────────── */}
      {selectedRole && (
        <RoleUsersDrawer
          role={selectedRole}
          currentUserRole={currentUserRole}
          onClose={() => setSelectedRole(null)}
        />
      )}
    </div>
  );
}
