'use client';

/**
 * PermissionsClient — 2026 Million-Dollar RBAC Permission Matrix
 *
 * معماری UI:
 * - دو حالت دید: "ماتریس" (سنتی) و "نقش‌محور" (focus روی یک نقش)
 * - Role Health Cards با ریسک‌نمایی (نقش بدون مجوز = warning)
 * - Batch select: انتخاب چندین مجوز و اعمال همزمان
 * - Tooltip مجوز: ادمین بدون دانش فنی هم می‌فهمد چه مجوزی چیست
 * - Quick-assign chips با رنگ نقش
 * - Permission templates برای onboarding
 * - Keyboard shortcut: ⌘K / Ctrl+K برای جستجو
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
  Eye,
  Filter,
  Info,
  Key,
  LayoutGrid,
  Layers,
  Plus,
  RotateCcw,
  Save,
  Search,
  ShieldAlert,
  ShieldCheck,
  ShieldOff,
  Trash2,
  X,
  Zap,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import s from './PermissionsClient.module.css';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  permissions: PermissionRow[];
  matrix: RoleMatrixEntry[];
  currentUserRole: string;
}

type ViewMode = 'matrix' | 'role-focus';

// ─── Constants ────────────────────────────────────────────────────────────────

const ROLE_FA: Record<string, string> = {
  CUSTOMER: 'مشتری',
  MERCHANT: 'تاجر',
  EXCHANGE: 'صراف',
  SUPPORT: 'پشتیبانی',
  ADMIN: 'مدیر',
};

const ROLE_DESC: Record<string, string> = {
  CUSTOMER: 'مشتری عادی — دسترسی محدود به عملیات شخصی و کیف پول.',
  MERCHANT: 'فروشنده — دسترسی به مدیریت پرداخت‌ها، معاملات تجاری و تسویه.',
  EXCHANGE: 'نماینده صرافی — قیمت‌گذاری، تسویه و مدیریت نرخ‌ها.',
  SUPPORT: 'پشتیبانی — دسترسی read-only روی موجودیت‌های حساس برای کمک به کاربران.',
  ADMIN: 'مدیر محتوا و کاربران پلتفرم — دسترسی کامل داشبورد.',
};

const ROLE_COLOR: Record<string, string> = {
  CUSTOMER: 'var(--nova-cyan)',
  MERCHANT: 'var(--nova-violet)',
  EXCHANGE: 'var(--nova-amber)',
  SUPPORT: 'var(--nova-emerald)',
  ADMIN: 'var(--ds-brand-500)',
};

const ROLE_ICON: Record<string, string> = {
  CUSTOMER: '👤',
  MERCHANT: '🏪',
  EXCHANGE: '💱',
  SUPPORT: '🎧',
  ADMIN: '⚙️',
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

// ─── Suggested templates برای onboarding ─────────────────────────────────────

const PERMISSION_TEMPLATES: Array<{ key: string; description: string; category: string }> = [
  { key: 'wallet:read', description: 'مشاهده کیف پول', category: 'wallet' },
  { key: 'wallet:deposit', description: 'واریز به کیف پول', category: 'wallet' },
  { key: 'wallet:withdraw', description: 'برداشت از کیف پول', category: 'wallet' },
  { key: 'transfer:create', description: 'ایجاد انتقال جدید', category: 'transfer' },
  { key: 'transfer:read', description: 'مشاهده تاریخچه انتقال', category: 'transfer' },
  { key: 'quote:read', description: 'مشاهده نرخ‌ها', category: 'quote' },
  { key: 'quote:create', description: 'ایجاد قیمت پیشنهادی', category: 'quote' },
  { key: 'kyc:submit', description: 'ارسال مدارک احراز هویت', category: 'kyc' },
  { key: 'kyc:review', description: 'بررسی مدارک احراز هویت', category: 'kyc' },
  { key: 'user:read', description: 'مشاهده اطلاعات کاربران', category: 'user' },
  { key: 'user:update', description: 'ویرایش کاربران', category: 'user' },
  { key: 'report:view', description: 'مشاهده گزارش‌ها', category: 'report' },
  { key: 'audit:read', description: 'مشاهده لاگ‌های سیستم', category: 'audit' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseCategory(key: string): string {
  const resource = key.split(':')[0] ?? key;
  return CAT_FA[resource] ?? resource;
}

function getCatFaKey(key: string): string {
  const resource = key.split(':')[0] ?? key;
  return resource;
}

// ─── RoleHealthCard ───────────────────────────────────────────────────────────

function RoleHealthCard({
  role,
  total,
  granted,
  isSelected,
  onSelect,
  onSelectAll,
  onClearAll,
  isSuperAdmin,
}: {
  role: string;
  total: number;
  granted: number;
  isSelected: boolean;
  onSelect: () => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  isSuperAdmin: boolean;
}) {
  const [showActions, setShowActions] = useState(false);
  const pct = total > 0 ? Math.round((granted / total) * 100) : 0;
  const isEmpty = granted === 0 && total > 0;
  const isFull = granted === total && total > 0;

  return (
    <div
      className={`${s.roleCard} ${isSelected ? s.roleCardSelected : ''} ${isEmpty ? s.roleCardEmpty : ''}`}
      style={{ '--role-color': ROLE_COLOR[role] } as React.CSSProperties}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(); } }}
      aria-pressed={isSelected}
      aria-label={`نقش ${ROLE_FA[role]} — ${pct}٪ مجوز`}
    >
      <div className={s.roleCardHeader}>
        <div className={s.roleCardDot} aria-hidden />
        <span className={s.roleCardName}>{ROLE_FA[role]}</span>
        {isEmpty && (
          <span className={s.roleCardBadge} data-variant="warning" title="این نقش هیچ مجوزی ندارد">
            <ShieldOff size={10} aria-hidden />
            بدون مجوز
          </span>
        )}
        {isFull && (
          <span className={s.roleCardBadge} data-variant="success">
            <ShieldCheck size={10} aria-hidden />
            کامل
          </span>
        )}
      </div>

      <div className={s.roleCardStats}>
        <span className={s.roleCardGranted}>{granted}</span>
        <span className={s.roleCardOf}>از</span>
        <span className={s.roleCardTotal}>{total}</span>
      </div>

      <div className={s.roleCardBar} aria-hidden>
        <div
          className={s.roleCardBarFill}
          style={{ '--pct': `${pct}%` } as React.CSSProperties}
        />
      </div>

      <div className={s.roleCardFooter}>
        <span className={s.roleCardPct}>{pct}٪ دسترسی</span>
        {isSuperAdmin && (
          <div
            className={s.roleCardActions}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className={s.roleCardMenuBtn}
              onClick={() => setShowActions((v) => !v)}
              aria-label={`گزینه‌های ${ROLE_FA[role]}`}
              aria-expanded={showActions}
            >
              <ChevronDown size={11} aria-hidden />
            </button>
            {showActions && (
              <div
                className={s.roleCardMenu}
                onMouseLeave={() => setShowActions(false)}
              >
                <div className={s.roleCardMenuTitle}>
                  <Info size={10} aria-hidden />
                  {ROLE_DESC[role]}
                </div>
                <div className={s.roleCardMenuDivider} />
                <button
                  type="button"
                  className={s.roleCardMenuItem}
                  onClick={() => { onSelectAll(); setShowActions(false); }}
                >
                  <CheckCircle2 size={12} aria-hidden />
                  فعال‌کردن همه
                </button>
                <button
                  type="button"
                  className={s.roleCardMenuItem}
                  onClick={() => { onClearAll(); setShowActions(false); }}
                >
                  <X size={12} aria-hidden />
                  غیرفعال‌کردن همه
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {isSelected && <div className={s.roleCardSelectedIndicator} aria-hidden />}
    </div>
  );
}

// ─── SuperAdminCard ───────────────────────────────────────────────────────────

function SuperAdminCard({ total }: { total: number }) {
  return (
    <div className={`${s.roleCard} ${s.roleCardSuperAdmin}`}>
      <div className={s.roleCardHeader}>
        <ShieldAlert size={13} className={s.superAdminIcon} aria-hidden />
        <span className={s.roleCardName}>SUPERADMIN</span>
      </div>
      <div className={s.roleCardStats}>
        <span className={s.roleCardGranted}>{total}</span>
        <span className={s.roleCardOf}>از</span>
        <span className={s.roleCardTotal}>{total}</span>
      </div>
      <div className={s.roleCardBar}>
        <div className={s.roleCardBarFill} style={{ '--pct': '100%' } as React.CSSProperties} />
      </div>
      <div className={s.roleCardFooter}>
        <span className={s.roleCardPct}>۱۰۰٪ دسترسی</span>
        <span className={s.superAdminLabel}>read-only</span>
      </div>
    </div>
  );
}

// ─── PermissionTooltip ────────────────────────────────────────────────────────

function PermTooltip({ perm }: { perm: PermissionRow }) {
  const [show, setShow] = useState(false);
  if (!perm.description) return null;

  return (
    <span className={s.permTooltipWrap}>
      <button
        type="button"
        className={s.permTooltipBtn}
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onFocus={() => setShow(true)}
        onBlur={() => setShow(false)}
        aria-label={`توضیح: ${perm.description}`}
      >
        <Info size={11} aria-hidden />
      </button>
      {show && (
        <div className={s.permTooltip} role="tooltip">
          {perm.description}
        </div>
      )}
    </span>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function PermissionsClient({ permissions, matrix, currentUserRole }: Props) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  // ── Local Matrix State ────────────────────────────────────────────────────
  const [localMatrix, setLocalMatrix] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    for (const row of matrix) {
      for (const role of EDITABLE_ROLES) {
        map[`${row.permissionId}:${role}`] = row.roles[role] ?? false;
      }
    }
    return map;
  });

  const [dirty, setDirty] = useState(false);
  const originalRef = useRef<Record<string, boolean>>({ ...localMatrix });

  // ── Local Permissions ─────────────────────────────────────────────────────
  const [localPerms, setLocalPerms] = useState<PermissionRow[]>(permissions);

  // ── View Mode ─────────────────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<ViewMode>('matrix');
  const [focusedRole, setFocusedRole] = useState<string | null>(null);

  // ── Search / Filter ───────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [catFilter, setCatFilter] = useState<string>('all');
  const searchRef = useRef<HTMLInputElement>(null);

  // ── Batch Selection ───────────────────────────────────────────────────────
  const [batchSelected, setBatchSelected] = useState<Set<string>>(new Set());
  const [showBatchPanel, setShowBatchPanel] = useState(false);

  // ── Dialogs ───────────────────────────────────────────────────────────────
  const [showAdd, setShowAdd] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [addPending, startAddTransition] = useTransition();
  const [showTemplates, setShowTemplates] = useState(false);

  const [deletePending, startDeleteTransition] = useTransition();
  const [deleteTarget, setDeleteTarget] = useState<PermissionRow | null>(null);

  // ── Keyboard shortcut: ⌘K / Ctrl+K ───────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === 'Escape' && batchSelected.size > 0) {
        setBatchSelected(new Set());
        setShowBatchPanel(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [batchSelected]);

  // ── Derived Data ──────────────────────────────────────────────────────────

  const visiblePerms = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return localPerms.filter((p) => {
      if (catFilter !== 'all' && getCatFaKey(p.key) !== catFilter) return false;
      if (viewMode === 'role-focus' && focusedRole) {
        // در حالت role-focus، فقط مجوزهای مرتبط را نشان بده
        if (searchQuery === '') return true;
      }
      if (!q) return true;
      return p.key.toLowerCase().includes(q) || (p.description ?? '').toLowerCase().includes(q);
    });
  }, [localPerms, searchQuery, catFilter, viewMode, focusedRole]);

  const categories = useMemo(() => {
    return Array.from(new Set(localPerms.map((p) => getCatFaKey(p.key)))).sort((a, b) =>
      a.localeCompare(b, 'fa'),
    );
  }, [localPerms]);

  const grouped = useMemo(() => {
    const groups: Record<string, PermissionRow[]> = {};
    for (const perm of visiblePerms) {
      const cat = getCatFaKey(perm.key);
      if (!groups[cat]) groups[cat] = [];
      groups[cat]?.push(perm);
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b, 'fa'));
  }, [visiblePerms]);

  const changeCount = useMemo(() => {
    return Object.entries(localMatrix).filter(([k, v]) => originalRef.current[k] !== v).length;
  }, [localMatrix]);

  // مجوزهای نقش focused
  const focusedRolePerms = useMemo(() => {
    if (!focusedRole) return { granted: [], denied: [] };
    const granted: PermissionRow[] = [];
    const denied: PermissionRow[] = [];
    for (const perm of visiblePerms) {
      if (localMatrix[`${perm.id}:${focusedRole}`]) {
        granted.push(perm);
      } else {
        denied.push(perm);
      }
    }
    return { granted, denied };
  }, [focusedRole, visiblePerms, localMatrix]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleCheck = useCallback((permId: string, role: EditableRole, val: boolean) => {
    setLocalMatrix((prev) => {
      const next = { ...prev, [`${permId}:${role}`]: val };
      setDirty(Object.entries(next).some(([k, v]) => originalRef.current[k] !== v));
      return next;
    });
  }, []);

  const handleColumnSelectAll = useCallback(
    (role: EditableRole) => {
      setLocalMatrix((prev) => {
        const next = { ...prev };
        for (const perm of localPerms) next[`${perm.id}:${role}`] = true;
        setDirty(Object.entries(next).some(([k, v]) => originalRef.current[k] !== v));
        return next;
      });
    },
    [localPerms],
  );

  const handleColumnClearAll = useCallback(
    (role: EditableRole) => {
      setLocalMatrix((prev) => {
        const next = { ...prev };
        for (const perm of localPerms) next[`${perm.id}:${role}`] = false;
        setDirty(Object.entries(next).some(([k, v]) => originalRef.current[k] !== v));
        return next;
      });
    },
    [localPerms],
  );

  // Batch: toggle مجوز در selection
  const handleBatchToggle = useCallback((permId: string) => {
    setBatchSelected((prev) => {
      const next = new Set(prev);
      if (next.has(permId)) next.delete(permId);
      else next.add(permId);
      setShowBatchPanel(next.size > 0);
      return next;
    });
  }, []);

  // Batch: اعمال نقش به همه‌ی انتخاب‌شده‌ها
  const handleBatchAssign = useCallback((role: EditableRole, val: boolean) => {
    setLocalMatrix((prev) => {
      const next = { ...prev };
      for (const permId of batchSelected) next[`${permId}:${role}`] = val;
      setDirty(Object.entries(next).some(([k, v]) => originalRef.current[k] !== v));
      return next;
    });
  }, [batchSelected]);

  const handleBatchClearSelection = useCallback(() => {
    setBatchSelected(new Set());
    setShowBatchPanel(false);
  }, []);

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
        toast({ title: 'تغییرات ذخیره شد', description: `${result.data?.updated ?? 0} مجوز به‌روزرسانی شد` });
      } else {
        toast({ title: 'خطا در ذخیره', description: result.error.message, variant: 'destructive' });
      }
    });
  }, [localMatrix, localPerms, toast]);

  const handleDiscard = useCallback(() => {
    setLocalMatrix({ ...originalRef.current });
    setDirty(false);
  }, []);

  const handleAdd = useCallback(() => {
    startAddTransition(async () => {
      const result = await createPermission({ key: newKey.trim(), description: newDesc.trim() || null });
      if (result.success && result.data) {
        const perm = result.data;
        setLocalPerms((prev) => [...prev, perm]);
        setLocalMatrix((prev) => {
          const next = { ...prev };
          for (const role of EDITABLE_ROLES) next[`${perm.id}:${role}`] = false;
          originalRef.current = { ...next };
          return next;
        });
        setNewKey('');
        setNewDesc('');
        setShowAdd(false);
        setShowTemplates(false);
        toast({ title: 'مجوز ثبت شد', description: perm.key });
      } else if (!result.success) {
        toast({ title: 'خطا', description: result.error.message, variant: 'destructive' });
      }
    });
  }, [newKey, newDesc, toast]);

  const handleAddFromTemplate = useCallback((template: { key: string; description: string }) => {
    setNewKey(template.key);
    setNewDesc(template.description);
    setShowTemplates(false);
    setShowAdd(true);
  }, []);

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
        setBatchSelected((prev) => { const n = new Set(prev); n.delete(deleteTarget.id); return n; });
        setDeleteTarget(null);
        toast({ title: 'مجوز حذف شد' });
      } else {
        toast({ title: 'خطا', description: result.error.message, variant: 'destructive' });
        setDeleteTarget(null);
      }
    });
  }, [deleteTarget, toast]);

  const isSuperAdmin = currentUserRole === 'OWNER' || currentUserRole === 'SUPERADMIN';

  const handleRoleCardClick = useCallback((role: string) => {
    if (viewMode === 'role-focus') {
      if (focusedRole === role) {
        setFocusedRole(null);
        setViewMode('matrix');
      } else {
        setFocusedRole(role);
      }
    } else {
      setViewMode('role-focus');
      setFocusedRole(role);
    }
  }, [viewMode, focusedRole]);

  // تعداد مجوزهای ثبت‌نشده در db که template دارند
  const availableTemplates = useMemo(() => {
    const existingKeys = new Set(localPerms.map((p) => p.key));
    return PERMISSION_TEMPLATES.filter((t) => !existingKeys.has(t.key));
  }, [localPerms]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className={s.root} dir="rtl">

      {/* ── Page Header ────────────────────────────────────────────────── */}
      <PageHeader
        breadcrumb={[{ label: 'داشبورد', href: '/dashboard' }, { label: 'مجوزها' }]}
        title="مدیریت مجوزها"
        description="ماتریس کنترل دسترسی — تعیین کنید هر نقش چه عملیاتی می‌تواند انجام دهد"
        eyebrow="RBAC"
        actions={
          isSuperAdmin ? (
            <div className={s.headerActions}>
              {availableTemplates.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowTemplates(true)}
                  className={s.templateBtn}
                >
                  <Zap size={14} aria-hidden />
                  قالب‌های سریع
                  <span className={s.templateCount}>{availableTemplates.length}</span>
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowAdd(true)}
              >
                <Plus size={15} aria-hidden />
                مجوز جدید
              </Button>
            </div>
          ) : null
        }
      />

      {/* ── Role Health Cards ───────────────────────────────────────────── */}
      <div className={s.rolesSection}>
        <div className={s.rolesSectionHeader}>
          <div className={s.rolesSectionTitle}>
            <ShieldCheck size={14} aria-hidden />
            پوشش مجوز به‌تفکیک نقش
          </div>
          <div className={s.viewToggle} role="group" aria-label="نوع نمایش">
            <button
              type="button"
              className={`${s.viewToggleBtn} ${viewMode === 'matrix' ? s.viewToggleBtnActive : ''}`}
              onClick={() => { setViewMode('matrix'); setFocusedRole(null); }}
            >
              <LayoutGrid size={13} aria-hidden />
              ماتریس
            </button>
            <button
              type="button"
              className={`${s.viewToggleBtn} ${viewMode === 'role-focus' ? s.viewToggleBtnActive : ''}`}
              onClick={() => setViewMode('role-focus')}
            >
              <Eye size={13} aria-hidden />
              نقش‌محور
            </button>
          </div>
        </div>

        <div className={s.rolesGrid}>
          {EDITABLE_ROLES.map((role) => {
            const granted = localPerms.filter((p) => localMatrix[`${p.id}:${role}`]).length;
            return (
              <RoleHealthCard
                key={role}
                role={role}
                total={localPerms.length}
                granted={granted}
                isSelected={viewMode === 'role-focus' && focusedRole === role}
                onSelect={() => handleRoleCardClick(role)}
                onSelectAll={() => handleColumnSelectAll(role as EditableRole)}
                onClearAll={() => handleColumnClearAll(role as EditableRole)}
                isSuperAdmin={isSuperAdmin}
              />
            );
          })}
          <SuperAdminCard total={localPerms.length} />
        </div>
      </div>

      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      {localPerms.length > 0 && (
        <div className={s.toolbar}>
          {/* Search */}
          <div className={s.searchWrap}>
            <Search size={14} className={s.searchIcon} aria-hidden />
            <input
              ref={searchRef}
              className={s.searchInput}
              placeholder="جستجو مجوز... (⌘K)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="جستجو در مجوزها"
              dir="ltr"
            />
            {searchQuery ? (
              <button
                type="button"
                className={s.searchClear}
                onClick={() => setSearchQuery('')}
                aria-label="پاک کردن جستجو"
              >
                <X size={11} />
              </button>
            ) : (
              <kbd className={s.searchKbd} aria-hidden>⌘K</kbd>
            )}
          </div>

          {/* Category Filter */}
          <div className={s.catPills} role="group" aria-label="فیلتر دسته‌بندی">
            <button
              type="button"
              className={`${s.catPill} ${catFilter === 'all' ? s.catPillActive : ''}`}
              onClick={() => setCatFilter('all')}
            >
              <Filter size={11} aria-hidden />
              همه
              <span className={s.catCount}>{localPerms.length}</span>
            </button>
            {categories.map((cat) => {
              const count = localPerms.filter((p) => getCatFaKey(p.key) === cat).length;
              return (
                <button
                  key={cat}
                  type="button"
                  className={`${s.catPill} ${catFilter === cat ? s.catPillActive : ''}`}
                  onClick={() => setCatFilter(cat)}
                >
                  {CAT_FA[cat] ?? cat}
                  <span className={s.catCount}>{count}</span>
                </button>
              );
            })}
          </div>

          {/* Batch indicator */}
          {batchSelected.size > 0 && (
            <div className={s.batchIndicator}>
              <span className={s.batchCount}>{batchSelected.size} انتخاب</span>
              <button
                type="button"
                className={s.batchClearBtn}
                onClick={handleBatchClearSelection}
                aria-label="لغو انتخاب"
              >
                <X size={11} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Main Content ─────────────────────────────────────────────────── */}
      {localPerms.length === 0 ? (
        /* ── Empty State ───────────────────────────────────────────────── */
        <div className={s.emptyWrap}>
          <EmptyState
            icon={Key}
            title="هنوز مجوزی تعریف نشده"
            description="برای شروع، مجوزهای پلتفرم را تعریف کنید. هر مجوز یک عملیات خاص را نمایندگی می‌کند (مثال: wallet:read)"
            action={
              isSuperAdmin ? (
                <div className={s.emptyActions}>
                  <Button size="sm" onClick={() => setShowAdd(true)}>
                    <Plus size={14} aria-hidden />
                    مجوز اول را ثبت کن
                  </Button>
                  {PERMISSION_TEMPLATES.length > 0 && (
                    <Button size="sm" variant="outline" onClick={() => setShowTemplates(true)}>
                      <Zap size={14} aria-hidden />
                      استفاده از قالب‌ها ({PERMISSION_TEMPLATES.length} مجوز آماده)
                    </Button>
                  )}
                </div>
              ) : null
            }
          />
        </div>
      ) : grouped.length === 0 ? (
        /* ── No results ─────────────────────────────────────────────────── */
        <EmptyState
          icon={Search}
          title="نتیجه‌ای یافت نشد"
          description={`«${searchQuery}» با هیچ مجوزی مطابقت ندارد. فیلتر یا دسته را تغییر دهید.`}
          action={
            <Button size="sm" variant="outline" onClick={() => { setSearchQuery(''); setCatFilter('all'); }}>
              <RotateCcw size={13} aria-hidden />
              پاک کردن فیلتر
            </Button>
          }
        />
      ) : viewMode === 'role-focus' && focusedRole ? (
        /* ── Role-Focus View ────────────────────────────────────────────── */
        <RoleFocusView
          role={focusedRole}
          grantedPerms={focusedRolePerms.granted}
          deniedPerms={focusedRolePerms.denied}
          localMatrix={localMatrix}
          allRoles={EDITABLE_ROLES}
          isSuperAdmin={isSuperAdmin}
          onCheck={handleCheck}
          onDelete={isSuperAdmin ? setDeleteTarget : undefined}
          batchSelected={batchSelected}
          onBatchToggle={handleBatchToggle}
        />
      ) : viewMode === 'role-focus' && !focusedRole ? (
        /* ── Role-Focus hint: کارت انتخاب نشده ───────────────────────── */
        <div className={s.roleFocusHint}>
          <Layers size={32} className={s.roleFocusHintIcon} aria-hidden />
          <p className={s.roleFocusHintText}>یک نقش از بالا انتخاب کنید تا مجوزهای آن را ببینید</p>
        </div>
      ) : (
        /* ── Matrix View ────────────────────────────────────────────────── */
        <MatrixView
          grouped={grouped}
          localMatrix={localMatrix}
          isSuperAdmin={isSuperAdmin}
          searchQuery={searchQuery}
          batchSelected={batchSelected}
          onCheck={handleCheck}
          onDelete={setDeleteTarget}
          onBatchToggle={handleBatchToggle}
        />
      )}

      {/* ── Batch Action Panel ──────────────────────────────────────────── */}
      {showBatchPanel && batchSelected.size > 0 && (
        <BatchPanel
          count={batchSelected.size}
          onAssign={handleBatchAssign}
          onClose={handleBatchClearSelection}
          isSuperAdmin={isSuperAdmin}
        />
      )}

      {/* ── Unsaved Changes Bar ──────────────────────────────────────────── */}
      {dirty && !showBatchPanel && (
        <div className={s.unsavedBar} role="alert" aria-live="polite">
          <span className={s.unsavedIcon} aria-hidden>
            <AlertTriangle size={15} />
          </span>
          <div className={s.unsavedTextGroup}>
            <span className={s.unsavedText}>تغییرات ذخیره نشده</span>
            <span className={s.unsavedCount}>{changeCount} تغییر</span>
          </div>
          <div className={s.unsavedActions}>
            <button type="button" className={s.discardBtn} onClick={handleDiscard} disabled={isPending}>
              <X size={13} aria-hidden />
              لغو
            </button>
            <button type="button" className={s.saveBtn} onClick={handleSave} disabled={isPending}>
              {isPending ? <span className={s.spinner} aria-label="در حال ذخیره" /> : <Save size={13} aria-hidden />}
              ذخیره تغییرات
            </button>
          </div>
        </div>
      )}

      {/* ── Dialog افزودن مجوز ──────────────────────────────────────────── */}
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
              <Label htmlFor="perm-key">کلید مجوز <span className={s.required}>*</span></Label>
              <Input
                id="perm-key"
                placeholder="مثال: wallet:read"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && newKey.trim()) handleAdd(); }}
                dir="ltr"
                className={s.codeInput}
                autoFocus
              />
              <p className={s.fieldHint}>
                فرمت: <code>resource:action</code> — فقط حروف کوچک انگلیسی، عدد، خط‌تیره و دو‌نقطه
              </p>
            </div>
            <div className={s.fieldGroup}>
              <Label htmlFor="perm-desc">توضیح فارسی</Label>
              <Input
                id="perm-desc"
                placeholder="توضیح ساده برای adminهایی که نمی‌دانند این مجوز چیست"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
              />
            </div>
            {/* پیش‌نمایش */}
            {newKey && (
              <div className={s.permPreview}>
                <span className={s.permPreviewLabel}>پیش‌نمایش:</span>
                <span className={s.keyBadge}>{newKey}</span>
                {newDesc && <span className={s.permPreviewDesc}>{newDesc}</span>}
              </div>
            )}
          </div>
          <DialogFooter className={s.dialogFooter}>
            <Button variant="outline" onClick={() => setShowAdd(false)} disabled={addPending}>
              انصراف
            </Button>
            <Button onClick={handleAdd} disabled={addPending || !newKey.trim()}>
              {addPending ? <span className={s.spinner} aria-label="در حال ثبت" /> : <CheckCircle2 size={14} aria-hidden />}
              ثبت مجوز
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog قالب‌های سریع ─────────────────────────────────────── */}
      <Dialog open={showTemplates} onOpenChange={setShowTemplates}>
        <DialogContent dir="rtl" className={s.dialogWide}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap size={17} aria-hidden />
              قالب‌های پیشنهادی
            </DialogTitle>
          </DialogHeader>
          <div className={s.templatesGrid}>
            {availableTemplates.map((t) => (
              <button
                key={t.key}
                type="button"
                className={s.templateCard}
                onClick={() => handleAddFromTemplate(t)}
              >
                <span className={s.keyBadge}>{t.key}</span>
                <span className={s.templateCardDesc}>{t.description}</span>
                <span className={s.templateCardCat}>{CAT_FA[t.category] ?? t.category}</span>
              </button>
            ))}
            {availableTemplates.length === 0 && (
              <p className={s.templatesEmpty}>تمام قالب‌های پیشنهادی ثبت شده‌اند ✓</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Confirm حذف ─────────────────────────────────────────────────── */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}
        title="حذف مجوز"
        description={
          deleteTarget
            ? `مجوز «${deleteTarget.key}» حذف می‌شود. این عملیات در صورتی که مجوز در نقشی استفاده شده باشد رد می‌شود.`
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

// ─── MatrixView ───────────────────────────────────────────────────────────────

function MatrixView({
  grouped,
  localMatrix,
  isSuperAdmin,
  searchQuery,
  batchSelected,
  onCheck,
  onDelete,
  onBatchToggle,
}: {
  grouped: [string, PermissionRow[]][];
  localMatrix: Record<string, boolean>;
  isSuperAdmin: boolean;
  searchQuery: string;
  batchSelected: Set<string>;
  onCheck: (permId: string, role: EditableRole, val: boolean) => void;
  onDelete: (perm: PermissionRow) => void;
  onBatchToggle: (permId: string) => void;
}) {
  return (
    <div className={s.matrixWrap}>
      <table className={s.matrixTable} aria-label="ماتریس مجوزها">
        <thead>
          <tr className={s.matrixHeader}>
            <th scope="col" className={s.colKey}>
              <span className={s.colKeyLabel}>کلید مجوز</span>
              <span className={s.colKeyCount}>
                {grouped.reduce((acc, [, p]) => acc + p.length, 0)} مجوز
              </span>
            </th>
            {EDITABLE_ROLES.map((role) => (
              <th
                key={role}
                scope="col"
                className={s.colRole}
                style={{ '--role-color': ROLE_COLOR[role] } as React.CSSProperties}
              >
                <span className={s.roleHeaderLabel}>{ROLE_FA[role]}</span>
              </th>
            ))}
            <th scope="col" className={s.colSuperAdmin}>
              <span className={s.superAdminHeaderLabel}>SUPER</span>
            </th>
            <th scope="col" className={s.colAction} aria-label="عملیات" />
          </tr>
        </thead>

        {grouped.map(([cat, perms]) => (
          <tbody key={cat} className={s.group}>
            <tr className={s.groupHeader}>
              <td colSpan={EDITABLE_ROLES.length + 3}>
                <div className={s.groupLabelWrap}>
                  <span className={s.groupLabel}>{CAT_FA[cat] ?? cat}</span>
                  <span className={s.groupCount}>{perms.length}</span>
                </div>
              </td>
            </tr>
            {perms.map((perm, i) => {
              const isSelected = batchSelected.has(perm.id);
              return (
                <tr
                  key={perm.id}
                  className={`${s.matrixRow} ${isSelected ? s.matrixRowSelected : ''}`}
                  style={{ '--row-i': i } as React.CSSProperties}
                >
                  {/* Batch checkbox + key */}
                  <td className={s.colKey}>
                    <div className={s.keyCell}>
                      <div
                        className={`${s.batchCheck} ${isSelected ? s.batchCheckActive : ''}`}
                        onClick={(e) => { e.stopPropagation(); onBatchToggle(perm.id); }}
                        role="checkbox"
                        aria-checked={isSelected}
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); onBatchToggle(perm.id); } }}
                        aria-label={`انتخاب ${perm.key} برای عملیات دسته‌جمعی`}
                      >
                        {isSelected && <CheckCircle2 size={11} aria-hidden />}
                      </div>
                      <div className={s.keyInfo}>
                        <div className={s.keyRow}>
                          <span
                            className={s.keyBadge}
                            style={
                              searchQuery && perm.key.toLowerCase().includes(searchQuery.toLowerCase())
                                ? { outline: '1.5px solid var(--at-accent)', outlineOffset: '2px' }
                                : undefined
                            }
                          >
                            {perm.key}
                          </span>
                          {perm.description && <PermTooltip perm={perm} />}
                        </div>
                        {perm.description && (
                          <span className={s.keyDesc}>{perm.description}</span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Role checkboxes */}
                  {EDITABLE_ROLES.map((role) => {
                    const checked = localMatrix[`${perm.id}:${role}`] ?? false;
                    return (
                      <td key={role} className={s.colRole}>
                        <Checkbox
                          id={`${perm.id}-${role}`}
                          checked={checked}
                          onCheckedChange={(val) => onCheck(perm.id, role as EditableRole, val === true)}
                          aria-label={`${ROLE_FA[role]} — ${perm.key}`}
                          className={s.checkbox}
                          style={{ '--cb-color': ROLE_COLOR[role] } as React.CSSProperties}
                        />
                      </td>
                    );
                  })}

                  {/* SUPERADMIN — always checked */}
                  <td className={s.colSuperAdmin}>
                    <span className={s.superAdminCheck} aria-label="دسترسی کامل">
                      <CheckCircle2 size={13} aria-hidden />
                    </span>
                  </td>

                  {/* Delete */}
                  <td className={s.colAction}>
                    {isSuperAdmin && (
                      <button
                        type="button"
                        className={s.deleteRowBtn}
                        onClick={() => onDelete(perm)}
                        aria-label={`حذف ${perm.key}`}
                        title={`حذف ${perm.key}`}
                      >
                        <Trash2 size={13} aria-hidden />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        ))}
      </table>
    </div>
  );
}

// ─── RoleFocusView ────────────────────────────────────────────────────────────

function RoleFocusView({
  role,
  grantedPerms,
  deniedPerms,
  localMatrix,
  allRoles,
  isSuperAdmin,
  onCheck,
  onDelete,
  batchSelected,
  onBatchToggle,
}: {
  role: string;
  grantedPerms: PermissionRow[];
  deniedPerms: PermissionRow[];
  localMatrix: Record<string, boolean>;
  allRoles: readonly EditableRole[];
  isSuperAdmin: boolean;
  onCheck: (permId: string, role: EditableRole, val: boolean) => void;
  onDelete?: (perm: PermissionRow) => void;
  batchSelected: Set<string>;
  onBatchToggle: (permId: string) => void;
}) {
  return (
    <div className={s.roleFocusView}>
      {/* Header */}
      <div className={s.roleFocusHeader} style={{ '--role-color': ROLE_COLOR[role] } as React.CSSProperties}>
        <div className={s.roleFocusHeaderInner}>
          <div className={s.roleFocusDot} aria-hidden />
          <h2 className={s.roleFocusTitle}>{ROLE_FA[role]}</h2>
          <span className={s.roleFocusDesc}>{ROLE_DESC[role]}</span>
        </div>
        <div className={s.roleFocusStats}>
          <span className={s.roleFocusStatItem} data-variant="success">
            <ShieldCheck size={14} aria-hidden />
            {grantedPerms.length} مجوز فعال
          </span>
          <span className={s.roleFocusStatItem} data-variant="muted">
            <ShieldOff size={14} aria-hidden />
            {deniedPerms.length} مجوز غیرفعال
          </span>
        </div>
      </div>

      {/* Two columns: granted + denied */}
      <div className={s.roleFocusColumns}>
        {/* Granted */}
        <div className={s.roleFocusSection} data-variant="granted">
          <div className={s.roleFocusSectionHeader}>
            <ShieldCheck size={13} aria-hidden />
            <span>مجوزهای فعال</span>
            <span className={s.roleFocusSectionCount}>{grantedPerms.length}</span>
          </div>
          <div className={s.roleFocusPermList}>
            {grantedPerms.length === 0 ? (
              <div className={s.roleFocusEmpty}>
                <ShieldOff size={20} aria-hidden />
                <p>هیچ مجوزی فعال نیست</p>
              </div>
            ) : (
              grantedPerms.map((perm) => (
                <RoleFocusPermRow
                  key={perm.id}
                  perm={perm}
                  role={role}
                  checked={true}
                  isSuperAdmin={isSuperAdmin}
                  onCheck={onCheck}
                  onDelete={onDelete}
                  isSelected={batchSelected.has(perm.id)}
                  onBatchToggle={onBatchToggle}
                />
              ))
            )}
          </div>
        </div>

        {/* Denied */}
        <div className={s.roleFocusSection} data-variant="denied">
          <div className={s.roleFocusSectionHeader}>
            <ShieldOff size={13} aria-hidden />
            <span>مجوزهای غیرفعال</span>
            <span className={s.roleFocusSectionCount}>{deniedPerms.length}</span>
          </div>
          <div className={s.roleFocusPermList}>
            {deniedPerms.length === 0 ? (
              <div className={s.roleFocusEmpty} data-variant="success">
                <ShieldCheck size={20} aria-hidden />
                <p>تمام مجوزها فعال هستند</p>
              </div>
            ) : (
              deniedPerms.map((perm) => (
                <RoleFocusPermRow
                  key={perm.id}
                  perm={perm}
                  role={role}
                  checked={false}
                  isSuperAdmin={isSuperAdmin}
                  onCheck={onCheck}
                  onDelete={onDelete}
                  isSelected={batchSelected.has(perm.id)}
                  onBatchToggle={onBatchToggle}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── RoleFocusPermRow ─────────────────────────────────────────────────────────

function RoleFocusPermRow({
  perm,
  role,
  checked,
  isSuperAdmin,
  onCheck,
  onDelete,
  isSelected,
  onBatchToggle,
}: {
  perm: PermissionRow;
  role: string;
  checked: boolean;
  isSuperAdmin: boolean;
  onCheck: (permId: string, role: EditableRole, val: boolean) => void;
  onDelete?: (perm: PermissionRow) => void;
  isSelected: boolean;
  onBatchToggle: (permId: string) => void;
}) {
  return (
    <div
      className={`${s.roleFocusPermRow} ${isSelected ? s.roleFocusPermRowSelected : ''}`}
      style={{ '--role-color': ROLE_COLOR[role] } as React.CSSProperties}
    >
      <div
        className={`${s.batchCheck} ${isSelected ? s.batchCheckActive : ''}`}
        onClick={() => onBatchToggle(perm.id)}
        role="checkbox"
        aria-checked={isSelected}
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); onBatchToggle(perm.id); } }}
        aria-label={`انتخاب ${perm.key}`}
      >
        {isSelected && <CheckCircle2 size={11} aria-hidden />}
      </div>
      <div className={s.roleFocusPermInfo}>
        <span className={s.keyBadge}>{perm.key}</span>
        {perm.description && <span className={s.keyDesc}>{perm.description}</span>}
      </div>
      <div className={s.roleFocusPermActions}>
        <button
          type="button"
          className={`${s.toggleChip} ${checked ? s.toggleChipActive : ''}`}
          onClick={() => onCheck(perm.id, role as EditableRole, !checked)}
          style={{ '--role-color': ROLE_COLOR[role] } as React.CSSProperties}
          aria-label={checked ? `غیرفعال کردن ${perm.key} برای ${ROLE_FA[role]}` : `فعال کردن ${perm.key} برای ${ROLE_FA[role]}`}
        >
          {checked ? <ShieldCheck size={12} aria-hidden /> : <ShieldOff size={12} aria-hidden />}
          {checked ? 'فعال' : 'غیرفعال'}
        </button>
        {isSuperAdmin && onDelete && (
          <button
            type="button"
            className={s.deleteRowBtn}
            onClick={() => onDelete(perm)}
            aria-label={`حذف ${perm.key}`}
          >
            <Trash2 size={12} aria-hidden />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── BatchPanel ───────────────────────────────────────────────────────────────

function BatchPanel({
  count,
  onAssign,
  onClose,
  isSuperAdmin,
}: {
  count: number;
  onAssign: (role: EditableRole, val: boolean) => void;
  onClose: () => void;
  isSuperAdmin: boolean;
}) {
  if (!isSuperAdmin) return null;
  return (
    <div className={s.batchPanel} role="toolbar" aria-label="عملیات دسته‌جمعی">
      <div className={s.batchPanelInfo}>
        <span className={s.batchPanelCount}>{count} مجوز انتخاب‌شده</span>
        <span className={s.batchPanelHint}>نقش‌ها را به همه اعمال کنید:</span>
      </div>
      <div className={s.batchPanelRoles}>
        {EDITABLE_ROLES.map((role) => (
          <div key={role} className={s.batchRoleGroup} style={{ '--role-color': ROLE_COLOR[role] } as React.CSSProperties}>
            <span className={s.batchRoleLabel}>{ROLE_FA[role]}</span>
            <div className={s.batchRoleBtns}>
              <button
                type="button"
                className={s.batchRoleBtn}
                data-variant="grant"
                onClick={() => onAssign(role, true)}
                aria-label={`اعطای ${ROLE_FA[role]} به همه انتخاب‌شده‌ها`}
              >
                <ShieldCheck size={11} aria-hidden />
                فعال
              </button>
              <button
                type="button"
                className={s.batchRoleBtn}
                data-variant="revoke"
                onClick={() => onAssign(role, false)}
                aria-label={`لغو ${ROLE_FA[role]} از همه انتخاب‌شده‌ها`}
              >
                <ShieldOff size={11} aria-hidden />
                لغو
              </button>
            </div>
          </div>
        ))}
      </div>
      <button
        type="button"
        className={s.batchPanelClose}
        onClick={onClose}
        aria-label="بستن پنل دسته‌جمعی"
      >
        <X size={14} aria-hidden />
      </button>
    </div>
  );
}
