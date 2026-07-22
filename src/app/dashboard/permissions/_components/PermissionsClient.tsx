'use client';

/**
 * PermissionsClient — 2026 Atelier RBAC
 *
 * زبان بصری: AtelierDeck (at-tile / at-grid / radial gradient / SVG mark / sparkline)
 * - Hero command tile: gradient پس‌زمینه + SVG shield mark + stats + actions
 * - Role cards: at-tile با رنگ نقش، progress arc SVG، health indicator
 * - Matrix: at-tile table با sticky header، checkbox رنگ‌محور، batch ops
 * - Role-focus: دو ستون at-tile برای مجوزهای فعال/غیرفعال
 * - Templates dialog: کارت‌های at-tile کوچک
 * - فونت انگلیسی: Inter + JetBrains Mono
 */

import {
  type PermissionRow,
  type RoleMatrixEntry,
  createPermission,
  createPermissions,
  deletePermission,
  saveRoleMatrix,
} from '@/actions/permission-actions';
import { ConfirmDialog, EmptyState } from '@/components/Dashboard/primitives';
import { Button } from '@/components/ui/button';
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
  ArrowLeftRight,
  BarChart2,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Eye,
  Filter,
  Fingerprint,
  HandCoins,
  Info,
  Key,
  LayoutGrid,
  Layers,
  Lock,
  Plus,
  RotateCcw,
  Save,
  Scale,
  Search,
  Settings2,
  ShieldAlert,
  ShieldCheck,
  ShieldOff,
  Trash2,
  TrendingUp,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import React, {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useTransition,
} from 'react';
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
  SUPERADMIN: 'سوپرادمین',
  OWNER: 'مالک',
};

const ROLE_DESC: Record<string, string> = {
  CUSTOMER: 'مشتری عادی — دسترسی محدود به عملیات شخصی و کیف پول.',
  MERCHANT: 'فروشنده — دسترسی به مدیریت پرداخت‌ها، معاملات تجاری و تسویه.',
  EXCHANGE: 'نماینده صرافی — قیمت‌گذاری، تسویه و مدیریت نرخ‌ها.',
  SUPPORT: 'پشتیبانی — دسترسی read-only روی موجودیت‌های حساس.',
  ADMIN: 'مدیر محتوا و کاربران پلتفرم — دسترسی کامل داشبورد.',
};

// رنگ هر نقش — از nova tokens پروژه
const ROLE_COLOR: Record<string, string> = {
  CUSTOMER: 'var(--nova-cyan)',
  MERCHANT: 'var(--nova-violet)',
  EXCHANGE: 'var(--nova-amber)',
  SUPPORT: 'var(--nova-emerald)',
  ADMIN: 'var(--ds-brand-500)',
  SUPERADMIN: 'var(--nova-rose)',
  OWNER: 'var(--ds-brand-700)',
};

// رنگ tone برای at-hero__quick-item compat
const ROLE_TONE: Record<string, string> = {
  CUSTOMER: 'info',
  MERCHANT: 'violet',
  EXCHANGE: 'gold',
  SUPPORT: 'accent',
  ADMIN: 'accent',
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

// CAT icon — برای header گروه‌ها
const CAT_ICON: Record<string, React.ReactNode> = {
  wallet:      <Wallet      size={12} aria-hidden />,
  transfer:    <ArrowLeftRight size={12} aria-hidden />,
  quote:       <TrendingUp  size={12} aria-hidden />,
  deal:        <HandCoins   size={12} aria-hidden />,
  settlement:  <Scale       size={12} aria-hidden />,
  kyc:         <Fingerprint size={12} aria-hidden />,
  user:        <Users       size={12} aria-hidden />,
  report:      <BarChart2   size={12} aria-hidden />,
  exchange:    <ArrowLeftRight size={12} aria-hidden />,
  admin:       <Settings2   size={12} aria-hidden />,
  permissions: <Key         size={12} aria-hidden />,
  audit:       <ClipboardList size={12} aria-hidden />,
  fraud:       <ShieldAlert size={12} aria-hidden />,
};

// ─── Permission Templates ──────────────────────────────────────────────────────

const PERMISSION_TEMPLATES = [
  { key: 'wallet:read',         description: 'مشاهده کیف پول',                 category: 'wallet' },
  { key: 'wallet:deposit',      description: 'واریز به کیف پول',                category: 'wallet' },
  { key: 'wallet:withdraw',     description: 'برداشت از کیف پول',               category: 'wallet' },
  { key: 'transfer:create',     description: 'ایجاد انتقال جدید',               category: 'transfer' },
  { key: 'transfer:read',       description: 'مشاهده تاریخچه انتقال',           category: 'transfer' },
  { key: 'quote:read',          description: 'مشاهده نرخ‌ها',                   category: 'quote' },
  { key: 'quote:create',        description: 'ایجاد قیمت پیشنهادی',            category: 'quote' },
  { key: 'deal:read',           description: 'مشاهده معاملات',                  category: 'deal' },
  { key: 'deal:confirm',        description: 'تأیید معامله',                    category: 'deal' },
  { key: 'deal:complete',       description: 'تکمیل معامله',                    category: 'deal' },
  { key: 'settlement:read',     description: 'مشاهده تسویه‌ها',                 category: 'settlement' },
  { key: 'settlement:create',   description: 'ایجاد تسویه',                     category: 'settlement' },
  { key: 'kyc:submit',          description: 'ارسال مدارک احراز هویت',          category: 'kyc' },
  { key: 'kyc:review',          description: 'بررسی مدارک احراز هویت',          category: 'kyc' },
  { key: 'kyc:approve',         description: 'تأیید احراز هویت',                category: 'kyc' },
  { key: 'user:read',           description: 'مشاهده اطلاعات کاربران',          category: 'user' },
  { key: 'user:update',         description: 'ویرایش کاربران',                  category: 'user' },
  { key: 'user:block',          description: 'مسدودسازی کاربر',                 category: 'user' },
  { key: 'report:view',         description: 'مشاهده گزارش‌ها',                 category: 'report' },
  { key: 'report:export',       description: 'خروجی گزارش‌ها',                  category: 'report' },
  { key: 'audit:read',          description: 'مشاهده لاگ‌های سیستم',            category: 'audit' },
  { key: 'exchange:manage',     description: 'مدیریت صرافی',                    category: 'exchange' },
  { key: 'exchange:rates',      description: 'تنظیم نرخ‌ها',                    category: 'exchange' },
  { key: 'fraud:read',          description: 'مشاهده گزارش‌های تقلب',           category: 'fraud' },
  { key: 'fraud:flag',          description: 'علامت‌گذاری تراکنش مشکوک',       category: 'fraud' },
  { key: 'admin:users',         description: 'مدیریت کاربران پلتفرم',           category: 'admin' },
  { key: 'admin:content',       description: 'مدیریت محتوا',                    category: 'admin' },
  { key: 'permissions:manage',  description: 'مدیریت مجوزها',                   category: 'permissions' },
];

// ─── Helpers ───────────────────────────────────────────────────────────────────

function getCatKey(key: string): string {
  return key.split(':')[0] ?? key;
}

// ─── SVG Progress Arc ─────────────────────────────────────────────────────────

function ProgressArc({
  pct,
  color,
  size = 56,
  label,
}: {
  pct: number;
  color: string;
  size?: number;
  label?: string;
}) {
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  const cx = size / 2;
  const cy = size / 2;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={label ? `${label}: ${pct} درصد` : `${pct} درصد`}
      className={s.progressArc}
      style={{ '--arc-color': color } as React.CSSProperties}
    >
      {/* Track */}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth={3}
        opacity={0.12}
      />
      {/* Progress */}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={3}
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeDashoffset={circ * 0.25} /* start at top */
        className={s.progressArcFill}
        style={{ filter: `drop-shadow(0 0 4px color-mix(in oklch, ${color} 40%, transparent))` }}
      />
    </svg>
  );
}

