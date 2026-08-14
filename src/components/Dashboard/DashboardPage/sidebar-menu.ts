/**
 * sidebar-menu.ts — Menu definitions for the Dashboard Sidebar.
 *
 * Extracted from Sidebar.tsx to keep the main component under 400 lines.
 * Contains: UserRole type, MenuItem/NavSection interfaces, getMenu(), defaultExpanded().
 */

import {
  HiOutlineArrowsRightLeft,
  HiOutlineBanknotes,
  HiOutlineBell,
  HiOutlineBookOpen,
  HiOutlineBuildingStorefront,
  HiOutlineChartBarSquare,
  HiOutlineChatBubbleLeftRight,
  HiOutlineCircleStack,
  HiOutlineClipboardDocumentCheck,
  HiOutlineClipboardDocumentList,
  HiOutlineCog6Tooth,
  HiOutlineCommandLine,
  HiOutlineCreditCard,
  HiOutlineCurrencyDollar,
  HiOutlineDevicePhoneMobile,
  HiOutlineDocumentMagnifyingGlass,
  HiOutlineDocumentText,
  HiOutlineExclamationTriangle,
  HiOutlineFingerPrint,
  HiOutlineHome,
  HiOutlineInboxArrowDown,
  HiOutlineKey,
  HiOutlineLink,
  HiOutlineMap,
  HiOutlineMapPin,
  HiOutlineMegaphone,
  HiOutlineNewspaper,
  HiOutlineRadio,
  HiOutlineReceiptPercent,
  HiOutlineScale,
  HiOutlineShieldCheck,
  HiOutlineShieldExclamation,
  HiOutlineSparkles,
  HiOutlineSquares2X2,
  HiOutlineTag,
  HiOutlineUserCircle,
  HiOutlineUserGroup,
  HiOutlineUsers,
  HiOutlineWallet,
} from 'react-icons/hi2';

export const ICON_CLASS = 'w-[19px] h-[19px]';

export type UserRole =
  | 'USER'
  | 'AUTHOR'
  | 'SUPPORT'
  | 'ADMIN'
  | 'OWNER'
  | 'SUPERADMIN'
  | 'CUSTOMER'
  | 'TEST_CUSTOMER'
  | 'MERCHANT'
  | 'EXCHANGE';

export interface SubmenuItem {
  href: string;
  label: string;
}

export interface MenuItem {
  id: string;
  href: string;
  icon: React.ReactNode;
  label: string;
  title?: string;
  shortcut?: string;
  /** flat index injected by Sidebar at render time */
  _flatIndex?: number;
  /** Exchange-only: roles allowed to see this item (staffRole) */
  roles?: readonly string[];
  submenu?: SubmenuItem[];
}

export interface NavSection {
  id: string;
  index: string;
  label?: string;
  items: MenuItem[];
}

export const ROLE_LABEL: Record<UserRole, string> = {
  OWNER: 'مالک',
  SUPERADMIN: 'سوپرادمین',
  ADMIN: 'مدیر',
  SUPPORT: 'پشتیبانی',
  AUTHOR: 'نویسنده',
  USER: 'کاربر',
  CUSTOMER: 'مشتری',
  TEST_CUSTOMER: 'مشتری آزمایشی',
  MERCHANT: 'پذیرنده',
  EXCHANGE: 'صرافی',
};

export const ROLE_GLYPH: Record<UserRole, string> = {
  OWNER: '◆',
  SUPERADMIN: '◆',
  ADMIN: '◇',
  SUPPORT: '△',
  AUTHOR: '○',
  USER: '·',
  CUSTOMER: '○',
  TEST_CUSTOMER: '·',
  MERCHANT: '◈',
  EXCHANGE: '□',
};

/* Keyboard shortcuts — visible badge; handler binds to actual navigation. */
const SHORTCUT_KEYS: Record<string, string> = {
  dashboard: '1',
  posts: '2',
  users: '3',
  categories: '4',
  advertisements: '5',
  serviceRequests: '6',
  exchangeRates: '7',
  settings: 'S',
  reports: 'R',
  profile: 'P',
};

