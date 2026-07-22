'use client';

/**
 * PermissionsClient — 2026 Million-Dollar RBAC Permission Matrix
 *
 * طراحی الهام‌گرفته از Linear × Clerk × Vercel Team Settings
 * ویژگی‌های جدید:
 * - Stats Panel: تعداد مجوز هر نقش + درصد پوشش
 * - Column Select-All: یک کلیک برای فعال/غیرفعال کل ستون
 * - Role Info Tooltip: توضیح هر نقش برای adminهایی که نمی‌دانند
 * - Unsaved indicator با تعداد تغییرات
 * - Empty + Error + Loading states کامل
 * - Keyboard navigation کامل
 */

import {
  type PermissionRow,
  type RoleMatrixEntry,
  createPermission,
  deletePermission,
  saveRoleMatrix,
} from '@/actions/permission-actions';
import { ConfirmDialog, EmptyState, PageHeader } from '@/components/Dashboard/primitives';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { EDITABLE_ROLES, type EditableRole } from '@/lib/permissions-constants';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Info,
  Key,
  Plus,
  RotateCcw,
  Save,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import { useCallback, useMemo, useRef, useState, useTransition } from 'react';
import s from './PermissionsClient.module.css';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  permissions: PermissionRow[];
  matrix: RoleMatrixEntry[];
  currentUserRole: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ROLE_FA: Record<string, string> = {
  CUSTOMER: 'مشتری',
  MERCHANT: 'تاجر',
  EXCHANGE: 'صراف',
  SUPPORT: 'پشتیبانی',
  ADMIN: 'مدیر',
};

const ROLE_DESC: Record<string, string> = {
  CUSTOMER: 'مشتری عادی که در پلتفرم ثبت‌نام کرده. دسترسی محدود به عملیات شخصی.',
  MERCHANT: 'فروشنده با دسترسی به مدیریت پرداخت‌ها و معاملات تجاری.',
  EXCHANGE: 'نماینده صرافی با دسترسی به قیمت‌گذاری و تسویه.',
  SUPPORT: 'تیم پشتیبانی — معمولاً read-only روی موجودیت‌های حساس.',
  ADMIN: 'مدیر محتوا و کاربران پلتفرم. دسترسی کامل داشبورد.',
};

const ROLE_COLOR: Record<string, string> = {
  CUSTOMER: 'var(--nova-cyan)',
  MERCHANT: 'var(--nova-violet)',
  EXCHANGE: 'var(--nova-amber)',
  SUPPORT: 'var(--nova-emerald)',
  ADMIN: 'var(--ds-brand-500)',
};