// ─── SVG Shield Brand Mark ────────────────────────────────────────────────────

function ShieldMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 200"
      className={className}
      aria-hidden
    >
      <defs>
        <radialGradient id="shield-grad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--at-accent)" stopOpacity="0.18" />
          <stop offset="60%" stopColor="var(--at-gold)" stopOpacity="0.08" />
          <stop offset="100%" stopColor="var(--at-gold)" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="100" cy="100" r="92" fill="url(#shield-grad)" />
      <g className={s.markSpin}>
        <circle cx="100" cy="100" r="86" fill="none" stroke="currentColor" strokeWidth="0.6" opacity="0.3" />
        <circle cx="100" cy="100" r="70" fill="none" stroke="currentColor" strokeWidth="0.6" opacity="0.2" />
        {/* Shield path */}
        <path
          d="M100 28 L152 52 L152 100 Q152 140 100 168 Q48 140 48 100 L48 52 Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.9"
          opacity="0.45"
        />
        {/* Inner detail */}
        <path
          d="M100 44 L140 64 L140 100 Q140 130 100 152 Q60 130 60 100 L60 64 Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.6"
          opacity="0.25"
        />
        {/* Lock icon inside shield */}
        <rect x="88" y="92" width="24" height="18" rx="3" fill="none" stroke="currentColor" strokeWidth="1.2" opacity="0.4" />
        <path d="M93 92 Q93 82 100 82 Q107 82 107 92" fill="none" stroke="currentColor" strokeWidth="1.2" opacity="0.4" />
        <circle cx="100" cy="101" r="2.5" fill="currentColor" opacity="0.35" />
      </g>
    </svg>
  );
}

// ─── Role Health Card ─────────────────────────────────────────────────────────