export function getMenu(role: UserRole): NavSection[] {
  const dashboard: MenuItem = {
    id: 'dashboard',
    href: '/dashboard',
    icon: HiOutlineHome({ className: ICON_CLASS }),
    label: 'داشبورد',
    title: 'داشبورد',
    shortcut: SHORTCUT_KEYS.dashboard,
  };

  const posts: MenuItem = {
    id: 'posts',
    href: '/dashboard/posts',
    icon: HiOutlineDocumentText({ className: ICON_CLASS }),
    label: 'پست‌ها',
    title: 'پست‌ها',
    shortcut: SHORTCUT_KEYS.posts,
  };

  const categories: MenuItem = {
    id: 'categories',
    href: '/dashboard/categories',
    icon: HiOutlineSquares2X2({ className: ICON_CLASS }),
    label: 'دسته‌بندی',
    title: 'دسته‌بندی',
    shortcut: SHORTCUT_KEYS.categories,
  };

  // 2026-08-11: صفحاتی که در تحلیل شکاف وجود نداشتند — نظرات، برچسب‌ها،
  // خبرنامه، بازخوردها، دفتر کل و هدر آد (صفحهٔ هدر آد بود ولی در منو نبود).
  const comments: MenuItem = {
    id: 'comments',
    href: '/dashboard/comments',
    icon: HiOutlineChatBubbleLeftRight({ className: ICON_CLASS }),
    label: 'نظرات',
    title: 'مدیریت و تأیید نظرات مقالات',
  };

  const tags: MenuItem = {
    id: 'tags',
    href: '/dashboard/tags',
    icon: HiOutlineTag({ className: ICON_CLASS }),
    label: 'برچسب‌ها',
    title: 'مدیریت برچسب‌های مقالات',
  };

  const newsletter: MenuItem = {
    id: 'newsletter',
    href: '/dashboard/newsletter',
    icon: HiOutlineNewspaper({ className: ICON_CLASS }),
    label: 'خبرنامه',
    title: 'مشترکین خبرنامه و ارسال خبرنامه',
  };

  const feedback: MenuItem = {
    id: 'feedback',
    href: '/dashboard/feedback',
    icon: HiOutlineInboxArrowDown({ className: ICON_CLASS }),
    label: 'بازخوردها',
    title: 'پیام‌های بازخورد و تماس کاربران',
  };

  const ledger: MenuItem = {
    id: 'ledger',
    href: '/dashboard/ledger',
    icon: HiOutlineBanknotes({ className: ICON_CLASS }),
    label: 'دفتر کل',
    title: 'کاوشگر دفتر کل پلتفرم',
  };

  const users: MenuItem = {
    id: 'users',
    href: '/dashboard/users',
    icon: HiOutlineUsers({ className: ICON_CLASS }),
    label: 'کاربران',
    title: 'کاربران',
    shortcut: SHORTCUT_KEYS.users,
  };

  const advertisements: MenuItem = {
    id: 'advertisements',
    href: '/dashboard/advertisements',
    icon: HiOutlineMegaphone({ className: ICON_CLASS }),
    label: 'تبلیغات',
    title: 'تبلیغات',
    shortcut: SHORTCUT_KEYS.advertisements,
  };

  const serviceRequests: MenuItem = {
    id: 'serviceRequests',
    href: '/dashboard/service-requests',
    icon: HiOutlineClipboardDocumentList({ className: ICON_CLASS }),
    label: 'درخواست‌ها',
    title: 'درخواست‌های خدمات',
    shortcut: SHORTCUT_KEYS.serviceRequests,
  };

  const exchangeRates: MenuItem = {
    id: 'exchangeRates',
    href: '/dashboard/exchange-rates',
    icon: HiOutlineCurrencyDollar({ className: ICON_CLASS }),
    label: 'نرخ ارز',
    title: 'نرخ ارز',
    shortcut: SHORTCUT_KEYS.exchangeRates,
  };

  const exchanges: MenuItem = {
    id: 'exchanges',
    href: '/dashboard/exchanges',
    icon: HiOutlineBuildingStorefront({ className: ICON_CLASS }),
    label: 'صرافی‌ها',
    title: 'مدیریت صرافی‌ها',
  };

  const exchangeStaff: MenuItem = {
    id: 'exchangeStaff',
    href: '/dashboard/exchange-staff',
    icon: HiOutlineUserGroup({ className: ICON_CLASS }),
    label: 'کارکنان صرافی‌ها',
    title: 'مدیریت کارکنان صرافی‌ها',
  };

  const exchangeQuotes: MenuItem = {
    id: 'exchangeQuotes',
    href: '/dashboard/exchange-quotes',
    icon: HiOutlineTag({ className: ICON_CLASS }),
    label: 'تأیید قیمت‌ها',
    title: 'تأیید قیمت‌گذاری صرافی‌ها',
  };

  const transferProviders: MenuItem = {
    id: 'transferProviders',
    href: '/dashboard/transfer-providers',
    icon: HiOutlineArrowsRightLeft({ className: ICON_CLASS }),
    label: 'جدول مقایسه',
    title: 'صرافی‌های جدول مقایسه نرخ',
  };

  const siteGuide: MenuItem = {
    id: 'siteGuide',
    href: '/dashboard/site-guide',
    icon: HiOutlineMap({ className: ICON_CLASS }),
    label: 'راهنمای سایت',
    title: 'نقشه و راهنمای کامل سایت',
  };

  const settings: MenuItem = {
    id: 'settings',
    href: '/dashboard/settings',
    icon: HiOutlineCog6Tooth({ className: ICON_CLASS }),
    label: 'تنظیمات',
    title: 'تنظیمات سیستم',
    shortcut: SHORTCUT_KEYS.settings,
  };

  const reports: MenuItem = {
    id: 'reports',
    href: '/dashboard/reports',
    icon: HiOutlineChartBarSquare({ className: ICON_CLASS }),
    label: 'گزارش‌ها',
    title: 'گزارش‌ها',
    shortcut: SHORTCUT_KEYS.reports,
  };

  const profile: MenuItem = {
    id: 'profile',
    href: '/dashboard/edit-profile',
    icon: HiOutlineUserCircle({ className: ICON_CLASS }),
    label: 'پروفایل',
    title: 'پروفایل من',
    shortcut: SHORTCUT_KEYS.profile,
  };

  const myRequests: MenuItem = {
    id: 'myRequests',
    href: '/dashboard/my-requests',
    icon: HiOutlineInboxArrowDown({ className: ICON_CLASS }),
    label: 'درخواست‌های من',
    title: 'درخواست‌های من',
  };

  // ─── Fintech menu items ───────────────────────────────────────────────────
  const wallet: MenuItem = {
    id: 'wallet',
    href: '/dashboard/wallet',
    icon: HiOutlineWallet({ className: ICON_CLASS }),
    label: 'کیف پول',
    title: 'کیف پول',
  };

  const kyc: MenuItem = {
    id: 'kyc',
    href: '/customer/kyc',
    icon: HiOutlineShieldCheck({ className: ICON_CLASS }),
    label: 'احراز هویت',
    title: 'احراز هویت (KYC)',
  };

  const myDeals: MenuItem = {
    id: 'myDeals',
    href: '/dashboard/my-deals',
    icon: HiOutlineArrowsRightLeft({ className: ICON_CLASS }),
    label: 'معاملات من',
    title: 'معاملات ارزی من',
  };

  const transfer: MenuItem = {
    id: 'transfer',
    href: '/dashboard/transfer',
    icon: HiOutlineBanknotes({ className: ICON_CLASS }),
    label: 'انتقال P2P',
    title: 'انتقال وجه بین کاربران (P2P)',
  };

  const virtualCards: MenuItem = {
    id: 'virtualCards',
    href: '/dashboard/virtual-cards',
    icon: HiOutlineCreditCard({ className: ICON_CLASS }),
    label: 'کارت مجازی',
    title: 'کارت‌های مجازی پیش‌پرداخت',
  };

  const devices: MenuItem = {
    id: 'devices',
    href: '/dashboard/devices',
    icon: HiOutlineDevicePhoneMobile({ className: ICON_CLASS }),
    label: 'دستگاه‌های من',
    title: 'مدیریت دستگاه‌های متصل',
  };

  // 2026-08-14: اتصال حساب‌های OAuth (گوگل/گیت‌هاب) — پیوند و لغو پیوند امن
  const connectedAccounts: MenuItem = {
    id: 'connectedAccounts',
    href: '/dashboard/connected-accounts',
    icon: HiOutlineLink({ className: ICON_CLASS }),
    label: 'اتصال حساب‌ها',
    title: 'اتصال گوگل/گیت‌هاب به حساب',
  };

  // ── Admin: credit-rates, billing-address, subscription ────
  // Note: rate-lists (فهرست نرخ‌ها) merged into exchange-rates via tab=lists — duplicate sidebar entry removed.
  const creditRates: MenuItem = {
    id: 'creditRates',
    href: '/dashboard/credit-rates',
    icon: HiOutlineReceiptPercent({ className: ICON_CLASS }),
    label: 'نرخ‌های اعتباری',
    title: 'نرخ سود، تسهیلات و خطوط اعتباری',
  };

  const billingAddress: MenuItem = {
    id: 'billingAddress',
    href: '/dashboard/billing-address',
    icon: HiOutlineMapPin({ className: ICON_CLASS }),
    label: 'آدرس صورتحساب',
    title: 'آدرس صورتحساب و اطلاعات مالیاتی',
  };

  const subscriptionAdmin: MenuItem = {
    id: 'subscriptionAdmin',
    href: '/dashboard/subscription',
    icon: HiOutlineSparkles({ className: ICON_CLASS }),
    label: 'اشتراک من',
    title: 'اشتراک و پلن صورتحساب',
  };

  // ─── Admin fintech items ──────────────────────────────────────────────────
  const kycReview: MenuItem = {
    id: 'kycReview',
    href: '/dashboard/kyc-review',
    icon: HiOutlineClipboardDocumentCheck({ className: ICON_CLASS }),
    label: 'بررسی KYC',
    title: 'بررسی درخواست‌های احراز هویت',
  };

  const auditLog: MenuItem = {
    id: 'auditLog',
    href: '/dashboard/audit-log',
    icon: HiOutlineClipboardDocumentList({ className: ICON_CLASS }),
    label: 'گزارش ممیزی',
    title: 'گزارش ممیزی سیستم',
  };

  const observability: MenuItem = {
    id: 'observability',
    href: '/dashboard/observability',
    icon: HiOutlineRadio({ className: ICON_CLASS }),
    label: 'مرکز پایش',
    title: 'مرکز مشاهده‌پذیری — uptime، خطا، کارایی',
  };

  const communication: MenuItem = {
    id: 'communication',
    href: '/dashboard/communication',
    icon: HiOutlineMegaphone({ className: ICON_CLASS }),
    label: 'مرکز ارتباطات',
    title: 'مرکز ارتباطات — broadcast، کمپین، اعلان',
    submenu: [
      { href: '/dashboard/communication', label: 'نمای کلی' },
      { href: '/dashboard/communication/announcements', label: 'اعلان‌ها' },
      { href: '/dashboard/communication/campaigns', label: 'کمپین‌ها' },
      { href: '/dashboard/communication/audiences', label: 'مخاطبان هدف' },
    ],
  };

  const jobCenter: MenuItem = {
    id: 'jobCenter',
    href: '/dashboard/jobs',
    icon: HiOutlineCommandLine({ className: ICON_CLASS }),
    label: 'مرکز Job',
    title: 'صف job، cron، retry و DLQ',
    submenu: [
      { href: '/dashboard/jobs', label: 'نمای کلی' },
      { href: '/dashboard/jobs/queues', label: 'صف‌ها' },
      { href: '/dashboard/jobs/dlq', label: 'صف مرده' },
      { href: '/dashboard/jobs/new', label: 'ساخت job جدید' },
    ],
  };

  const helpdesk: MenuItem = {
    id: 'helpdesk',
    href: '/dashboard/helpdesk',
    icon: HiOutlineInboxArrowDown({ className: ICON_CLASS }),
    label: 'تیکت‌ها',
    title: 'سیستم تیکت داخلی — helpdesk',
  };

  const approvals: MenuItem = {
    id: 'approvals',
    href: '/dashboard/approvals',
    icon: HiOutlineClipboardDocumentCheck({ className: ICON_CLASS }),
    label: 'تأییدیه‌ها',
    title: 'جریان‌های تأیید چندمرحله‌ای',
  };

  const fraudReview: MenuItem = {
    id: 'fraudReview',
    href: '/dashboard/fraud-review',
    icon: HiOutlineExclamationTriangle({ className: ICON_CLASS }),
    label: 'بررسی تقلب',
    title: 'صف بررسی تقلب',
  };

  const settlements: MenuItem = {
    id: 'settlements',
    href: '/dashboard/settlements',
    icon: HiOutlineCreditCard({ className: ICON_CLASS }),
    label: 'تسویه‌حساب',
    title: 'تسویه‌حساب صرافی‌ها',
  };

  const permissions: MenuItem = {
    id: 'permissions',
    href: '/dashboard/permissions',
    icon: HiOutlineKey({ className: ICON_CLASS }),
    label: 'مجوزها',
    title: 'مدیریت مجوزهای سیستم',
  };

  const roles: MenuItem = {
    id: 'roles',
    href: '/dashboard/roles',
    icon: HiOutlineShieldCheck({ className: ICON_CLASS }),
    label: 'نقش‌ها',
    title: 'مدیریت نقش‌ها و سطوح دسترسی',
  };

  const customers: MenuItem = {
    id: 'customers',
    href: '/dashboard/customers',
    icon: HiOutlineUserGroup({ className: ICON_CLASS }),
    label: 'مشتریان',
    title: 'مدیریت مشتریان صرافی',
  };

  const notifications: MenuItem = {
    id: 'notifications',
    href: '/dashboard/notifications',
    icon: HiOutlineBell({ className: ICON_CLASS }),
    label: 'اعلان‌ها',
    title: 'مرکز اعلان‌ها',
  };

  // ─── Customer Portal menu items ──────────────────────────────────────────
  const customerDashboard: MenuItem = {
    id: 'customerDashboard',
    href: '/customer/dashboard',
    icon: HiOutlineHome({ className: ICON_CLASS }),
    label: 'داشبورد',
  };
  const customerAccounts: MenuItem = {
    id: 'customerAccounts',
    href: '/customer/accounts',
    icon: HiOutlineCreditCard({ className: ICON_CLASS }),
    label: 'حساب‌ها',
  };
  const customerCrypto: MenuItem = {
    id: 'customerCrypto',
    href: '/customer/crypto',
    icon: HiOutlineCircleStack({ className: ICON_CLASS }),
    label: 'ارزهای دیجیتال',
    title: 'کیف پول ارزهای دیجیتال و نرخ لحظه‌ای',
  };
  const customerRequests: MenuItem = {
    id: 'customerRequests',
    href: '/customer/requests',
    icon: HiOutlineInboxArrowDown({ className: ICON_CLASS }),
    label: 'درخواست‌های من',
    title: 'درخواست‌های ارسالی به صرافی',
  };
  const customerWallet: MenuItem = {
    id: 'customerWallet',
    href: '/customer/wallet',
    icon: HiOutlineWallet({ className: ICON_CLASS }),
    label: 'کیف پول',
    title: 'موجودی، حساب‌ها و تاریخچهٔ تراکنش‌ها',
  };
  const customerTransfer: MenuItem = {
    id: 'customerTransfer',
    href: '/customer/transfer',
    icon: HiOutlineBanknotes({ className: ICON_CLASS }),
    label: 'انتقال و عملیات',
    title: 'واریز، برداشت، انتقال داخلی و تبدیل ارز',
  };
  const customerTransactions: MenuItem = {
    id: 'customerTransactions',
    href: '/customer/transactions',
    icon: HiOutlineArrowsRightLeft({ className: ICON_CLASS }),
    label: 'تراکنش‌ها',
  };
  // 2026-08-12: معاملات ارزی من — همان MyDealsClient مشترک با داشبورد
  const customerDeals: MenuItem = {
    id: 'customerDeals',
    href: '/customer/deals',
    icon: HiOutlineScale({ className: ICON_CLASS }),
    label: 'معاملات ارزی',
    title: 'کد پیگیری و وضعیت معاملات ارزی شما',
  };
  const customerBeneficiaries: MenuItem = {
    id: 'customerBeneficiaries',
    href: '/customer/beneficiaries',
    icon: HiOutlineUserGroup({ className: ICON_CLASS }),
    label: 'مخاطبان',
  };
  const customerKyc: MenuItem = {
    id: 'customerKyc',
    href: '/customer/kyc',
    icon: HiOutlineShieldCheck({ className: ICON_CLASS }),
    label: 'احراز هویت',
  };
  const customerDocuments: MenuItem = {
    id: 'customerDocuments',
    href: '/customer/documents',
    icon: HiOutlineDocumentText({ className: ICON_CLASS }),
    label: 'مدارک',
  };
  const customerNotifications: MenuItem = {
    id: 'customerNotifications',
    href: '/customer/notifications',
    icon: HiOutlineBell({ className: ICON_CLASS }),
    label: 'اعلان‌ها',
  };
  const customerProfile: MenuItem = {
    id: 'customerProfile',
    href: '/customer/profile',
    icon: HiOutlineUserCircle({ className: ICON_CLASS }),
    label: 'پروفایل',
  };
  const customerSettings: MenuItem = {
    id: 'customerSettings',
    href: '/customer/settings',
    icon: HiOutlineCog6Tooth({ className: ICON_CLASS }),
    label: 'تنظیمات',
  };
  const customerDeveloper: MenuItem = {
    id: 'customerDeveloper',
    href: '/customer/developer',
    icon: HiOutlineKey({ className: ICON_CLASS }),
    label: 'توسعه‌دهندگان',
    title: 'پنل API و کلیدها',
  };
  const customer2FA: MenuItem = {
    id: 'customer2FA',
    href: '/customer/2fa',
    icon: HiOutlineFingerPrint({ className: ICON_CLASS }),
    label: 'احراز هویت دو مرحله‌ای',
    title: 'احراز هویت دو مرحله‌ای (TOTP)',
  };
  const customerSecurity: MenuItem = {
    id: 'customerSecurity',
    href: '/customer/security',
    icon: HiOutlineShieldCheck({ className: ICON_CLASS }),
    label: 'مرکز امنیت',
    title: 'تغییر رمز، 2FA و دستگاه‌ها',
  };
  const customerDevices: MenuItem = {
    id: 'customerDevices',
    href: '/customer/devices',
    icon: HiOutlineDevicePhoneMobile({ className: ICON_CLASS }),
    label: 'دستگاه‌ها',
    title: 'مدیریت دستگاه‌های متصل',
  };

  // ─── Exchange Panel menu items ───────────────────────────────────────────
  const exchangeDashboard: MenuItem = {
    id: 'exchangeDashboard',
    href: '/exchange/dashboard',
    icon: HiOutlineHome({ className: ICON_CLASS }),
    label: 'داشبورد',
  };
  // 2026-08-12: کارتابل معاملات ارزی — تأیید/تکمیل/رسید از CurrencyDeal
  const exchangeDeals: MenuItem = {
    id: 'exchangeDeals',
    href: '/exchange/deals',
    icon: HiOutlineScale({ className: ICON_CLASS }),
    label: 'معاملات ارزی',
    title: 'تأیید، تکمیل و پیگیری معاملات ارزی صرافی',
  };
  // 2026-08-12: دفتر کل صرافی — ماندهٔ حساب‌ها و گردش از LedgerEntry
  const exchangeLedger: MenuItem = {
    id: 'exchangeLedger',
    href: '/exchange/ledger',
    icon: HiOutlineBookOpen({ className: ICON_CLASS }),
    label: 'دفتر کل',
    title: 'موجودی صندوق و گردش حساب‌های صرافی',
    roles: ['OWNER', 'MANAGER'],
  };
  // 2026-08-12: درخواست‌های مشتری — رسیدگی از CustomerRequest
  const exchangeRequests: MenuItem = {
    id: 'exchangeRequests',
    href: '/exchange/requests',
    icon: HiOutlineDocumentMagnifyingGlass({ className: ICON_CLASS }),
    label: 'درخواست‌های مشتری',
    title: 'رسیدگی به درخواست‌های حساب، رفع مسدودی و سقف',
    roles: ['OWNER', 'MANAGER', 'STAFF'],
  };
  // 2026-08-12: بررسی تقلب — صف تراکنش‌های پرریسک از FraudReview
  const exchangeFraud: MenuItem = {
    id: 'exchangeFraud',
    href: '/exchange/fraud',
    icon: HiOutlineShieldExclamation({ className: ICON_CLASS }),
    label: 'بررسی تقلب',
    title: 'صف تراکنش‌های پرریسک این صرافی',
    roles: ['OWNER', 'MANAGER'],
  };
  // 2026-08-12: سوابق عملیات — لاگ ممیزی از AuditLog
  const exchangeAudit: MenuItem = {
    id: 'exchangeAudit',
    href: '/exchange/audit',
    icon: HiOutlineClipboardDocumentList({ className: ICON_CLASS }),
    label: 'سوابق عملیات',
    title: 'لاگ ممیزی اقدامات کارکنان صرافی',
    roles: ['OWNER', 'MANAGER'],
  };
  const exchangeQuotesPanel: MenuItem = {
    id: 'exchangeQuotesPanel',
    href: '/exchange/quotes',
    icon: HiOutlineTag({ className: ICON_CLASS }),
    label: 'قیمت‌گذاری',
  };
  const exchangeCustomers: MenuItem = {
    id: 'exchangeCustomers',
    href: '/exchange/customers',
    icon: HiOutlineUsers({ className: ICON_CLASS }),
    label: 'مشتریان',
  };
  const exchangeTransactions: MenuItem = {
    id: 'exchangeTransactions',
    href: '/exchange/transactions',
    icon: HiOutlineArrowsRightLeft({ className: ICON_CLASS }),
    label: 'تراکنش‌ها',
  };
  const exchangeRatesPanel: MenuItem = {
    id: 'exchangeRatesPanel',
    href: '/exchange/rates',
    icon: HiOutlineChartBarSquare({ className: ICON_CLASS }),
    label: 'نرخ‌ها',
  };
  const exchangeStaffPanel: MenuItem = {
    id: 'exchangeStaffPanel',
    href: '/exchange/staff',
    icon: HiOutlineUserGroup({ className: ICON_CLASS }),
    label: 'کارکنان',
    roles: ['OWNER', 'MANAGER'],
  };
  const exchangeReports: MenuItem = {
    id: 'exchangeReports',
    href: '/exchange/reports',
    icon: HiOutlineDocumentText({ className: ICON_CLASS }),
    label: 'گزارش‌ها',
  };
  const exchangeSettlement: MenuItem = {
    id: 'exchangeSettlement',
    href: '/exchange/settlement',
    icon: HiOutlineCreditCard({ className: ICON_CLASS }),
    label: 'تسویه‌حساب',
    roles: ['OWNER', 'MANAGER'],
  };
  // FIX (2026-08-01): بررسی KYC مشتریان صرافی — صراف قبلاً راهی نداشت
  // (فقط ادمین پلتفرم از /dashboard/kyc-review). حالا از پنل خودش.
  const exchangeKycReview: MenuItem = {
    id: 'exchangeKycReview',
    href: '/exchange/kyc-review',
    icon: HiOutlineShieldCheck({ className: ICON_CLASS }),
    label: 'بررسی KYC',
    title: 'تأیید احراز هویت مشتریان صرافی',
    roles: ['OWNER', 'MANAGER', 'STAFF'],
  };
  const exchangeProfilePanel: MenuItem = {
    id: 'exchangeProfilePanel',
    href: '/exchange/profile',
    icon: HiOutlineBuildingStorefront({ className: ICON_CLASS }),
    label: 'پروفایل صرافی',
    roles: ['OWNER', 'MANAGER'],
  };
  // 2026-07-28: مدیریت خدمات آنلاین — لایه ۲ از ۴ لایه
  const exchangeServicesPanel: MenuItem = {
    id: 'exchangeServicesPanel',
    href: '/exchange/services',
    icon: HiOutlineSparkles({ className: ICON_CLASS }),
    label: 'خدمات آنلاین',
    roles: ['OWNER', 'MANAGER'],
  };
  const exchangeSettingsPanel: MenuItem = {
    id: 'exchangeSettingsPanel',
    href: '/exchange/settings',
    icon: HiOutlineCog6Tooth({ className: ICON_CLASS }),
    label: 'تنظیمات',
    roles: ['OWNER', 'MANAGER'],
  };

  switch (role) {
    case 'CUSTOMER':
    case 'MERCHANT':
    case 'TEST_CUSTOMER':
      return [
        { id: 'main', index: '۰۱', label: 'مرکز', items: [customerDashboard] },
        {
          id: 'financial',
          index: '۰۲',
          label: 'مالی',
          items: [
            customerWallet,
            customerAccounts,
            customerCrypto,
            customerTransfer,
            customerBeneficiaries,
            customerTransactions,
            customerDeals,
            customerRequests,
          ],
        },
        { id: 'identity', index: '۰۳', label: 'هویت', items: [customerKyc, customerDocuments] },
        {
          id: 'account',
          index: '۰۴',
          label: 'حساب',
          items: [
            customerSecurity,
            customer2FA,
            customerDevices,
            customerNotifications,
            customerDeveloper,
            customerProfile,
            customerSettings,
          ],
        },
      ];
    case 'EXCHANGE':
      return [
        { id: 'main', index: '۰۱', label: 'مرکز', items: [exchangeDashboard] },
        {
          id: 'trading',
          index: '۰۲',
          label: 'معاملات',
          items: [
            exchangeDeals,
            exchangeQuotesPanel,
            exchangeCustomers,
            exchangeTransactions,
            exchangeRatesPanel,
          ],
        },
        {
          id: 'ops',
          index: '۰۳',
          label: 'عملیات',
          items: [
            exchangeStaffPanel,
            exchangeKycReview,
            exchangeRequests,
            exchangeFraud,
            exchangeAudit,
            exchangeReports,
            exchangeSettlement,
          ],
        },
        {
          id: 'finance',
          index: '۰۴',
          label: 'مالی',
          items: [exchangeLedger],
        },
        {
          id: 'account',
          index: '۰۵',
          label: 'تنظیمات',
          items: [exchangeProfilePanel, exchangeServicesPanel, exchangeSettingsPanel],
        },
      ];
    case 'OWNER':
      return [
        { id: 'main', index: '۰۱', label: 'مرکز', items: [dashboard] },
        {
          id: 'content',
          index: '۰۲',
          label: 'محتوا',
          items: [posts, categories, comments, tags, newsletter],
        },
        {
          id: 'operations',
          index: '۰۳',
          label: 'عملیات',
          items: [
            exchanges,
            exchangeStaff,
            transferProviders,
            exchangeRates,
            exchangeQuotes,
            creditRates,
            advertisements,
            serviceRequests,
            observability,
          ],
        },
        {
          id: 'fintech',
          index: '۰۴',
          label: 'فین‌تک',
          items: [customers, kycReview, fraudReview, settlements, ledger, auditLog],
        },
        {
          id: 'platform',
          index: '۰۵',
          label: 'پلتفرم',
          items: [communication, jobCenter, helpdesk, approvals, feedback],
        },
        {
          id: 'admin',
          index: '۰۶',
          label: 'مدیریت',
          items: [
            users,
            roles,
            permissions,
            reports,
            billingAddress,
            subscriptionAdmin,
            settings,
            siteGuide,
          ],
        },
        {
          id: 'account',
          index: '۰۷',
          label: 'حساب',
          items: [
            wallet,
            virtualCards,
            kyc,
            myDeals,
            transfer,
            devices,
            connectedAccounts,
            notifications,
            myRequests,
            profile,
          ],
        },
      ];
    case 'ADMIN':
    case 'SUPERADMIN':
      // SUPERADMIN sees the same menu as ADMIN (elevated admin) — owner-only
      // items (reports, settings) are excluded from this branch.
      return [
        { id: 'main', index: '۰۱', label: 'مرکز', items: [dashboard] },
        {
          id: 'content',
          index: '۰۲',
          label: 'محتوا',
          items: [posts, categories, comments, tags, newsletter],
        },
        {
          id: 'operations',
          index: '۰۳',
          label: 'عملیات',
          items: [
            exchanges,
            exchangeStaff,
            transferProviders,
            exchangeRates,
            exchangeQuotes,
            creditRates,
            advertisements,
            serviceRequests,
            observability,
          ],
        },
        {
          id: 'fintech',
          index: '۰۴',
          label: 'فین‌تک',
          items: [customers, kycReview, fraudReview, settlements, ledger, auditLog],
        },
        {
          id: 'platform',
          index: '۰۵',
          label: 'پلتفرم',
          items: [communication, jobCenter, helpdesk, approvals, feedback],
        },
        {
          id: 'admin',
          index: '۰۶',
          label: 'مدیریت',
          items: [users, roles, permissions, billingAddress, subscriptionAdmin, siteGuide],
        },
        {
          id: 'account',
          index: '۰۷',
          label: 'حساب',
          items: [
            wallet,
            virtualCards,
            kyc,
            myDeals,
            transfer,
            devices,
            connectedAccounts,
            notifications,
            myRequests,
            profile,
          ],
        },
      ];
    case 'SUPPORT':
      // SUPPORT can access: dashboard, helpdesk, approvals (view), service-requests,
      // feedback, notifications, my-deals, my-requests, devices, profile.
      // Admin-only items (kycReview, fraudReview, customers, settlements, audit-log,
      // settings, reports, roles, …) are deliberately excluded.
      return [
        { id: 'main', index: '۰۱', label: 'مرکز', items: [dashboard] },
        {
          id: 'support',
          index: '۰۲',
          label: 'پشتیبانی',
          items: [helpdesk, approvals, serviceRequests, feedback],
        },
        {
          id: 'account',
          index: '۰۳',
          label: 'حساب',
          items: [notifications, myDeals, myRequests, devices, connectedAccounts, profile],
        },
      ];
    case 'AUTHOR':
      return [
        { id: 'main', index: '۰۱', label: 'مرکز', items: [dashboard] },
        { id: 'content', index: '۰۲', label: 'محتوا', items: [posts, categories, comments, tags] },
        {
          id: 'account',
          index: '۰۵',
          label: 'حساب',
          items: [
            wallet,
            virtualCards,
            kyc,
            myDeals,
            transfer,
            devices,
            connectedAccounts,
            myRequests,
            profile,
          ],
        },
      ];
    default:
      // USER role — minimal panel. R13-fix (2026-07-29): اعلان‌ها اضافه شد
      // (در userFintechRoutes قرار گرفت) تا کاربر اعلان‌های خود را ببیند.
      return [
        { id: 'main', index: '۰۱', label: 'مرکز', items: [dashboard] },
        {
          id: 'fintech',
          index: '۰۲',
          label: 'مالی',
          items: [wallet, virtualCards, kyc, myDeals, transfer],
        },
        {
          id: 'account',
          index: '۰۳',
          label: 'حساب',
          items: [devices, connectedAccounts, notifications, myRequests, profile],
        },
      ];
  }
}

/* Persist the submenu initial state across mounts. */
export function defaultExpanded(role: UserRole): string[] {
  if (role === 'USER') return [];
  return ['exchangeRates'];
}