const CAT_FA: Record<string, string> = {
  wallet: 'کیف پول',
  transfer: 'انتقال',
  quote: 'قیمت‌گذاری',
  deal: 'معامله',
  settlement: 'تسویه',
  kyc: 'احراز هویت',
  user: 'کاربران',
  report: 'گزارش',
  exchange: 'صرافی',
  admin: 'مدیریت',
  permissions: 'مجوزها',
  audit: 'ممیزی',
  fraud: 'تقلب',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseCategory(key: string): string {
  const resource = key.split(':')[0] ?? key;
  return CAT_FA[resource] ?? resource;
}

// ─── RoleStatsBadge ────────────────────────────────────────────────────────────

function RoleStatsPanel({
  permissions,
  localMatrix,
}: {
  permissions: PermissionRow[];
  localMatrix: Record<string, boolean>;
}) {
  const total = permissions.length;
  if (total === 0) return null;

  return (
    <div className={s.statsPanel}>
      <div className={s.statsPanelTitle}>
        <ShieldCheck size={14} aria-hidden />
        پوشش مجوزها به تفکیک نقش
      </div>
      <div className={s.statsGrid}>
        {EDITABLE_ROLES.map((role) => {
          const granted = permissions.filter((p) => localMatrix[`${p.id}:${role}`]).length;
          const pct = total > 0 ? Math.round((granted / total) * 100) : 0;
          return (
            <div key={role} className={s.statCard}>
              <div className={s.statCardHeader}>
                <span className={s.statDot} style={{ background: ROLE_COLOR[role] }} aria-hidden />
                <span className={s.statRoleName}>{ROLE_FA[role]}</span>
              </div>
              <div className={s.statNumbers}>
                <span className={s.statGranted}>{granted}</span>
                <span className={s.statTotal}>/ {total}</span>
              </div>
              <div className={s.statBarWrap} aria-label={`${pct}٪`}>
                <div
                  className={s.statBarFill}
                  style={
                    {
                      '--stat-pct': `${pct}%`,
                      '--stat-color': ROLE_COLOR[role],
                    } as React.CSSProperties
                  }
                />
              </div>
              <span className={s.statPct}>{pct}٪</span>
            </div>
          );
        })}
        {/* SUPERADMIN — همیشه ۱۰۰٪ */}
        <div className={s.statCard} data-superadmin>
          <div className={s.statCardHeader}>
            <ShieldAlert size={12} className={s.statSuperAdminIcon} aria-hidden />
            <span className={s.statRoleName}>SUPERADMIN</span>
          </div>
          <div className={s.statNumbers}>
            <span className={s.statGranted}>{total}</span>
            <span className={s.statTotal}>/ {total}</span>
          </div>
          <div className={s.statBarWrap}>
            <div
              className={s.statBarFill}
              style={
                {
                  '--stat-pct': '100%',
                  '--stat-color': 'var(--ds-brand-500)',
                } as React.CSSProperties
              }
            />
          </div>
          <span className={s.statPct}>۱۰۰٪</span>
        </div>
      </div>
    </div>
  );
}

// ─── RoleTooltip ──────────────────────────────────────────────────────────────

function RoleHeaderCell({
  role,
  color,
  onSelectAll,
  onClearAll,
  allChecked,
  someChecked,
  isSuperAdmin,
}: {
  role: string;
  color: string;
  onSelectAll: () => void;
  onClearAll: () => void;
  allChecked: boolean;
  someChecked: boolean;
  isSuperAdmin: boolean;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  return (
    <th
      scope="col"
      className={s.colRole}
      style={{ '--role-color': color } as React.CSSProperties}
    >
      <div className={s.roleHeaderInner} ref={ref}>
        <span className={s.roleHeaderLabel}>{ROLE_FA[role]}</span>
        {isSuperAdmin && (
          <button
            type="button"
            className={s.roleMenuBtn}
            onClick={() => setShowMenu((v) => !v)}
            aria-label={`گزینه‌های ${ROLE_FA[role]}`}
            title={`گزینه‌های ${ROLE_FA[role]}`}
          >
            <ChevronDown size={11} aria-hidden />
          </button>
        )}
        {showMenu && (
          // eslint-disable-next-line jsx-a11y/no-static-element-interactions
          <div
            className={s.roleMenu}
            onMouseLeave={() => setShowMenu(false)}
            onBlur={() => setShowMenu(false)}
          >
            <button
              type="button"
              className={s.roleMenuItem}
              onClick={() => {
                onSelectAll();
                setShowMenu(false);
              }}
            >
              <CheckCircle2 size={12} aria-hidden />
              فعال کردن همه
            </button>
            <button
              type="button"
              className={s.roleMenuItem}
              onClick={() => {
                onClearAll();
                setShowMenu(false);
              }}
            >
              <X size={12} aria-hidden />
              غیرفعال کردن همه
            </button>
            <div className={s.roleMenuDivider} />
            <div className={s.roleMenuInfo}>
              <Info size={11} aria-hidden />
              <span>{ROLE_DESC[role]}</span>
            </div>
          </div>
        )}
      </div>
      {/* Indeterminate indicator */}
      {(allChecked || someChecked) && (
        <span
          className={`${s.roleHeaderIndicator} ${allChecked ? s.roleHeaderIndicatorAll : s.roleHeaderIndicatorSome}`}
          style={{ background: color }}
          aria-hidden
        />
      )}
    </th>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function PermissionsClient({ permissions, matrix, currentUserRole }: Props) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  // ماتریس local state — کلید: `${permissionId}:${role}` → boolean
  const [localMatrix, setLocalMatrix] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    for (const row of matrix) {
      for (const role of EDITABLE_ROLES) {
        map[`${row.permissionId}:${role}`] = row.roles[role] ?? false;
      }
    }
    return map;
  });

  // ردیابی تغییرات
  const [dirty, setDirty] = useState(false);
  const originalRef = useRef<Record<string, boolean>>({ ...localMatrix });

  // Dialog افزودن مجوز
  const [showAdd, setShowAdd] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [addPending, startAddTransition] = useTransition();

  // Confirm حذف
  const [deletePending, startDeleteTransition] = useTransition();
  const [deleteTarget, setDeleteTarget] = useState<PermissionRow | null>(null);

  // state برای permissions (مدیریت local)
  const [localPerms, setLocalPerms] = useState<PermissionRow[]>(permissions);

  // Search / Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [catFilter, setCatFilter] = useState<string>('all');

  const visiblePerms = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return localPerms.filter((p) => {
      if (catFilter !== 'all' && parseCategory(p.key) !== catFilter) return false;
      if (!q) return true;
      return p.key.toLowerCase().includes(q) || (p.description ?? '').toLowerCase().includes(q);
    });
  }, [localPerms, searchQuery, catFilter]);

  const categories = useMemo(() => {
    return Array.from(new Set(localPerms.map((p) => parseCategory(p.key)))).sort((a, b) =>
      a.localeCompare(b, 'fa'),
    );
  }, [localPerms]);

  // گروه‌بندی مجوزها بر اساس resource
  const grouped = useMemo(() => {
    const groups: Record<string, PermissionRow[]> = {};
    for (const perm of visiblePerms) {
      const cat = parseCategory(perm.key);
      if (!groups[cat]) groups[cat] = [];
      groups[cat]?.push(perm);
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b, 'fa'));
  }, [visiblePerms]);

  // تعداد تغییرات برای نمایش در unsaved bar
  const changeCount = useMemo(() => {
    return Object.entries(localMatrix).filter(([k, v]) => originalRef.current[k] !== v).length;
  }, [localMatrix]);

  // تغییر checkbox
  const handleCheck = useCallback((permId: string, role: EditableRole, val: boolean) => {
    setLocalMatrix((prev) => {
      const next = { ...prev, [`${permId}:${role}`]: val };
      const hasChange = Object.entries(next).some(([k, v]) => originalRef.current[k] !== v);
      setDirty(hasChange);
      return next;
    });
  }, []);

  // Select-All / Clear-All برای یک ستون (role)
  const handleColumnSelectAll = useCallback(
    (role: EditableRole) => {
      setLocalMatrix((prev) => {
        const next = { ...prev };
        for (const perm of localPerms) {
          next[`${perm.id}:${role}`] = true;
        }
        const hasChange = Object.entries(next).some(([k, v]) => originalRef.current[k] !== v);
        setDirty(hasChange);
        return next;
      });
    },
    [localPerms],
  );

  const handleColumnClearAll = useCallback(
    (role: EditableRole) => {
      setLocalMatrix((prev) => {
        const next = { ...prev };
        for (const perm of localPerms) {
          next[`${perm.id}:${role}`] = false;
        }
        const hasChange = Object.entries(next).some(([k, v]) => originalRef.current[k] !== v);
        setDirty(hasChange);
        return next;
      });
    },
    [localPerms],
  );

  // ذخیره ماتریس
  const handleSave = useCallback(() => {
    const rows = localPerms.map((perm) => ({
      permissionId: perm.id,
      roles: Object.fromEntries(
        EDITABLE_ROLES.map((role) => [role, localMatrix[`${perm.id}:${role}`] ?? false]),
      ),
    }));

    startTransition(async () => {
      const result = await saveRoleMatrix(rows);
      if (result.success) {
        originalRef.current = { ...localMatrix };
        setDirty(false);
        toast({
          title: 'تغییرات ذخیره شد',
          description: `${result.data?.updated ?? 0} مجوز به‌روزرسانی شد`,
        });
      } else {
        toast({ title: 'خطا در ذخیره', description: result.error.message, variant: 'destructive' });
      }
    });
  }, [localMatrix, localPerms, toast]);

  // لغو تغییرات
  const handleDiscard = useCallback(() => {
    setLocalMatrix({ ...originalRef.current });
    setDirty(false);
  }, []);

  // افزودن مجوز
  const handleAdd = useCallback(() => {
    startAddTransition(async () => {
      const result = await createPermission({
        key: newKey.trim(),
        description: newDesc.trim() || null,
      });
      if (result.success && result.data) {
        const perm = result.data;
        setLocalPerms((prev) => [...prev, perm]);
        setLocalMatrix((prev) => {
          const next = { ...prev };
          for (const role of EDITABLE_ROLES) {
            next[`${perm.id}:${role}`] = false;
          }
          originalRef.current = { ...next };
          return next;
        });
        setNewKey('');
        setNewDesc('');
        setShowAdd(false);
        toast({ title: 'مجوز ثبت شد', description: perm.key });
      } else if (!result.success) {
        toast({ title: 'خطا', description: result.error.message, variant: 'destructive' });
      }
    });
  }, [newKey, newDesc, toast]);

  // حذف مجوز
  const handleDelete = useCallback(() => {
    if (!deleteTarget) return;
    startDeleteTransition(async () => {
      const result = await deletePermission(deleteTarget.id);
      if (result.success) {
        setLocalPerms((prev) => prev.filter((p) => p.id !== deleteTarget.id));
        setLocalMatrix((prev) => {
          const next = { ...prev };
          for (const role of EDITABLE_ROLES) delete next[`${deleteTarget.id}:${role}`];
          return next;
        });
        setDeleteTarget(null);
        toast({ title: 'مجوز حذف شد' });
      } else {
        toast({ title: 'خطا', description: result.error.message, variant: 'destructive' });
        setDeleteTarget(null);
      }
    });
  }, [deleteTarget, toast]);

  const isSuperAdmin = currentUserRole === 'OWNER' || currentUserRole === 'SUPERADMIN';

  return (
    <div className={s.root}>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <PageHeader
        breadcrumb={[{ label: 'داشبورد', href: '/dashboard' }, { label: 'مجوزها' }]}
        title="مدیریت مجوزها"
        description="ماتریس کنترل دسترسی — هر نقش چه عملیاتی می‌تواند انجام دهد"
        eyebrow="RBAC"
        actions={
          isSuperAdmin ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowAdd(true)}
              className={s.addBtn}
            >
              <Plus size={15} aria-hidden />
              مجوز جدید
            </Button>
          ) : null
        }
      />

      {/* ── Stats Panel ─────────────────────────────────────────────────── */}
      <RoleStatsPanel permissions={localPerms} localMatrix={localMatrix} />

      {/* ── Search / Filter toolbar ──────────────────────────────────── */}
      {localPerms.length > 0 && (
        <div className={s.searchBar}>
          <div className={s.searchWrap}>
            <Search size={14} className={s.searchIcon} aria-hidden />
            <input
              className={s.searchInput}
              placeholder="جستجو کلید یا توضیح..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="جستجو در مجوزها"
              dir="ltr"
            />
            {searchQuery && (
              <button
                type="button"
                className={s.searchClear}
                onClick={() => setSearchQuery('')}
                aria-label="پاک کردن جستجو"
              >
                <X size={12} />
              </button>
            )}
          </div>
          <div className={s.catPills} role="group" aria-label="فیلتر دسته">
            <button
              type="button"
              className={`${s.catPill} ${catFilter === 'all' ? s.catPillActive : ''}`}
              onClick={() => setCatFilter('all')}
            >
              همه
              <span className={s.catPillCount}>{localPerms.length}</span>
            </button>
            {categories.map((cat) => {
              const count = localPerms.filter((p) => parseCategory(p.key) === cat).length;
              return (
                <button
                  key={cat}
                  type="button"
                  className={`${s.catPill} ${catFilter === cat ? s.catPillActive : ''}`}
                  onClick={() => setCatFilter(cat)}
                >
                  {cat}
                  <span className={s.catPillCount}>{count}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── ماتریس ────────────────────────────────────────────────────── */}
      {localPerms.length === 0 ? (
        <EmptyState
          icon={Key}
          title="مجوزی ثبت نشده"
          description="سیستم RBAC آماده است. اولین مجوز را تعریف کنید تا دسترسی‌ها قابل پیکربندی شوند."
          action={
            isSuperAdmin ? (
              <Button size="sm" onClick={() => setShowAdd(true)}>
                <Plus size={14} aria-hidden /> ثبت اولین مجوز
              </Button>
            ) : null
          }
        />
      ) : grouped.length === 0 ? (
        <EmptyState
          icon={Search}
          title="نتیجه‌ای یافت نشد"
          description="جستجو یا فیلتر انتخابی شما با هیچ مجوزی مطابقت ندارد."
          action={
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setSearchQuery('');
                setCatFilter('all');
              }}
            >
              <RotateCcw size={13} aria-hidden /> پاک کردن فیلتر
            </Button>
          }
        />
      ) : (
        <div className={s.matrixWrap}>
          <table className={s.matrixTable} aria-label="ماتریس مجوزها">
            <thead>
              <tr className={s.matrixHeader}>
                <th scope="col" className={s.colKey}>
                  <span className={s.colKeyLabel}>کلید مجوز</span>
                  <span className={s.colKeyCount}>
                    {visiblePerms.length} مجوز
                  </span>
                </th>
                {EDITABLE_ROLES.map((role) => {
                  const granted = visiblePerms.filter(
                    (p) => localMatrix[`${p.id}:${role}`],
                  ).length;
                  const allChecked = granted === visiblePerms.length && visiblePerms.length > 0;
                  const someChecked = granted > 0 && !allChecked;
                  return (
                    <RoleHeaderCell
                      key={role}
                      role={role}
                      color={ROLE_COLOR[role] ?? 'var(--ds-text-muted)'}
                      onSelectAll={() => handleColumnSelectAll(role as EditableRole)}
                      onClearAll={() => handleColumnClearAll(role as EditableRole)}
                      allChecked={allChecked}
                      someChecked={someChecked}
                      isSuperAdmin={isSuperAdmin}
                    />
                  );
                })}
                <th scope="col" className={s.colSuperAdmin}>
                  <span className={s.superAdminHeaderLabel}>SUPERADMIN</span>
                </th>
                {isSuperAdmin && <th scope="col" className={s.colAction} aria-label="عملیات" />}
              </tr>
            </thead>

            {/* Rows — گروه‌بندی شده */}
            {grouped.map(([cat, perms]) => (
              <tbody key={cat} className={s.group}>
                <tr className={s.groupHeader}>
                  <td colSpan={EDITABLE_ROLES.length + (isSuperAdmin ? 3 : 2)}>
                    <div className={s.groupLabelWrap}>
                      <span className={s.groupLabel}>{cat}</span>
                      <span className={s.groupCount}>{perms.length} مجوز</span>
                    </div>
                  </td>
                </tr>
                {perms.map((perm, i) => (
                  <tr
                    key={perm.id}
                    className={s.matrixRow}
                    style={{ '--row-i': i } as React.CSSProperties}
                  >
                    <td className={s.colKey}>
                      <span
                        className={s.keyBadge}
                        style={
                          searchQuery && perm.key.toLowerCase().includes(searchQuery.toLowerCase())
                            ? { outline: '1.5px solid var(--ds-brand-500)', outlineOffset: '2px' }
                            : undefined
                        }
                      >
                        {perm.key}
                      </span>
                      {perm.description && (
                        <span className={s.keyDesc}>{perm.description}</span>
                      )}
                    </td>

                    {EDITABLE_ROLES.map((role) => {
                      const checked = localMatrix[`${perm.id}:${role}`] ?? false;
                      return (
                        <td key={role} className={s.colRole}>
                          <Checkbox
                            id={`${perm.id}-${role}`}
                            checked={checked}
                            onCheckedChange={(val) =>
                              handleCheck(perm.id, role as EditableRole, val === true)
                            }
                            aria-label={`${ROLE_FA[role]} — ${perm.key}`}
                            className={s.checkbox}
                            style={
                              {
                                '--cb-color': ROLE_COLOR[role],
                              } as React.CSSProperties
                            }
                          />
                        </td>
                      );
                    })}

                    {/* SUPERADMIN — همیشه checked و read-only */}
                    <td className={s.colSuperAdmin}>
                      <span className={s.superAdminCheck} aria-label="دسترسی کامل (read-only)">
                        <CheckCircle2 size={14} aria-hidden />
                      </span>
                    </td>

                    {/* عملیات (فقط OWNER / SUPERADMIN) */}
                    {isSuperAdmin && (
                      <td className={s.colAction}>
                        <button
                          type="button"
                          className={s.deleteRowBtn}
                          onClick={() => setDeleteTarget(perm)}
                          aria-label={`حذف مجوز ${perm.key}`}
                          title={`حذف ${perm.key}`}
                        >
                          <Trash2 size={13} aria-hidden />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            ))}
          </table>
        </div>
      )}

      {/* ── Unsaved Changes Bar ──────────────────────────────────────── */}
      {dirty && (
        <div className={s.unsavedBar} role="alert" aria-live="polite">
          <span className={s.unsavedIcon} aria-hidden>
            <AlertTriangle size={15} />
          </span>
          <div className={s.unsavedTextGroup}>
            <span className={s.unsavedText}>تغییرات ذخیره نشده</span>
            <span className={s.unsavedCount}>{changeCount} تغییر</span>
          </div>
          <div className={s.unsavedActions}>
            <button
              type="button"
              className={s.discardBtn}
              onClick={handleDiscard}
              disabled={isPending}
            >
              <X size={13} aria-hidden /> لغو
            </button>
            <button type="button" className={s.saveBtn} onClick={handleSave} disabled={isPending}>
              {isPending ? (
                <span className={s.spinner} aria-label="در حال ذخیره" />
              ) : (
                <Save size={13} aria-hidden />
              )}
              ذخیره تغییرات
            </button>
          </div>
        </div>
      )}

      {/* ── Dialog افزودن مجوز ──────────────────────────────────────── */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent dir="rtl" className={s.dialog}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key size={17} aria-hidden />
              مجوز جدید
            </DialogTitle>
          </DialogHeader>
          <div className={s.dialogBody}>
            <div className={s.fieldGroup}>
              <Label htmlFor="perm-key">کلید مجوز</Label>
              <Input
                id="perm-key"
                placeholder="مثال: wallet:read"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newKey.trim()) handleAdd();
                }}
                dir="ltr"
                className={s.codeInput}
                autoFocus
              />
              <p className={s.fieldHint}>
                فرمت: <code>resource:action</code> — فقط حروف انگلیسی، عدد، خط‌تیره و دو‌نقطه
              </p>
            </div>
            <div className={s.fieldGroup}>
              <Label htmlFor="perm-desc">توضیح (اختیاری)</Label>
              <Input
                id="perm-desc"
                placeholder="توضیح کوتاه فارسی برای adminها"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className={s.dialogFooter}>
            <Button variant="outline" onClick={() => setShowAdd(false)} disabled={addPending}>
              انصراف
            </Button>
            <Button onClick={handleAdd} disabled={addPending || !newKey.trim()}>
              {addPending ? (
                <span className={s.spinner} aria-label="در حال ثبت" />
              ) : (
                <CheckCircle2 size={14} aria-hidden />
              )}
              ثبت مجوز
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Confirm حذف ─────────────────────────────────────────────── */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => {
          if (!o) setDeleteTarget(null);
        }}
        title="حذف مجوز"
        description={
          deleteTarget
            ? `مجوز «${deleteTarget.key}» حذف می‌شود. اگر در نقشی استفاده شده باشد، عملیات رد می‌شود.`
            : ''
        }
        confirmLabel="بله، حذف کن"
        cancelLabel="انصراف"
        variant="danger"
        onConfirm={handleDelete}
        loading={deletePending}
      />
    </div>
  );
}
