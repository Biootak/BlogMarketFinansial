/**
 * Staff formatting & label helpers.
 *
 * Pure functions — no DOM, no React. Reused across
 * StaffCockpit, StaffCard, StaffRolePill, StaffActivityTimeline,
 * StaffRoleMatrix, and the permissions/activity sub-pages.
 */

import type { ExchangeStaffRow } from '@/actions/exchanges';

const FA = new Intl.DateTimeFormat('fa-IR', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});
const FA_RELATIVE = new Intl.RelativeTimeFormat('fa-IR', { numeric: 'auto' });

/** «۱۴۰۵/۰۵/۰۲» — تاریخ شمسی کوتاه */
export function formatFaDate(value: Date | string): string {
  return FA.format(new Date(value));
}

/** «۲ روز پیش» — زمان نسبی */
export function formatRelativeFa(value: Date | string): string {
  const then = new Date(value).getTime();
  const now = Date.now();
  const diffSec = Math.round((then - now) / 1000);
  const abs = Math.abs(diffSec);
  if (abs < 60) return FA_RELATIVE.format(diffSec, 'second');
  if (abs < 3600) return FA_RELATIVE.format(Math.round(diffSec / 60), 'minute');
  if (abs < 86400) return FA_RELATIVE.format(Math.round(diffSec / 3600), 'hour');
  if (abs < 86400 * 30) return FA_RELATIVE.format(Math.round(diffSec / 86400), 'day');
  if (abs < 86400 * 365) return FA_RELATIVE.format(Math.round(diffSec / (86400 * 30)), 'month');
  return FA_RELATIVE.format(Math.round(diffSec / (86400 * 365)), 'year');
}

/** تعداد روزهای گذشته از joinedAt. */
export function daysSince(value: Date | string): number {
  const then = new Date(value).getTime();
  const now = Date.now();
  return Math.max(0, Math.round((now - then) / 86400000));
}

/** دو حرف اول نام (fa fallback به حرف اول) */
export function getInitialsFa(name: string | null, email: string): string {
  const source = name?.trim() || email;
  if (!source) return '؟';
  const parts = source.trim().split(/\s+/);
  if (parts.length === 1) return parts[0]?.slice(0, 1).toUpperCase();
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase();
}

// ─── Role metadata ────────────────────────────────────────────────────────────

export type StaffRole = 'OWNER' | 'MANAGER' | 'STAFF' | 'VIEWER';

export const STAFF_ROLE_FA: Readonly<Record<StaffRole, string>> = Object.freeze({
  OWNER: 'مالک',
  MANAGER: 'مدیر',
  STAFF: 'کارمند',
  VIEWER: 'مشاهده‌گر',
});

/** اولویت نمایش (پایین = بالاتر) */
export const STAFF_ROLE_ORDER: Readonly<Record<StaffRole, number>> = Object.freeze({
  OWNER: 0,
  MANAGER: 1,
  STAFF: 2,
  VIEWER: 3,
});

// ─── Action label map (AuditLog.action) ───────────────────────────────────────

const ACTION_FA: Record<
  string,
  { label: string; tone: 'emerald' | 'gold' | 'rose' | 'info' | 'muted' }
> = {
  'staff.invited': { label: 'عضو جدید اضافه شد', tone: 'emerald' },
  'staff.revoked': { label: 'دسترسی عضو لغو شد', tone: 'rose' },
  'staff.role.updated': { label: 'نقش عضو تغییر کرد', tone: 'gold' },
  'customer.created': { label: 'مشتری جدید ثبت شد', tone: 'emerald' },
  'customer.updated': { label: 'اطلاعات مشتری ویرایش شد', tone: 'info' },
  'customer.deleted': { label: 'مشتری حذف شد', tone: 'rose' },
  'transaction.created': { label: 'تراکنش ثبت شد', tone: 'emerald' },
  'transaction.updated': { label: 'تراکنش ویرایش شد', tone: 'info' },
  'transaction.completed': { label: 'تراکنش تکمیل شد', tone: 'emerald' },
  'transaction.cancelled': { label: 'تراکنش لغو شد', tone: 'rose' },
  'rate.created': { label: 'نرخ جدید ثبت شد', tone: 'emerald' },
  'rate.updated': { label: 'نرخ ویرایش شد', tone: 'info' },
  'settings.updated': { label: 'تنظیمات صرافی تغییر کرد', tone: 'gold' },
  login: { label: 'ورود به سامانه', tone: 'muted' },
  logout: { label: 'خروج از سامانه', tone: 'muted' },
};

export function getActionLabel(action: string): string {
  return ACTION_FA[action]?.label ?? action;
}

export function getActionTone(action: string): 'emerald' | 'gold' | 'rose' | 'info' | 'muted' {
  return ACTION_FA[action]?.tone ?? 'muted';
}

// ─── Avatar color hash (OKLCH — low saturation, derived from role + id) ──────

/** یک رنگ پس‌زمینه پایدار برای هر کاربر — بر اساس نقش + id. */
export function avatarTone(seed: string, role: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  const hue = Math.abs(h) % 360;
  // برای OWNER همیشه emerald؛ برای MANAGER همیشه gold؛ بقیه بر اساس seed
  if (role === 'OWNER') return 'oklch(96% 0.04 162)';
  if (role === 'MANAGER') return 'oklch(96% 0.05 75)';
  if (role === 'VIEWER') return 'oklch(96% 0.005 245)';
  return `oklch(95% 0.03 ${hue})`;
}

// ─── Staff sorting & role rank helpers ───────────────────────────────────────

export function isSelf(member: ExchangeStaffRow, currentUserId: string): boolean {
  return member.userId === currentUserId;
}

export function rankRole(role: string): number {
  return STAFF_ROLE_ORDER[role as StaffRole] ?? 99;
}