function RoleCard({
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
  const [menuOpen, setMenuOpen] = useState(false);
  const pct = total > 0 ? Math.round((granted / total) * 100) : 0;
  const isEmpty = granted === 0 && total > 0;
  const isFull = granted === total && total > 0;
  const color = ROLE_COLOR[role] ?? 'var(--at-fg-muted)';

  return (
    <div
      className={`${s.roleCard} ${isSelected ? s.roleCardActive : ''} ${isEmpty ? s.roleCardEmpty : ''}`}
      style={{ '--rc-color': color } as React.CSSProperties}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(); } }}
      aria-pressed={isSelected}
      aria-label={`نقش ${ROLE_FA[role]} — ${pct}٪`}
    >
      {/* Top bar indicator when selected */}
      {isSelected && <div className={s.roleCardBar} aria-hidden />}

      {/* Ambient glow circle — decorative */}
      <div className={s.roleCardGlow} aria-hidden />

      {/* Header */}
      <div className={s.roleCardTop}>
        <div className={s.roleCardDotWrap}>
          <span className={s.roleCardDot} aria-hidden />
        </div>
        <span className={s.roleCardName}>{ROLE_FA[role]}</span>
        {isEmpty && (
          <span className={s.roleCardWarning} title="هیچ مجوزی ندارد">
            <ShieldOff size={9} aria-hidden />
          </span>
        )}
        {isFull && (
          <span className={s.roleCardFull} title="دسترسی کامل">
            <ShieldCheck size={9} aria-hidden />
          </span>
        )}
      </div>

      {/* Arc + number */}
      <div className={s.roleCardMid}>
        <div className={s.roleCardArcWrap}>
          <ProgressArc pct={pct} color={color} size={52} label={ROLE_FA[role]} />
          <span className={s.roleCardPctOverlay}>{pct}</span>
        </div>
        <div className={s.roleCardNums}>
          <span className={s.roleCardGranted}>{granted}</span>
          <span className={s.roleCardSlash}>/</span>
          <span className={s.roleCardTotal}>{total}</span>
        </div>
      </div>

      {/* Role label + actions */}
      <div className={s.roleCardBottom}>
        <span className={s.roleCardLabel}>مجوز فعال</span>
        {isSuperAdmin && (
          <div
            className={s.roleCardMenuWrap}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className={s.roleCardMenuTrigger}
              onClick={() => setMenuOpen((v) => !v)}
              aria-label={`گزینه‌های ${ROLE_FA[role]}`}
              aria-expanded={menuOpen}
            >
              <ChevronDown size={10} aria-hidden />
            </button>
            {menuOpen && (
              <div className={s.roleCardMenu} onMouseLeave={() => setMenuOpen(false)}>
                <div className={s.roleCardMenuDesc}>
                  <Info size={10} aria-hidden />
                  <span>{ROLE_DESC[role]}</span>
                </div>
                <div className={s.roleCardMenuDivider} />
                <button
                  type="button"
                  className={s.roleCardMenuItem}
                  onClick={() => { onSelectAll(); setMenuOpen(false); }}
                >
                  <CheckCircle2 size={11} aria-hidden />
                  فعال‌کردن همه
                </button>
                <button
                  type="button"
                  className={s.roleCardMenuItemDanger}
                  onClick={() => { onClearAll(); setMenuOpen(false); }}
                >
                  <X size={11} aria-hidden />
                  غیرفعال‌کردن همه
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── SuperAdmin Card ──────────────────────────────────────────────────────────

function SuperAdminRoleCard({ total }: { total: number }) {
  return (
    <div className={`${s.roleCard} ${s.roleCardSuperAdmin}`} style={{ '--rc-color': 'var(--nova-rose)' } as React.CSSProperties}>
      <div className={s.roleCardGlow} aria-hidden />
      <div className={s.roleCardTop}>
        <ShieldAlert size={12} className={s.roleCardSuperAdminIcon} aria-hidden />
        <span className={s.roleCardName}>{ROLE_FA.SUPERADMIN}</span>
      </div>
      <div className={s.roleCardMid}>
        <div className={s.roleCardArcWrap}>
          <ProgressArc pct={100} color="var(--nova-rose)" size={52} label="سوپرادمین" />
          <span className={s.roleCardPctOverlay}>100</span>
        </div>
        <div className={s.roleCardNums}>
          <span className={s.roleCardGranted}>{total}</span>
          <span className={s.roleCardSlash}>/</span>
          <span className={s.roleCardTotal}>{total}</span>
        </div>
      </div>
      <div className={s.roleCardBottom}>
        <span className={s.roleCardLabel}>دسترسی کامل</span>
        <span className={s.roleCardReadOnly}>read-only</span>
      </div>
    </div>
  );
}

// ─── Permission Tooltip ────────────────────────────────────────────────────────

function PermTooltip({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  return (
    <span className={s.tooltipWrap}>
      <button
        type="button"
        className={s.tooltipTrigger}
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onFocus={() => setShow(true)}
        onBlur={() => setShow(false)}
        aria-label={`توضیح کامل: ${text}`}
      >
        <Info size={10} aria-hidden />
      </button>
      {show && (
        <span className={s.tooltipContent} role="tooltip">{text}</span>
      )}
    </span>
  );
}

// آیکون info فقط وقتی نمایش داده می‌شود که keyDesc واقعا overflow داشته باشد
function PermRow({
  perm,
  searchQuery,
  isSelected,
}: {
  perm: PermissionRow;
  searchQuery: string;
  isSelected: boolean;
}) {
  const descRef = useRef<HTMLSpanElement>(null);
  const [overflows, setOverflows] = useState(false);

  useEffect(() => {
    const el = descRef.current;
    if (!el || !perm.description) { setOverflows(false); return; }
    const check = () => setOverflows(el.scrollWidth > el.clientWidth + 1);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    window.addEventListener('resize', check);
    return () => { ro.disconnect(); window.removeEventListener('resize', check); };
  }, [perm.description, perm.key]);

  return (
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
        {perm.description && overflows && <PermTooltip text={perm.description} />}
      </div>
      {perm.description && (
        <span ref={descRef} className={s.keyDesc}>{perm.description}</span>
      )}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function PermissionsClient({ permissions, matrix, currentUserRole }: Props) {
  const { toast } = useToast();
  const heroGradId = useId();
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

  // ── Batch ────────────────────────────────────────────────────────────────
  const [batchSelected, setBatchSelected] = useState<Set<string>>(new Set());

  // ── Dialogs ───────────────────────────────────────────────────────────────
  const [showAdd, setShowAdd] = useState(false);
  const [addTab, setAddTab] = useState<'pick' | 'manual'>('pick');
  const [pickSearch, setPickSearch] = useState('');
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [newKey, setNewKey] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [addPending, startAddTransition] = useTransition();
  const [deletePending, startDeleteTransition] = useTransition();
  const [deleteTarget, setDeleteTarget] = useState<PermissionRow | null>(null);

  // ── Keyboard ⌘K ──────────────────────────────────────────────────────────
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === 'Escape' && batchSelected.size > 0) setBatchSelected(new Set());
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [batchSelected]);

  // ── Auto-select first role when entering role-focus with no selection ─────
  useEffect(() => {
    if (viewMode === 'role-focus' && !focusedRole && EDITABLE_ROLES.length > 0) {
      setFocusedRole(EDITABLE_ROLES[0]);
    }
  }, [viewMode, focusedRole]);

  // ── Derived Data ──────────────────────────────────────────────────────────

  const visiblePerms = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return localPerms.filter((p) => {
      if (catFilter !== 'all' && getCatKey(p.key) !== catFilter) return false;
      if (!q) return true;
      return p.key.toLowerCase().includes(q) || (p.description ?? '').toLowerCase().includes(q);
    });
  }, [localPerms, searchQuery, catFilter]);

  const categories = useMemo(() =>
    Array.from(new Set(localPerms.map((p) => getCatKey(p.key)))).sort((a, b) => a.localeCompare(b, 'fa')),
    [localPerms]
  );

  const grouped = useMemo(() => {
    const g: Record<string, PermissionRow[]> = {};
    for (const p of visiblePerms) {
      const cat = getCatKey(p.key);
      if (!g[cat]) g[cat] = [];
      g[cat]!.push(p);
    }
    return Object.entries(g).sort(([a], [b]) => a.localeCompare(b, 'fa'));
  }, [visiblePerms]);

  const changeCount = useMemo(() =>
    Object.entries(localMatrix).filter(([k, v]) => originalRef.current[k] !== v).length,
    [localMatrix]
  );

  const totalGranted = useMemo(() =>
    EDITABLE_ROLES.reduce((acc, r) => acc + localPerms.filter((p) => localMatrix[`${p.id}:${r}`]).length, 0),
    [localMatrix, localPerms]
  );

  // درصد پوشش: نسبت تخصیص‌های فعال به حداکثر ممکن
  const pctCovered = useMemo(() => {
    const max = localPerms.length * EDITABLE_ROLES.length;
    return max > 0 ? Math.round((totalGranted / max) * 100) : 0;
  }, [localPerms.length, totalGranted]);

  const focusedRolePerms = useMemo(() => {
    if (!focusedRole) return { granted: [] as PermissionRow[], denied: [] as PermissionRow[] };
    const granted: PermissionRow[] = [];
    const denied: PermissionRow[] = [];
    for (const p of visiblePerms) {
      (localMatrix[`${p.id}:${focusedRole}`] ? granted : denied).push(p);
    }
    return { granted, denied };
  }, [focusedRole, visiblePerms, localMatrix]);

  const availableTemplates = useMemo(() => {
    const keys = new Set(localPerms.map((p) => p.key));
    return PERMISSION_TEMPLATES.filter((t) => !keys.has(t.key));
  }, [localPerms]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleCheck = useCallback((permId: string, role: EditableRole, val: boolean) => {
    setLocalMatrix((prev) => {
      const next = { ...prev, [`${permId}:${role}`]: val };
      setDirty(Object.entries(next).some(([k, v]) => originalRef.current[k] !== v));
      return next;
    });
  }, []);

  const handleColumnAll = useCallback((role: EditableRole, val: boolean) => {
    setLocalMatrix((prev) => {
      const next = { ...prev };
      for (const p of localPerms) next[`${p.id}:${role}`] = val;
      setDirty(Object.entries(next).some(([k, v]) => originalRef.current[k] !== v));
      return next;
    });
  }, [localPerms]);

  const handleBatchToggle = useCallback((id: string) => {
    setBatchSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const handleBatchAssign = useCallback((role: EditableRole, val: boolean) => {
    setLocalMatrix((prev) => {
      const next = { ...prev };
      for (const id of batchSelected) next[`${id}:${role}`] = val;
      setDirty(Object.entries(next).some(([k, v]) => originalRef.current[k] !== v));
      return next;
    });
  }, [batchSelected]);

  const handleSave = useCallback(() => {
    const rows = localPerms.map((p) => ({
      permissionId: p.id,
      roles: Object.fromEntries(EDITABLE_ROLES.map((r) => [r, localMatrix[`${p.id}:${r}`] ?? false])),
    }));
    startTransition(async () => {
      const res = await saveRoleMatrix(rows);
      if (res.success) {
        originalRef.current = { ...localMatrix };
        setDirty(false);
        toast({ title: 'تغییرات ذخیره شد', description: `${res.data?.updated ?? 0} مجوز به‌روزرسانی شد` });
      } else {
        toast({ title: 'خطا در ذخیره', description: res.error.message, variant: 'destructive' });
      }
    });
  }, [localMatrix, localPerms, toast]);

  const handleDiscard = useCallback(() => {
    setLocalMatrix({ ...originalRef.current });
    setDirty(false);
  }, []);

  // ── bulk pick handler ─────────────────────────────────────────────────────
  const handleBulkAdd = useCallback(() => {
    if (picked.size === 0) return;
    const items = PERMISSION_TEMPLATES.filter((t) => picked.has(t.key));
    startAddTransition(async () => {
      const res = await createPermissions(items.map((t) => ({ key: t.key, description: t.description })));
      if (res.success && res.data) {
        const newPerms = res.data.created;
        setLocalPerms((prev) => [...prev, ...newPerms]);
        setLocalMatrix((prev) => {
          const next = { ...prev };
          for (const p of newPerms) {
            for (const r of EDITABLE_ROLES) next[`${p.id}:${r}`] = false;
          }
          originalRef.current = { ...next };
          return next;
        });
        setPicked(new Set());
        setPickSearch('');
        setShowAdd(false);
        const skipped = res.data.skipped.length;
        toast({
          title: `${newPerms.length} مجوز ثبت شد`,
          description: skipped > 0 ? `${skipped} مورد قبلاً وجود داشت` : undefined,
        });
      } else if (!res.success) {
        toast({ title: 'خطا', description: res.error.message, variant: 'destructive' });
      }
    });
  }, [picked, toast]);

  // ── single manual handler ────────────────────────────────────────────────
  const handleAdd = useCallback(() => {
    startAddTransition(async () => {
      const res = await createPermission({ key: newKey.trim(), description: newDesc.trim() || null });
      if (res.success && res.data) {
        const p = res.data;
        setLocalPerms((prev) => [...prev, p]);
        setLocalMatrix((prev) => {
          const next = { ...prev };
          for (const r of EDITABLE_ROLES) next[`${p.id}:${r}`] = false;
          originalRef.current = { ...next };
          return next;
        });
        setNewKey(''); setNewDesc(''); setShowAdd(false);
        toast({ title: 'مجوز ثبت شد', description: p.key });
      } else if (!res.success) {
        toast({ title: 'خطا', description: res.error.message, variant: 'destructive' });
      }
    });
  }, [newKey, newDesc, toast]);

  const handleDelete = useCallback(() => {
    if (!deleteTarget) return;
    startDeleteTransition(async () => {
      const res = await deletePermission(deleteTarget.id);
      if (res.success) {
        setLocalPerms((prev) => prev.filter((p) => p.id !== deleteTarget.id));
        setLocalMatrix((prev) => {
          const next = { ...prev };
          for (const r of EDITABLE_ROLES) delete next[`${deleteTarget.id}:${r}`];
          return next;
        });
        setBatchSelected((prev) => { const n = new Set(prev); n.delete(deleteTarget.id); return n; });
        setDeleteTarget(null);
        toast({ title: 'مجوز حذف شد' });
      } else {
        toast({ title: 'خطا', description: res.error.message, variant: 'destructive' });
        setDeleteTarget(null);
      }
    });
  }, [deleteTarget, toast]);

  const isSuperAdmin = currentUserRole === 'OWNER' || currentUserRole === 'SUPERADMIN';
  const canManage = isSuperAdmin || currentUserRole === 'ADMIN';

  const handleRoleCardClick = useCallback((role: string) => {
    if (viewMode === 'role-focus' && focusedRole === role) {
      setFocusedRole(null); setViewMode('matrix');
    } else {
      setViewMode('role-focus'); setFocusedRole(role);
    }
  }, [viewMode, focusedRole]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className={s.root} dir="rtl">

      {/* ── Hero Command Tile ──────────────────────────────────────────── */}
      <section className={`at-tile ${s.heroTile}`} aria-label="مدیریت مجوزها">
        {/* Brand mark — slow rotating shield */}
        <div className={s.heroMark} aria-hidden>
          <ShieldMark className={s.heroMarkSvg} />
        </div>

        {/* Eyebrow */}
        <header className={s.heroHead}>
          <span className={s.heroEyebrow}>
            <span className={s.heroLiveDot} aria-hidden />
            <Lock size={10} aria-hidden />
            <span>مدیریت دسترسی · RBAC</span>
          </span>
          <span className={s.heroPillar}>
            <ShieldCheck size={10} aria-hidden />
            <span>پوشش {pctCovered}٪</span>
          </span>
        </header>

        {/* Title */}
        <h1 className={s.heroTitle}>
          مجوزهای سیستم
          <em className={s.heroTitleAccent}> RBAC</em>
        </h1>
        <p className={s.heroSubtitle}>
          تعیین کنید هر نقش چه عملیاتی می‌تواند انجام دهد
        </p>

        {/* KPI row */}
        <div className={s.heroKpi}>
          <div className={s.heroKpiItem}>
            <span className={s.heroKpiValue}>{localPerms.length}</span>
            <span className={s.heroKpiLabel}>مجوز کل</span>
          </div>
          <div className={s.heroKpiItem}>
            <span className={s.heroKpiValue}>{EDITABLE_ROLES.length + 1}</span>
            <span className={s.heroKpiLabel}>نقش</span>
          </div>
          <div className={s.heroKpiItem}>
            <span className={s.heroKpiValue}>{totalGranted}</span>
            <span className={s.heroKpiLabel}>تخصیص فعال</span>
          </div>
          <div className={s.heroKpiItem}>
            <span className={`${s.heroKpiValue} ${dirty ? s.heroKpiValueDirty : ''}`}>
              {changeCount}
            </span>
            <span className={s.heroKpiLabel}>تغییر ذخیره‌نشده</span>
          </div>
        </div>

        {/* Actions row */}
        <div className={s.heroActions}>
          {isSuperAdmin && (
            <button type="button" className={`${s.heroCta} at-hero__cta`} onClick={() => setShowAdd(true)}>
              <Plus size={13} aria-hidden />
              مجوز جدید
            </button>
          )}

          {/* View toggle inside hero */}
          <div className={s.heroViewToggle} role="group" aria-label="نوع نمایش">
            <button
              type="button"
              className={`${s.heroViewBtn} ${viewMode === 'matrix' ? s.heroViewBtnActive : ''}`}
              onClick={() => { setViewMode('matrix'); setFocusedRole(null); }}
            >
              <LayoutGrid size={12} aria-hidden />
              ماتریس
            </button>
            <button
              type="button"
              className={`${s.heroViewBtn} ${viewMode === 'role-focus' ? s.heroViewBtnActive : ''}`}
              onClick={() => setViewMode('role-focus')}
            >
              <Eye size={12} aria-hidden />
              نقش‌محور
            </button>
          </div>
        </div>
      </section>

      {/* ── Role Cards Row ──────────────────────────────────────────────── */}
      <div className={s.rolesRow}>
        {EDITABLE_ROLES.map((role) => {
          const granted = localPerms.filter((p) => localMatrix[`${p.id}:${role}`]).length;
          return (
            <RoleCard
              key={role}
              role={role}
              total={localPerms.length}
              granted={granted}
              isSelected={viewMode === 'role-focus' && focusedRole === role}
              onSelect={() => handleRoleCardClick(role)}
              onSelectAll={() => handleColumnAll(role as EditableRole, true)}
              onClearAll={() => handleColumnAll(role as EditableRole, false)}
              isSuperAdmin={canManage}
            />
          );
        })}
        <SuperAdminRoleCard total={localPerms.length} />
      </div>

      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      {localPerms.length > 0 && (
        <div className={s.toolbar}>
          <div className={s.searchWrap}>
            <Search size={13} className={s.searchIcon} aria-hidden />
            <input
              ref={searchRef}
              className={s.searchInput}
              placeholder="جستجو... ⌘K"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="جستجو در مجوزها"
              dir="ltr"
            />
            {searchQuery && (
              <button type="button" className={s.searchClear} onClick={() => setSearchQuery('')} aria-label="پاک‌کردن">
                <X size={10} />
              </button>
            )}
          </div>

          <div className={s.catPills} role="group" aria-label="فیلتر دسته">
            <button
              type="button"
              className={`${s.catPill} ${catFilter === 'all' ? s.catPillActive : ''}`}
              onClick={() => setCatFilter('all')}
            >
              <Filter size={10} aria-hidden />
              همه
              <span className={s.catBadge}>{localPerms.length}</span>
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`${s.catPill} ${catFilter === cat ? s.catPillActive : ''}`}
                onClick={() => setCatFilter(cat)}
              >
                {CAT_FA[cat] ?? cat}
                <span className={s.catBadge}>{localPerms.filter((p) => getCatKey(p.key) === cat).length}</span>
              </button>
            ))}
          </div>

          {batchSelected.size > 0 && (
            <div className={s.batchPill}>
              <span>{batchSelected.size} انتخاب</span>
              <button type="button" className={s.batchPillX} onClick={() => setBatchSelected(new Set())} aria-label="لغو">
                <X size={9} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Main View ───────────────────────────────────────────────────── */}
      {localPerms.length === 0 ? (
        <div className={`at-tile ${s.emptyTile}`}>
          <EmptyState
            icon={Key}
            title="هنوز مجوزی تعریف نشده"
            description={`${PERMISSION_TEMPLATES.length} مجوز استاندارد آماده ثبت است — با یک کلیک همه را اضافه کنید.`}
            action={
              isSuperAdmin ? (
                <div className={s.emptyActions}>
                  <Button size="sm" onClick={() => { setShowAdd(true); setAddTab('pick'); }}>
                    <Plus size={13} /> ثبت مجوزها
                  </Button>
                </div>
              ) : null
            }
          />
        </div>
      ) : grouped.length === 0 ? (
        <div className={`at-tile ${s.emptyTile}`}>
          <EmptyState
            icon={Search}
            title="نتیجه‌ای یافت نشد"
            description={`«${searchQuery}» با هیچ مجوزی مطابقت ندارد.`}
            action={
              <Button size="sm" variant="outline" onClick={() => { setSearchQuery(''); setCatFilter('all'); }}>
                <RotateCcw size={12} /> پاک‌کردن فیلتر
              </Button>
            }
          />
        </div>
      ) : viewMode === 'role-focus' && focusedRole ? (
        /* Role-Focus View */
        <RoleFocusView
          role={focusedRole}
          granted={focusedRolePerms.granted}
          denied={focusedRolePerms.denied}
          isSuperAdmin={isSuperAdmin}
          onCheck={handleCheck}
          onDelete={isSuperAdmin ? setDeleteTarget : undefined}
          batchSelected={batchSelected}
          onBatchToggle={handleBatchToggle}
        />
      ) : viewMode === 'role-focus' && !focusedRole ? (
        <div className={`at-tile ${s.roleFocusHint}`}>
          <Layers size={36} className={s.roleFocusHintIcon} aria-hidden />
          <p className={s.roleFocusHintText}>یک نقش از بالا انتخاب کنید</p>
        </div>
      ) : (
        /* Matrix View */
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

      {/* ── Batch Panel ─────────────────────────────────────────────────── */}
      {batchSelected.size > 0 && isSuperAdmin && (
        <BatchPanel
          count={batchSelected.size}
          onAssign={handleBatchAssign}
          onClose={() => setBatchSelected(new Set())}
        />
      )}

      {/* ── Unsaved Bar ──────────────────────────────────────────────────── */}
      {dirty && (
        <div
          className={`${s.unsavedBar} ${batchSelected.size > 0 ? s.unsavedBarStacked : ''}`}
          role="alert"
          aria-live="polite"
        >
          <AlertTriangle size={14} className={s.unsavedIcon} aria-hidden />
          <div className={s.unsavedText}>
            <span className={s.unsavedTitle}>تغییرات ذخیره نشده</span>
            <span className={s.unsavedSub}>{changeCount} تغییر</span>
          </div>
          <div className={s.unsavedBtns}>
            <button type="button" className={s.discardBtn} onClick={handleDiscard} disabled={isPending}>
              <X size={12} /> لغو
            </button>
            <button type="button" className={s.saveBtn} onClick={handleSave} disabled={isPending}>
              {isPending ? <span className={s.spinner} /> : <Save size={12} />}
              ذخیره
            </button>
          </div>
        </div>
      )}

      {/* ── Add Dialog ─── command-palette multi-select ──────────────────── */}
      <Dialog open={showAdd} onOpenChange={(o) => {
        setShowAdd(o);
        if (!o) { setNewKey(''); setNewDesc(''); setPicked(new Set()); setPickSearch(''); }
      }}>
        <DialogContent dir="rtl" className={s.dialogWide}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key size={16} /> افزودن مجوز
            </DialogTitle>
          </DialogHeader>

          {/* تب‌ها */}
          <div className={s.addTabs}>
            <button
              type="button"
              className={`${s.addTab} ${addTab === 'pick' ? s.addTabActive : ''}`}
              onClick={() => setAddTab('pick')}
            >
              انتخاب از لیست
              {availableTemplates.length > 0 && (
                <span className={s.addTabBadge}>{availableTemplates.length}</span>
              )}
            </button>
            <button
              type="button"
              className={`${s.addTab} ${addTab === 'manual' ? s.addTabActive : ''}`}
              onClick={() => setAddTab('manual')}
            >
              دستی
            </button>
          </div>

          {addTab === 'pick' ? (
            /* ── تب انتخاب از لیست ── */
            <div className={s.pickPane}>
              {/* سرچ */}
              <div className={s.pickSearchWrap}>
                <Search size={13} className={s.pickSearchIcon} aria-hidden />
                <input
                  className={s.pickSearchInput}
                  placeholder="جستجو..."
                  value={pickSearch}
                  onChange={(e) => setPickSearch(e.target.value)}
                  dir="ltr"
                  autoFocus
                />
                {pickSearch && (
                  <button type="button" className={s.pickSearchClear} onClick={() => setPickSearch('')} aria-label="پاک کردن">
                    <X size={10} />
                  </button>
                )}
              </div>

              {/* هدر: select-all + count */}
              {availableTemplates.length > 0 && (
                <div className={s.pickHeader}>
                  <button
                    type="button"
                    className={s.pickSelectAll}
                    onClick={() => {
                      const filtered = availableTemplates.filter((t) =>
                        !pickSearch || t.key.includes(pickSearch.toLowerCase()) || t.description.includes(pickSearch)
                      );
                      const allPicked = filtered.every((t) => picked.has(t.key));
                      setPicked((prev) => {
                        const next = new Set(prev);
                        if (allPicked) filtered.forEach((t) => next.delete(t.key));
                        else filtered.forEach((t) => next.add(t.key));
                        return next;
                      });
                    }}
                  >
                    {picked.size > 0 ? `${picked.size} انتخاب‌شده` : 'انتخاب همه'}
                  </button>
                  <span className={s.pickAvailCount}>{availableTemplates.length} مجوز موجود</span>
                </div>
              )}

              {/* لیست */}
              <div className={s.pickList}>
                {availableTemplates.length === 0 ? (
                  <div className={s.pickEmpty}>
                    <ShieldCheck size={28} aria-hidden />
                    <p>همه مجوزهای استاندارد ثبت شده‌اند</p>
                  </div>
                ) : (() => {
                  const filtered = availableTemplates.filter((t) =>
                    !pickSearch || t.key.includes(pickSearch.toLowerCase()) || t.description.includes(pickSearch)
                  );
                  if (filtered.length === 0) return (
                    <div className={s.pickEmpty}><Search size={22} aria-hidden /><p>نتیجه‌ای یافت نشد</p></div>
                  );

                  // گروه‌بندی بر اساس category
                  const byCategory = filtered.reduce<Record<string, typeof filtered>>((acc, t) => {
                    if (!acc[t.category]) acc[t.category] = [];
                    acc[t.category]!.push(t);
                    return acc;
                  }, {});

                  return Object.entries(byCategory).map(([cat, items]) => (
                    <div key={cat} className={s.pickGroup}>
                      <div className={s.pickGroupLabel}>
                        <span className={s.pickGroupIcon} aria-hidden>{CAT_ICON[cat] ?? '·'}</span>
                        <span>{CAT_FA[cat] ?? cat}</span>
                        <span className={s.pickGroupCount}>{items.length}</span>
                      </div>
                      {items.map((t) => {
                        const on = picked.has(t.key);
                        return (
                          <button
                            key={t.key}
                            type="button"
                            className={`${s.pickRow} ${on ? s.pickRowOn : ''}`}
                            onClick={() => setPicked((prev) => {
                              const next = new Set(prev);
                              on ? next.delete(t.key) : next.add(t.key);
                              return next;
                            })}
                            aria-pressed={on}
                          >
                            <span className={`${s.pickCheck} ${on ? s.pickCheckOn : ''}`} aria-hidden>
                              {on && <CheckCircle2 size={11} />}
                            </span>
                            <code className={s.pickKey}>{t.key}</code>
                            <span className={s.pickDesc}>{t.description}</span>
                          </button>
                        );
                      })}
                    </div>
                  ));
                })()}
              </div>
            </div>
          ) : (
            /* ── تب دستی ── */
            <div className={s.addDialogForm}>
              <div className={s.fieldGroup}>
                <Label htmlFor="pkey">کلید مجوز <span className={s.req}>*</span></Label>
                <Input
                  id="pkey"
                  placeholder="wallet:read"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && newKey.trim()) handleAdd(); }}
                  dir="ltr"
                  className={s.codeInput}
                  autoFocus
                />
                <p className={s.fieldHint}>فرمت: <code>resource:action</code></p>
              </div>
              <div className={s.fieldGroup}>
                <Label htmlFor="pdesc">توضیح فارسی</Label>
                <Input
                  id="pdesc"
                  placeholder="توضیح ساده..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                />
              </div>
              {newKey && (
                <div className={s.permPreview}>
                  <span className={s.keyBadge}>{newKey}</span>
                  {newDesc && <span className={s.permPreviewDesc}>{newDesc}</span>}
                </div>
              )}
            </div>
          )}

          <DialogFooter className={s.dialogFooter}>
            <Button variant="outline" onClick={() => setShowAdd(false)} disabled={addPending}>انصراف</Button>
            {addTab === 'pick' ? (
              <Button onClick={handleBulkAdd} disabled={addPending || picked.size === 0}>
                {addPending ? <span className={s.spinner} /> : <CheckCircle2 size={13} />}
                {picked.size > 0 ? `ثبت ${picked.size} مجوز` : 'ثبت'}
              </Button>
            ) : (
              <Button onClick={handleAdd} disabled={addPending || !newKey.trim()}>
                {addPending ? <span className={s.spinner} /> : <CheckCircle2 size={13} />}
                ثبت
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Confirm Delete ────────────────────────────────────────────────── */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}
        title="حذف مجوز"
        description={deleteTarget ? `مجوز «${deleteTarget.key}» حذف می‌شود.` : ''}
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
  onCheck: (id: string, role: EditableRole, val: boolean) => void;
  onDelete: (p: PermissionRow) => void;
  onBatchToggle: (id: string) => void;
}) {
  return (
    <div className={`at-tile ${s.matrixTile}`}>
      <table className={s.matrixTable} aria-label="ماتریس مجوزها">
        <thead>
          <tr className={s.matrixHeader}>
            <th scope="col" className={s.thKey}>
              <span>مجوز</span>
              <span className={s.thKeyCount}>{grouped.reduce((a, [, p]) => a + p.length, 0)}</span>
            </th>
            {EDITABLE_ROLES.map((role) => (
              <th
                key={role}
                scope="col"
                className={s.thRole}
                style={{ '--rc': ROLE_COLOR[role] } as React.CSSProperties}
              >
                {ROLE_FA[role]}
              </th>
            ))}
            <th scope="col" className={s.thSuper} title="همیشه فعال برای سوپرادمین — قابل تغییر نیست">
              <span className={s.thSuperInner}>
                <Lock size={9} aria-hidden />
                سوپر
              </span>
            </th>
            <th scope="col" className={s.thAct} aria-label="عملیات" />
          </tr>
        </thead>

        {grouped.map(([cat, perms]) => (
          <tbody key={cat} className={s.tbody}>
            <tr className={s.groupRow}>
              <td colSpan={EDITABLE_ROLES.length + 3}>
                <span className={s.groupIcon} aria-hidden>{CAT_ICON[cat] ?? '·'}</span>
                <span className={s.groupLabel}>{CAT_FA[cat] ?? cat}</span>
                <span className={s.groupCount}>{perms.length}</span>
              </td>
            </tr>
            {perms.map((perm, i) => {
              const sel = batchSelected.has(perm.id);
              return (
                <tr
                  key={perm.id}
                  className={`${s.matrixRow} ${sel ? s.matrixRowSel : ''}`}
                  style={{ '--ri': i } as React.CSSProperties}
                >
                  <td className={s.tdKey}>
                    <div className={s.keyCell}>
                      <div
                        className={`${s.batchChk} ${sel ? s.batchChkOn : ''}`}
                        role="checkbox"
                        aria-checked={sel}
                        tabIndex={0}
                        onClick={() => onBatchToggle(perm.id)}
                        onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); onBatchToggle(perm.id); } }}
                        aria-label={`انتخاب ${perm.key}`}
                      >
                        {sel && <CheckCircle2 size={10} aria-hidden />}
                      </div>
                      <PermRow perm={perm} searchQuery={searchQuery} isSelected={sel} />
                    </div>
                  </td>

                  {EDITABLE_ROLES.map((role) => {
                    const on = localMatrix[`${perm.id}:${role}`] ?? false;
                    return (
                      <td key={role} className={s.tdRole}>
                        <button
                          type="button"
                          className={`${s.matrixToggle} ${on ? s.matrixToggleOn : ''}`}
                          style={{ '--cb': ROLE_COLOR[role] } as React.CSSProperties}
                          onClick={() => onCheck(perm.id, role as EditableRole, !on)}
                          aria-label={`${ROLE_FA[role]} — ${perm.key}: ${on ? 'فعال' : 'غیرفعال'}`}
                          aria-pressed={on}
                        >
                          {on ? <ShieldCheck size={13} aria-hidden /> : <ShieldOff size={13} aria-hidden />}
                        </button>
                      </td>
                    );
                  })}

                  <td className={s.tdSuper}>
                    <span className={s.superCheck} aria-label="دسترسی کامل">
                      <CheckCircle2 size={12} aria-hidden />
                    </span>
                  </td>

                  <td className={s.tdAct}>
                    {isSuperAdmin && (
                      <button
                        type="button"
                        className={s.deleteBtn}
                        onClick={() => onDelete(perm)}
                        aria-label={`حذف ${perm.key}`}
                      >
                        <Trash2 size={12} aria-hidden />
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
  granted,
  denied,
  isSuperAdmin,
  onCheck,
  onDelete,
  batchSelected,
  onBatchToggle,
}: {
  role: string;
  granted: PermissionRow[];
  denied: PermissionRow[];
  isSuperAdmin: boolean;
  onCheck: (id: string, role: EditableRole, val: boolean) => void;
  onDelete?: (p: PermissionRow) => void;
  batchSelected: Set<string>;
  onBatchToggle: (id: string) => void;
}) {
  const color = ROLE_COLOR[role] ?? 'var(--at-fg-muted)';
  return (
    <div className={s.rfView}>
      {/* Header tile */}
      <div className={`at-tile ${s.rfHeader}`} style={{ '--rc': color } as React.CSSProperties}>
        <div className={s.rfHeaderBar} aria-hidden />
        <div className={s.rfHeaderInner}>
          <span className={s.rfDot} aria-hidden />
          <h2 className={s.rfTitle}>{ROLE_FA[role]}</h2>
          <p className={s.rfDesc}>{ROLE_DESC[role]}</p>
        </div>
        <div className={s.rfStats}>
          <span className={s.rfStatGrant}>
            <ShieldCheck size={12} /> {granted.length} فعال
          </span>
          <span className={s.rfStatDeny}>
            <ShieldOff size={12} /> {denied.length} غیرفعال
          </span>
        </div>
      </div>

      {/* Two columns */}
      <div className={s.rfCols}>
        {/* Granted */}
        <div className={`at-tile ${s.rfSection} ${s.rfSectionGrant}`}>
          <div className={s.rfSectionHead}>
            <ShieldCheck size={12} />
            <span>فعال</span>
            <span className={s.rfSectionCount}>{granted.length}</span>
          </div>
          <div className={s.rfList}>
            {granted.length === 0 ? (
              <div className={s.rfEmpty}><ShieldOff size={20} /><p>هیچ مجوزی فعال نیست</p></div>
            ) : granted.map((p) => (
              <RFRow key={p.id} perm={p} role={role} checked isSuperAdmin={isSuperAdmin}
                onCheck={onCheck} onDelete={onDelete} sel={batchSelected.has(p.id)} onToggle={onBatchToggle} />
            ))}
          </div>
        </div>

        {/* Denied */}
        <div className={`at-tile ${s.rfSection}`}>
          <div className={s.rfSectionHead}>
            <ShieldOff size={12} />
            <span>غیرفعال</span>
            <span className={s.rfSectionCount}>{denied.length}</span>
          </div>
          <div className={s.rfList}>
            {denied.length === 0 ? (
              <div className={s.rfEmptySuccess}><ShieldCheck size={20} /><p>همه فعال هستند</p></div>
            ) : denied.map((p) => (
              <RFRow key={p.id} perm={p} role={role} checked={false} isSuperAdmin={isSuperAdmin}
                onCheck={onCheck} onDelete={onDelete} sel={batchSelected.has(p.id)} onToggle={onBatchToggle} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── RFRow ────────────────────────────────────────────────────────────────────

function RFRow({
  perm, role, checked, isSuperAdmin, onCheck, onDelete, sel, onToggle,
}: {
  perm: PermissionRow; role: string; checked: boolean; isSuperAdmin: boolean;
  onCheck: (id: string, role: EditableRole, val: boolean) => void;
  onDelete?: (p: PermissionRow) => void;
  sel: boolean; onToggle: (id: string) => void;
}) {
  return (
    <div
      className={`${s.rfRow} ${sel ? s.rfRowSel : ''}`}
      style={{ '--rc': ROLE_COLOR[role] } as React.CSSProperties}
    >
      <div
        className={`${s.batchChk} ${sel ? s.batchChkOn : ''}`}
        role="checkbox" aria-checked={sel} tabIndex={0}
        onClick={() => onToggle(perm.id)}
        onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); onToggle(perm.id); } }}
        aria-label={`انتخاب ${perm.key}`}
      >
        {sel && <CheckCircle2 size={10} />}
      </div>
      <div className={s.rfRowInfo}>
        <span className={s.keyBadge}>{perm.key}</span>
        {perm.description && <span className={s.keyDesc}>{perm.description}</span>}
      </div>
      <div className={s.rfRowActions}>
        <button
          type="button"
          className={`${s.toggleChip} ${checked ? s.toggleChipOn : ''}`}
          onClick={() => onCheck(perm.id, role as EditableRole, !checked)}
          aria-label={checked ? `غیرفعال کردن ${perm.key}` : `فعال کردن ${perm.key}`}
        >
          {checked ? <ShieldCheck size={11} /> : <ShieldOff size={11} />}
          {checked ? 'فعال' : 'غیرفعال'}
        </button>
        {isSuperAdmin && onDelete && (
          <button type="button" className={s.deleteBtn} onClick={() => onDelete(perm)} aria-label={`حذف ${perm.key}`}>
            <Trash2 size={11} />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── BatchPanel ───────────────────────────────────────────────────────────────

function BatchPanel({
  count, onAssign, onClose,
}: {
  count: number;
  onAssign: (role: EditableRole, val: boolean) => void;
  onClose: () => void;
}) {
  return (
    <div className={s.batchPanel} role="toolbar" aria-label="عملیات دسته‌جمعی">
      <div className={s.batchInfo}>
        <span className={s.batchInfoCount}>{count} مجوز انتخاب‌شده</span>
        <span className={s.batchInfoHint}>اعمال نقش:</span>
      </div>
      <div className={s.batchRoles}>
        {EDITABLE_ROLES.map((role) => (
          <div key={role} className={s.batchRoleChip} style={{ '--rc': ROLE_COLOR[role] } as React.CSSProperties}>
            <span className={s.batchRoleName}>{ROLE_FA[role]}</span>
            <button type="button" className={s.batchGrant} onClick={() => onAssign(role, true)} aria-label={`اعطای ${ROLE_FA[role]}`}>
              <ShieldCheck size={10} />
            </button>
            <button type="button" className={s.batchRevoke} onClick={() => onAssign(role, false)} aria-label={`لغو ${ROLE_FA[role]}`}>
              <ShieldOff size={10} />
            </button>
          </div>
        ))}
      </div>
      <button type="button" className={s.batchClose} onClick={onClose} aria-label="بستن">
        <X size={13} />
      </button>
    </div>
  );
}
