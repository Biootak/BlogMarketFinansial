/**
 * dashboard-sections — بخش‌های داشبورد، اکشن‌های هر بخش، و دسترسی بخشی
 * (per-user overrides)
 *
 * مدل (Core RBAC + استثناهای کاربری، مطابق NIST و الگوهای Oso):
 *   - نقش کاربر = باندل مجوزها (مبنای دسترسی) — Permission/RolePermission
 *   - `User.permissions` (grants): خالی = پیش‌فرض نقش؛ غیرخالی = whitelist
 *   - `User.deniedPermissions` (denials): همیشه کم می‌شود؛ اولویت با deny است
 *
 * کلیدهای دسترسی دو سطح دارند:
 *   - بخش: `kyc`  (یعنی همهٔ اکشن‌های بخش)
 *   - اکشن: `kyc:approve`  (دقیقاً همان اکشن)
 *
 * قواعد مؤثر:
 *   - دسترسی به مسیرِ یک بخش ← هر اکشنِ grant شدهٔ همان بخش کافی است
 *     (مثلاً `kyc:approve` بدون `customers` یعنی فقط صفحهٔ تأیید KYC).
 *   - deny سطح بخش (`kyc`) ← کل بخش مسدود؛ deny سطح اکشن (`kyc:approve`) ←
 *     فقط همان اکشن مسدود (مسیر هنوز باز است).
 *   - در حالت whitelist، deny روی grant هم اولویت دارد.
 *
 * ⚠️ این ماژول باید edge-safe و بدون هیچ import باشد: هم middleware (edge) و هم
 * کلاینت (sidebar / ویرایشگر) از آن استفاده می‌کنند.
 */

export type DashboardSectionKey =
  | 'exchanges'
  | 'exchange-rates'
  | 'customers'
  | 'kyc'
  | 'fraud'
  | 'settlements'
  | 'audit'
  | 'content'
  | 'users'
  | 'roles'
  | 'reports'
  | 'settings'
  | 'support'
  | 'observability'
  | 'ads';

/** اکشن‌های استاندارد هر بخش — کلیدها به شکل `<بخش>:<اکشن>` ذخیره می‌شوند. */
export type SectionActionKey =
  | 'view'
  | 'manage'
  | 'edit'
  | 'publish'
  | 'review'
  | 'approve'
  | 'resolve'
  | 'create'
  | 'export'
  | 'block';

export const ACTION_LABELS: Record<SectionActionKey, string> = {
  view: 'مشاهده',
  manage: 'مدیریت',
  edit: 'ویرایش',
  publish: 'انتشار',
  review: 'بررسی',
  approve: 'تأیید',
  resolve: 'رسیدگی',
  create: 'ایجاد',
  export: 'خروجی',
  block: 'مسدودسازی',
};

export interface DashboardSection {
  key: DashboardSectionKey;
  label: string;
  /** اکشن‌های قابل اعطا/مسدود در این بخش */
  actions: readonly SectionActionKey[];
}

export const DASHBOARD_SECTIONS: readonly DashboardSection[] = [
  { key: 'exchanges', label: 'صرافی‌ها', actions: ['view', 'manage'] },
  { key: 'exchange-rates', label: 'نرخ‌ها و قیمت‌گذاری', actions: ['view', 'manage'] },
  { key: 'customers', label: 'مشتریان', actions: ['view', 'edit'] },
  { key: 'kyc', label: 'بررسی احراز هویت', actions: ['view', 'review', 'approve'] },
  { key: 'fraud', label: 'تقلب', actions: ['view', 'resolve'] },
  { key: 'settlements', label: 'تسویه', actions: ['view', 'create'] },
  { key: 'audit', label: 'ممیزی و لاگ', actions: ['view', 'export'] },
  { key: 'content', label: 'محتوا (پست‌ها)', actions: ['view', 'publish'] },
  { key: 'users', label: 'کاربران', actions: ['view', 'edit', 'block'] },
  { key: 'roles', label: 'نقش‌ها و مجوزها', actions: ['view', 'manage'] },
  { key: 'reports', label: 'گزارش‌ها', actions: ['view', 'export'] },
  { key: 'settings', label: 'تنظیمات سایت', actions: ['view', 'manage'] },
  { key: 'support', label: 'پشتیبانی و عملیات', actions: ['view', 'manage'] },
  { key: 'observability', label: 'مشاهده‌پذیری', actions: ['view', 'export'] },
  { key: 'ads', label: 'تبلیغات', actions: ['view', 'manage'] },
];

