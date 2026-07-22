'use client';

/**
 * PermissionsClient — 2026 Million-Dollar RBAC Permission Matrix
 *
 * طراحی: Linear.app × Notion — sparse matrix با checkbox
 * ویژگی‌ها:
 * - ماتریس نقش × مجوز با inline checkbox
 * - Unsaved changes indicator (floating bar)
 * - Batch save atomic
 * - افزودن/حذف مجوز
 * - SUPERADMIN read-only row
 * - Stagger animation روی ردیف‌ها
 * - همه ۵ حالت: loading/empty/error/success/disabled
 */

import {
  type PermissionRow,
  type RoleMatrixEntry,
  createPermission,
  deletePermission,
  saveRoleMatrix,
} from '@/actions/permission-actions';
import { EDITABLE_ROLES, type EditableRole } from '@/lib/permissions-constants';
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
import {
  AlertTriangle,
  CheckCircle2,
  Key,
  Plus,
  Save,
  Search,
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

const ROLE_FA: Record<string, string> = {
  CUSTOMER: 'مشتری',
  MERCHANT: 'تاجر',
  EXCHANGE: 'صراف',
  SUPPORT: 'پشتیبانی',
  ADMIN: 'مدیر',
};

const ROLE_COLOR: Record<string, string> = {
  CUSTOMER: 'var(--nova-cyan)',
  MERCHANT: 'var(--nova-violet)',
  EXCHANGE: 'var(--nova-amber)',
  SUPPORT: 'var(--nova-emerald)',
  ADMIN: 'var(--ds-brand-500)',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseCategory(key: string): string {
  const resource = key.split(':')[0] ?? key;
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
  return CAT_FA[resource] ?? resource;
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

  // ── Search / Filter ───────────────────────────────────────────────────────
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
    const cats = Array.from(new Set(localPerms.map((p) => parseCategory(p.key)))).sort((a, b) =>
      a.localeCompare(b, 'fa'),
    );
    return cats;
  }, [localPerms]);

  // گروه‌بندی مجوزها بر اساس resource (روی visiblePerms)
  const grouped = useMemo(() => {
    const groups: Record<string, PermissionRow[]> = {};
    for (const perm of visiblePerms) {
      const cat = parseCategory(perm.key);
      if (!groups[cat]) groups[cat] = [];
      groups[cat]?.push(perm);
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b, 'fa'));
  }, [visiblePerms]);

  // تغییر checkbox
  const handleCheck = useCallback((permId: string, role: EditableRole, val: boolean) => {
    setLocalMatrix((prev) => {
      const next = { ...prev, [`${permId}:${role}`]: val };
      // چک تغییر نسبت به original
      const hasChange = Object.entries(next).some(([k, v]) => originalRef.current[k] !== v);
      setDirty(hasChange);
      return next;
    });
  }, []);

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
          description: `${result.data?.updated ?? 0} تغییر اعمال شد`,
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
        // اضافه کردن به localMatrix
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
        description="ماتریس نقش × مجوز — هر نقش چه کاری می‌تواند انجام دهد"
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

      {/* ── Legend نقش‌ها ─────────────────────────────────────────────── */}
      <ul className={s.legend} aria-label="نقش‌های سیستم">
        {EDITABLE_ROLES.map((role) => (
          <li key={role} className={s.legendItem}>
            <span className={s.legendDot} style={{ background: ROLE_COLOR[role] }} aria-hidden />
            <span>{ROLE_FA[role]}</span>
          </li>
        ))}
        <li className={s.legendItem}>
          <ShieldCheck size={13} className={s.legendSuperAdmin} aria-hidden />
          <span className={s.legendSuperAdminText}>SUPERADMIN — همه دسترسی‌ها (read-only)</span>
        </li>
      </ul>

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
                aria-label="پاک کردن"
              >
                <X size={12} />
              </button>
            )}
          </div>
          <div className={s.catPills} aria-label="فیلتر دسته">
            <button
              type="button"
              className={`${s.catPill} ${catFilter === 'all' ? s.catPillActive : ''}`}
              onClick={() => setCatFilter('all')}
            >
              همه
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`${s.catPill} ${catFilter === cat ? s.catPillActive : ''}`}
                onClick={() => setCatFilter(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── ماتریس ────────────────────────────────────────────────────── */}
      {localPerms.length === 0 ? (
        <EmptyState
          icon={Key}
          title="مجوزی ثبت نشده"
          description="اولین مجوز سیستم را بسازید"
          action={
            isSuperAdmin ? (
              <Button size="sm" onClick={() => setShowAdd(true)}>
                <Plus size={14} aria-hidden /> ثبت مجوز
              </Button>
            ) : null
          }
        />
      ) : grouped.length === 0 ? (
        <EmptyState
          icon={Search}
          title="مجوزی یافت نشد"
          description="جستجو یا فیلتر شما نتیجه‌ای ندارد"
          action={
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setSearchQuery('');
                setCatFilter('all');
              }}
            >
              پاک کردن فیلتر
            </Button>
          }
        />
      ) : (
        <div className={s.matrixWrap}>
          <table className={s.matrixTable} aria-label="ماتریس مجوزها">
            <thead>
              <tr className={s.matrixHeader}>
                <th scope="col" className={s.colKey}>
                  کلید مجوز
                </th>
                {EDITABLE_ROLES.map((role) => (
                  <th
                    key={role}
                    scope="col"
                    className={s.colRole}
                    style={{ '--role-color': ROLE_COLOR[role] } as React.CSSProperties}
                  >
                    {ROLE_FA[role]}
                  </th>
                ))}
                <th scope="col" className={s.colSuperAdmin}>
                  SUPERADMIN
                </th>
                {isSuperAdmin && <th scope="col" className={s.colAction} />}
              </tr>
            </thead>
            {/* Rows — گروه‌بندی شده */}
            {grouped.map(([cat, perms]) => (
              <tbody key={cat} className={s.group}>
                <tr className={s.groupHeader}>
                  <td colSpan={EDITABLE_ROLES.length + (isSuperAdmin ? 3 : 2)}>
                    <span className={s.groupLabel}>{cat}</span>
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
                            ? { outline: '1px solid var(--ds-brand-500)', outlineOffset: '1px' }
                            : undefined
                        }
                      >
                        {perm.key}
                      </span>
                      {perm.description && <span className={s.keyDesc}>{perm.description}</span>}
                    </td>

                    {EDITABLE_ROLES.map((role) => {
                      const checked = localMatrix[`${perm.id}:${role}`] ?? false;
                      return (
                        <td key={role} className={s.colRole}>
                          <Checkbox
                            id={`${perm.id}-${role}`}
                            checked={checked}
                            onCheckedChange={(val) => handleCheck(perm.id, role, val === true)}
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
                      <span className={s.superAdminCheck} aria-label="دسترسی کامل">
                        ✓
                      </span>
                    </td>

                    {/* عملیات (فقط OWNER / SUPERADMIN) */}
                    {isSuperAdmin && (
                      <td className={s.colAction}>
                        <button
                          type="button"
                          className={s.deleteRowBtn}
                          onClick={() => setDeleteTarget(perm)}
                          aria-label={`حذف ${perm.key}`}
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
        <div className={s.unsavedBar} aria-live="polite">
          <span className={s.unsavedIcon} aria-hidden>
            <AlertTriangle size={15} />
          </span>
          <span className={s.unsavedText}>تغییرات ذخیره نشده دارید</span>
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
                dir="ltr"
                className={s.codeInput}
              />
              <p className={s.fieldHint}>
                فرمت: resource:action — فقط حروف انگلیسی، عدد، خط تیره و دو‌نقطه
              </p>
            </div>
            <div className={s.fieldGroup}>
              <Label htmlFor="perm-desc">توضیح (اختیاری)</Label>
              <Input
                id="perm-desc"
                placeholder="توضیح کوتاه فارسی"
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
