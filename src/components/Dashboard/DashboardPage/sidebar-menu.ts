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
  HiOutlineBuildingStorefront,
  HiOutlineChartBarSquare,
  HiOutlineClipboardDocumentCheck,
  HiOutlineClipboardDocumentList,
  HiOutlineCog6Tooth,
  HiOutlineCommandLine,
  HiOutlineCreditCard,
  HiOutlineCircleStack,
  HiOutlineCurrencyDollar,
  HiOutlineDevicePhoneMobile,
  HiOutlineDocumentText,
  HiOutlineExclamationTriangle,
  HiOutlineFingerPrint,
  HiOutlineHome,
  HiOutlineInboxArrowDown,
  HiOutlineKey,
  HiOutlineListBullet,
  HiOutlineMapPin,
  HiOutlineMegaphone,
  HiOutlineRadio,
  HiOutlineReceiptPercent,
  HiOutlineShieldCheck,
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
    href: '/dashboard/kyc',
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

  // ── Admin: rate-lists, credit-rates, billing-address, subscription ────
  const rateLists: MenuItem = {
    id: 'rateLists',
    href: '/dashboard/rate-lists',
    icon: HiOutlineListBullet({ className: ICON_CLASS }),
    label: 'فهرست نرخ‌ها',
    title: 'فهرست‌های نرخ سفارشی تیکر',
  };

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
  };

  const jobCenter: MenuItem = {
    id: 'jobCenter',
    href: '/dashboard/jobs',
    icon: HiOutlineCommandLine({ className: ICON_CLASS }),
    label: 'مرکز Job',
    title: 'صف job، cron، retry و DLQ',
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
  const customerTransactions: MenuItem = {
    id: 'customerTransactions',
    href: '/customer/transactions',
    icon: HiOutlineArrowsRightLeft({ className: ICON_CLASS }),
    label: 'تراکنش‌ها',
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
          items: [customerAccounts, customerCrypto, customerBeneficiaries, customerTransactions, customerRequests],
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
          items: [exchangeQuotesPanel, exchangeCustomers, exchangeTransactions, exchangeRatesPanel],
        },
        {
          id: 'ops',
          index: '۰۳',
          label: 'عملیات',
          items: [exchangeStaffPanel, exchangeReports, exchangeSettlement],
        },
        {
          id: 'account',
          index: '۰۴',
          label: 'تنظیمات',
          items: [exchangeProfilePanel, exchangeServicesPanel, exchangeSettingsPanel],
        },
      ];
    case 'OWNER':
    case 'SUPERADMIN':
      return [
        { id: 'main', index: '۰۱', label: 'مرکز', items: [dashboard] },
        { id: 'content', index: '۰۲', label: 'محتوا', items: [posts, categories] },
        {
          id: 'operations',
          index: '۰۳',
          label: 'عملیات',
          items: [
            exchanges,
            exchangeStaff,
            transferProviders,
            exchangeRates,
            rateLists,
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
          items: [customers, kycReview, fraudReview, settlements, auditLog],
        },
        {
          id: 'platform',
          index: '۰۵',
          label: 'پلتفرم',
          items: [communication, jobCenter, helpdesk, approvals],
        },
        {
          id: 'admin',
          index: '۰۶',
          label: 'مدیریت',
          items: [users, roles, permissions, reports, billingAddress, subscriptionAdmin, settings],
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
            notifications,
            myRequests,
            profile,
          ],
        },
      ];
    case 'ADMIN':
      return [
        { id: 'main', index: '۰۱', label: 'مرکز', items: [dashboard] },
        { id: 'content', index: '۰۲', label: 'محتوا', items: [posts, categories] },
        {
          id: 'operations',
          index: '۰۳',
          label: 'عملیات',
          items: [
            exchanges,
            exchangeStaff,
            transferProviders,
            exchangeRates,
            rateLists,
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
          items: [customers, kycReview, fraudReview, settlements, auditLog],
        },
        {
          id: 'platform',
          index: '۰۵',
          label: 'پلتفرم',
          items: [communication, jobCenter, helpdesk, approvals],
        },
        {
          id: 'admin',
          index: '۰۶',
          label: 'مدیریت',
          items: [users, roles, permissions, billingAddress, subscriptionAdmin],
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
            notifications,
            myRequests,
            profile,
          ],
        },
      ];
    case 'SUPPORT':
      // SUPPORT can only access baseDashboardRoutes (/dashboard, edit-profile,
      // my-deals, my-requests). Admin/owner-only items (kycReview, fraudReview,
      // customers, settlements, audit-log, settings, reports, …) are deliberately
      // excluded — middleware would redirect them, which manifests as "button
      // does nothing" from the user's perspective. The SUPPORT role is for
      // first-line operators who triage their own assigned work; deeper
      // verification tools require ADMIN+.
      return [
        { id: 'main', index: '۰۱', label: 'مرکز', items: [dashboard] },
        {
          id: 'account',
          index: '۰۲',
          label: 'حساب',
          items: [myDeals, myRequests, devices, profile],
        },
      ];
    case 'AUTHOR':
      return [
        { id: 'main', index: '۰۱', label: 'مرکز', items: [dashboard] },
        { id: 'content', index: '۰۲', label: 'محتوا', items: [posts, categories] },
        {
          id: 'account',
          index: '۰۵',
          label: 'حساب',
          items: [wallet, virtualCards, kyc, myDeals, transfer, devices, myRequests, profile],
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
          items: [devices, notifications, myRequests, profile],
        },
      ];
  }
}

/* Persist the submenu initial state across mounts. */
export function defaultExpanded(role: UserRole): string[] {
  if (role === 'USER') return [];
  return ['exchangeRates'];
}