const SECTION_ROUTES: Record<DashboardSectionKey, string[]> = {
  exchanges: [
    '/dashboard/exchanges',
    '/dashboard/exchange-staff',
    '/dashboard/exchange-quotes',
    '/dashboard/transfer-providers',
  ],
  'exchange-rates': [
    '/dashboard/exchange-rates',
    '/dashboard/rate-lists',
    '/dashboard/credit-rates',
  ],
  customers: ['/dashboard/customers'],
  kyc: ['/dashboard/kyc-review'],
  fraud: ['/dashboard/fraud-review'],
  settlements: ['/dashboard/settlements'],
  audit: ['/dashboard/audit-log'],
  content: ['/dashboard/posts', '/dashboard/categories'],
  users: ['/dashboard/users'],
  roles: ['/dashboard/roles', '/dashboard/permissions'],
  reports: ['/dashboard/reports'],
  settings: ['/dashboard/settings', '/dashboard/billing-address', '/dashboard/subscription'],
  support: [
    '/dashboard/helpdesk',
    '/dashboard/communication',
    '/dashboard/jobs',
    '/dashboard/approvals',
    '/dashboard/service-requests',
  ],
  observability: ['/dashboard/observability'],
  ads: ['/dashboard/advertisements', '/dashboard/header-ad'],
};

/**
 * مسیرهای شخصی/حساب — برای هر کاربر داشبورد بدون توجه به بخش‌ها باز هستند
 * (کیف پول شخصی، KYC شخصی، انتقال، دستگاه‌ها، اعلان‌ها، …).
 */
const ALWAYS_ALLOWED_PREFIXES = [
  '/dashboard/edit-profile',
  '/dashboard/my-deals',
  '/dashboard/my-requests',
  '/dashboard/wallet',
  '/dashboard/kyc',
  '/dashboard/transfer',
  '/dashboard/virtual-cards',
  '/dashboard/devices',
  '/dashboard/notifications',
  '/dashboard/2fa',
  '/dashboard/site-guide',
];

/**
 * مسیرهای شخصی/حساب — برای هر کاربر داشبورد بدون توجه به بخش‌ها باز هستند
 * (کیف پول شخصی، KYC شخصی، انتقال، دستگاه‌ها، اعلان‌ها، …). اکسبورت شده تا
 * ویرایشگر دسترسی بتواند آن‌ها را جدا از بخش‌ها نمایش دهد.
 */
export const ALWAYS_ALLOWED_ROUTES: readonly string[] = ALWAYS_ALLOWED_PREFIXES;

/** مسیرِ یک پیشوند، دقیقاً خودش یا با ادامهٔ `/` — تطبیق امن (نه startswith ساده). */
function underPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/** آیا این مسیر جزء بخش‌های قابل‌محدودکردن است؟ */
export function sectionForRoute(pathname: string): DashboardSectionKey | null {
  for (const [key, routes] of Object.entries(SECTION_ROUTES)) {
    if (routes.some((r) => underPrefix(pathname, r))) return key as DashboardSectionKey;
  }
  return null;
}

/** مسیرهای شخصی که هرگز محدود نمی‌شوند (خود /dashboard هم همیشه باز است). */
export function isAlwaysAllowedRoute(pathname: string): boolean {
  if (pathname === '/dashboard') return true;
  return ALWAYS_ALLOWED_PREFIXES.some((p) => underPrefix(pathname, p));
}

// ─── کلیدها ──────────────────────────────────────────────────────────────────

export const actionKey = (section: DashboardSectionKey, action: SectionActionKey): string =>
  `${section}:${action}`;

/** بخشِ یک کلید (هم سطح بخش، هم سطح اکشن) */
export const sectionOfKey = (key: string): string => key.split(':')[0];

/** اکشن‌های تعریف‌شدهٔ یک بخش */
export function actionsOfSection(section: DashboardSectionKey): readonly SectionActionKey[] {
  return DASHBOARD_SECTIONS.find((s) => s.key === section)?.actions ?? [];
}

