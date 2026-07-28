/**
 * staff-permissions.ts
 * --------------------------------------------------------------------------
 * ثابت‌های ماتریس دسترسی نقش‌ها — به‌صورت ایزوله از server actions.
 *
 * چرا این فایل؟ فایل actions/exchanges.ts با 'use server' شروع می‌شود
 * و Next.js فقط اجازهٔ export توابع async را می‌دهد. ماتریس ایستا
 * (Object.freeze) نمی‌تواند در آن فایل باقی بماند.
 *
 * این فایل توسط server actions و client components به‌طور مشترک
 * استفاده می‌شود؛ client فقط نوع/مقدار خواندنی دارد.
 * --------------------------------------------------------------------------
 */

export type StaffRoleCapability =
  | 'staff.manage'
  | 'exchange.settings'
  | 'transactions.read'
  | 'transactions.write'
  | 'customers.read'
  | 'customers.write'
  | 'rates.read'
  | 'rates.write'
  | 'reports.read'
  | 'audit.read'
  | 'wallets.read'
  | 'wallets.write';

export type StaffRole = 'OWNER' | 'MANAGER' | 'STAFF' | 'VIEWER';

export const STAFF_ROLE_FA: Readonly<Record<StaffRole, string>> = Object.freeze({
  OWNER: 'مالک',
  MANAGER: 'مدیر',
  STAFF: 'کارمند',
  VIEWER: 'مشاهده‌گر',
});

export const STAFF_ROLE_ORDER: Readonly<Record<StaffRole, number>> = Object.freeze({
  OWNER: 0,
  MANAGER: 1,
  STAFF: 2,
  VIEWER: 3,
});

export const STAFF_ROLE_MATRIX: Readonly<
  Record<'OWNER' | 'MANAGER' | 'STAFF' | 'VIEWER', ReadonlyArray<StaffRoleCapability>>
> = Object.freeze({
  OWNER: [
    'staff.manage',
    'exchange.settings',
    'transactions.read',
    'transactions.write',
    'customers.read',
    'customers.write',
    'rates.read',
    'rates.write',
    'reports.read',
    'audit.read',
    'wallets.read',
    'wallets.write',
  ],
  MANAGER: [
    'staff.manage',
    'transactions.read',
    'transactions.write',
    'customers.read',
    'customers.write',
    'rates.read',
    'rates.write',
    'reports.read',
    'wallets.read',
    'wallets.write',
  ],
  STAFF: [
    'transactions.read',
    'transactions.write',
    'customers.read',
    'customers.write',
    'rates.read',
    'wallets.read',
  ],
  VIEWER: [
    'transactions.read',
    'customers.read',
    'rates.read',
    'reports.read',
    'wallets.read',
  ],
});

export const STAFF_CAPABILITY_LABELS: Readonly<Record<StaffRoleCapability, string>> =
  Object.freeze({
    'staff.manage': 'مدیریت تیم',
    'exchange.settings': 'تنظیمات صرافی',
    'transactions.read': 'مشاهده تراکنش',
    'transactions.write': 'ثبت/ویرایش تراکنش',
    'customers.read': 'مشاهده مشتری',
    'customers.write': 'ویرایش مشتری',
    'rates.read': 'مشاهده نرخ',
    'rates.write': 'ثبت نرخ',
    'reports.read': 'گزارش‌ها',
    'audit.read': 'لاگ ممیزی',
    'wallets.read': 'مشاهده کیف پول',
    'wallets.write': 'شارژ/برداشت',
  });

export const STAFF_CAPABILITY_GROUPS: ReadonlyArray<{
  id: string;
  label: string;
  capabilities: ReadonlyArray<StaffRoleCapability>;
}> = Object.freeze([
  {
    id: 'team',
    label: 'تیم و ساختار',
    capabilities: ['staff.manage', 'exchange.settings'],
  },
  {
    id: 'transactions',
    label: 'تراکنش‌ها',
    capabilities: ['transactions.read', 'transactions.write'],
  },
  {
    id: 'customers',
    label: 'مشتریان',
    capabilities: ['customers.read', 'customers.write'],
  },
  {
    id: 'rates',
    label: 'نرخ‌ها و قیمت‌گذاری',
    capabilities: ['rates.read', 'rates.write'],
  },
  {
    id: 'finance',
    label: 'مالی و گزارش',
    capabilities: ['wallets.read', 'wallets.write', 'reports.read', 'audit.read'],
  },
]);