/** مسیرهای داشبوردِ یک بخش — برای نمایش تأثیر whitelist/deny در ویرایشگر دسترسی */
export function routesForSection(section: DashboardSectionKey): readonly string[] {
  return SECTION_ROUTES[section] ?? [];
}

/** آیا کلید یک بخش معتبر است؟ */
export function isKnownSectionKey(key: string): key is DashboardSectionKey {
  return DASHBOARD_SECTIONS.some((s) => s.key === key);
}

/** آیا کلید (بخش یا بخش:اکشن) معتبر است؟ */
export function isKnownPermissionKey(key: string): boolean {
  if (isKnownSectionKey(key)) return true;
  const [section, action] = key.split(':');
  if (!section || !action) return false;
  return isKnownSectionKey(section) && (actionsOfSection(section) as string[]).includes(action);
}

/**
 * آیا کلید ذخیره‌شده (grant/deny) روی یک کلید درخواستی اثر دارد؟
 * `kyc` روی `kyc:approve` اثر دارد؛ `kyc:approve` روی `kyc:review` ندارد.
 */
export function permissionMatches(requestedKey: string, storedKey: string): boolean {
  if (storedKey === requestedKey) return true;
  // سطح بخش → همهٔ اکشن‌های آن بخش
  return isKnownSectionKey(storedKey) && sectionOfKey(requestedKey) === storedKey;
}

// ─── محاسبهٔ دسترسی مؤثر ─────────────────────────────────────────────────────

/** آیا این بخش در حالت whitelist دست کم یک اکشن grant دارد؟ */
export function sectionHasAnyGrant(
  section: DashboardSectionKey,
  grants: string[] | undefined,
): boolean {
  if (!grants) return false;
  // هم کلید بخش (`kyc`) و هم کلید اکشن (`kyc:approve`) بخش را grant می‌کنند
  return grants.some((g) => sectionOfKey(g) === section);
}

/** آیا این بخش کاملاً deny شده است؟ (deny سطح بخش یا deny همهٔ اکشن‌ها) */
export function sectionFullyDenied(
  section: DashboardSectionKey,
  denies: string[] | undefined,
): boolean {
  if (!denies || denies.length === 0) return false;
  if (denies.includes(section)) return true;
  const actions = actionsOfSection(section);
  return actions.length > 0 && actions.every((a) => denies.includes(actionKey(section, a)));
}

/** آیا یک اکشن مشخص برای این کاربر باز است؟ (ترتیب deny → grants → پیش‌فرض نقش) */
export function isActionAllowed(
  section: DashboardSectionKey,
  action: SectionActionKey,
  grants: string[] | undefined,
  denies: string[] | undefined,
): boolean {
  const key = actionKey(section, action);
  if (denies?.some((d) => permissionMatches(key, d))) return false;
  if (grants && grants.length > 0) return grants.some((g) => permissionMatches(key, g));
  return true; // پیش‌فرض نقش
}

/** آیا این بخش برای این کاربر باز است؟ (دست کم یک اکشن) */
export function isSectionAllowed(
  section: DashboardSectionKey,
  grants: string[] | undefined,
  denies: string[] | undefined,
): boolean {
  if (sectionFullyDenied(section, denies)) return false;
  if (grants && grants.length > 0) return sectionHasAnyGrant(section, grants);
  return true;
}

/**
 * آیا این مسیر برای این کاربر باز است؟
 * - OWNER هرگز از اینجا محدود نمی‌شود (کنترل در middleware).
 * - مسیر شخصی → باز.
 * - deny کامل بخش → بسته.
 * - grants غیرخالی → فقط بخش‌هایی که دست کم یک اکشن grant دارند.
 * - در غیر این صورت → پیش‌فرض نقش (باز).
 */
export function canAccessRoute(
  pathname: string,
  grants: string[] | undefined,
  denies: string[] | undefined,
): boolean {
  if (isAlwaysAllowedRoute(pathname)) return true;
  const section = sectionForRoute(pathname);
  if (!section) {
    // مسیر اداری بدون بخش: در حالت whitelist deny-by-default
    return !grants?.length;
  }
  return isSectionAllowed(section, grants, denies);
}

/** بک‌کامپت برای تماس‌های قبلی (فقط grants) */
export function canAccessWithPermissions(
  pathname: string,
  permissions: string[] | undefined,
): boolean {
  return canAccessRoute(pathname, permissions, undefined);
}
