/**
 * pageHeaders — قرارداد سربرگ صفحه (Atlas 2026)
 * ----------------------------------------------------------------------------
 * چرا این فایل وجود دارد؟
 *
 * سربرگ هر مسیر در سه جای مختلف نوشته می‌شد: `page.tsx`، پوستهٔ کلاینت، و
 * `loading.tsx`. نتیجه: چند مسیر دو سربرگ پشت‌سرهم رندر می‌کردند و خرده‌مسیرها
 * بین صفحات واگرا شده بودند («داشبورد» در برابر «مرکز فرماندهی»).
 *
 * از این پس هر مسیر دقیقاً یک ورودی در این جدول دارد و دقیقاً یک مصرف‌کننده:
 *
 *   owner: 'layout' → فقط `layout.tsx` سربرگ می‌زند (زیرمسیرها هیچ‌وقت)
 *   owner: 'page'   → فقط `page.tsx` سربرگ می‌زند
 *   owner: 'client' → اکشن‌های سربرگ تعاملی‌اند، پس پوستهٔ کلاینت مالک است و
 *                     `page.tsx` فقط داده می‌گیرد
 *
 * مصرف:
 *   <PageHeader route="/dashboard/virtual-cards" actions={…} />
 *
 * هر prop صریحی که پاس بدهید بر پیش‌تنظیم اولویت دارد؛ برای عنوان‌های پویا
 * (نام مشتری، شناسهٔ تراکنش) همان `title` را مستقیم بدهید.
 *
 * این فایل عمداً هیچ import ری‌اکتی ندارد تا هم در سرور و هم در کلاینت بدون
 * هزینه قابل استفاده باشد.
 */

export type PageHeaderIcon =
  | 'user-circle'
  | 'users'
  | 'shield-check'
  | 'shield-x'
  | 'clipboard-list'
  | 'layers'
  | 'arrow-left-right'
  | 'bell'
  | 'folder-open'
  | 'bar-chart'
  | 'layout-dashboard'
  | 'settings'
  | 'wallet'
  | 'file-text'
  | 'tag'
  | 'building'
  | 'credit-card'
  | 'sparkles'
  | 'activity'
  | 'radar'
  | 'gauge'
  | 'zap'
  | 'alert-triangle'
  | 'database'
  | 'workflow'
  | 'inbox'
  | 'send'
  | 'megaphone'
  | 'message-square'
  | 'ticket'
  | 'key-round'
  | 'circle-dollar-sign'
  | 'device-phone-mobile';

export type PageHeaderAccent = 'indigo' | 'emerald' | 'amber' | 'rose' | 'violet' | 'cyan';

/**
 * variant:
 *  - 'default'  — سربرگ کامل با قاعدهٔ افقی (صفحهٔ ریشهٔ هر بخش)
 *  - 'compact'  — کوتاه‌تر، مناسب فهرست/جدول با سنجه در ادامه
 *  - 'minimal'  — فقط eyebrow + عنوان، بدون قاعده (صفحاتی که hero یا subnav دارند)
 *  - 'strip'    — نوار باریک خرده‌مسیر، مناسب فرم، ویزارد و تنظیمات
 */
export type PageHeaderVariant = 'default' | 'compact' | 'minimal' | 'strip';

export interface PageHeaderCrumb {
  href?: string;
  label: string;
}

export interface PageHeaderMetaItem {
  label: string;
  value: string | number;
}

/** چه لایه‌ای اجازه دارد سربرگ این مسیر را رندر کند. */
export type PageHeaderOwner = 'layout' | 'page' | 'client';

export interface PageHeaderPreset {
  owner: PageHeaderOwner;
  variant: PageHeaderVariant;
  title: string;
  description?: string;
  eyebrow?: string;
  icon?: PageHeaderIcon;
  accent?: PageHeaderAccent;
  breadcrumb?: PageHeaderCrumb[];
}

/* ── ریشه‌های خرده‌مسیر — یک تعریف، نه بیست تا ───────────────────────────── */

const ADMIN: PageHeaderCrumb = { label: 'داشبورد', href: '/dashboard' };
const EXCHANGE: PageHeaderCrumb = { label: 'پنل صرافی', href: '/exchange/dashboard' };

function trail(
  root: PageHeaderCrumb,
  ...rest: Array<string | PageHeaderCrumb>
): PageHeaderCrumb[] {
  return [root, ...rest.map((c) => (typeof c === 'string' ? { label: c } : c))];
}

/* ── جدول مسیرها ─────────────────────────────────────────────────────────── */

export const PAGE_HEADERS = {
  // ── پلتفرم / مدیریت ──────────────────────────────────────────────────────
  '/dashboard/users': {
    owner: 'client',
    variant: 'compact',
    title: 'کاربران',
    eyebrow: 'مدیریت',
    icon: 'users',
    accent: 'indigo',
    breadcrumb: trail(ADMIN, 'کاربران'),
  },
  '/dashboard/approvals': {
    owner: 'page',
    variant: 'default',
    title: 'مرکز تأییدیه‌ها',
    description:
      'جریان‌های تأیید چندمرحله‌ای برای تسویه، احراز هویت، استرداد، برداشت و درخواست‌های سفارشی.',
    eyebrow: 'پلتفرم',
    icon: 'clipboard-list',
    accent: 'indigo',
    breadcrumb: trail(ADMIN, 'مرکز تأییدیه‌ها'),
  },
  '/dashboard/categories': {
    owner: 'page',
    variant: 'compact',
    title: 'مدیریت دسته‌بندی‌ها',
    eyebrow: 'ساختار',
    icon: 'folder-open',
    accent: 'indigo',
    breadcrumb: trail(ADMIN, 'دسته‌بندی‌ها'),
  },
  '/dashboard/advertisements': {
    owner: 'page',
    variant: 'default',
    title: 'مدیریت تبلیغات',
    eyebrow: 'محتوا',
    icon: 'megaphone',
    accent: 'violet',
    breadcrumb: trail(ADMIN, 'تبلیغات'),
  },
  '/dashboard/notifications': {
    owner: 'client',
    variant: 'compact',
    title: 'مرکز اعلان‌ها',
    icon: 'bell',
    accent: 'indigo',
    breadcrumb: trail(ADMIN, 'اعلان‌ها'),
  },
  '/dashboard/helpdesk': {
    owner: 'client',
    variant: 'minimal',
    title: 'صندوق اولویت',
    eyebrow: 'مرکز پشتیبانی',
    icon: 'ticket',
    accent: 'violet',
    breadcrumb: trail(ADMIN, 'پشتیبانی'),
  },

  // ── عملیات مالی ──────────────────────────────────────────────────────────
  '/dashboard/credit-rates': {
    owner: 'client',
    variant: 'compact',
    title: 'نرخ‌های اعتباری و بانک‌ها',
    description:
      'پایش و مدیریت نرخ سود، تسهیلات و خطوط اعتباری برای همکاری با بانک‌ها و مؤسسات.',
    eyebrow: 'عملیات مالی',
    icon: 'bar-chart',
    accent: 'amber',
    breadcrumb: trail(ADMIN, 'عملیات مالی', 'نرخ‌های اعتباری'),
  },
  '/dashboard/exchange-rates': {
    owner: 'page',
    variant: 'compact',
    title: 'نرخ ارزها',
    eyebrow: 'عملیات مالی',
    icon: 'circle-dollar-sign',
    accent: 'amber',
    breadcrumb: trail(ADMIN, 'نرخ ارزها'),
  },
  '/dashboard/exchange-quotes': {
    owner: 'client',
    variant: 'compact',
    title: 'صف تأیید قیمت‌گذاری',
    description: 'بررسی و تأیید قیمت‌های ارسالی صرافی‌ها با مقایسه با نرخ بازار.',
    eyebrow: 'عملیات صرافی',
    icon: 'arrow-left-right',
    accent: 'emerald',
    breadcrumb: trail(ADMIN, 'عملیات صرافی', 'تأیید قیمت‌ها'),
  },
  '/dashboard/exchanges': {
    owner: 'page',
    variant: 'default',
    title: 'مدیریت صراف‌ها',
    description: 'ایجاد، تأیید و مدیریت صرافی‌های عضو پلتفرم.',
    eyebrow: 'عملیات صرافی',
    icon: 'building',
    accent: 'emerald',
    breadcrumb: trail(ADMIN, 'صراف‌ها'),
  },
  '/dashboard/settlements': {
    owner: 'client',
    variant: 'compact',
    title: 'تسویه‌حساب صرافی‌ها',
    description: 'مدیریت و پرداخت دوره‌های تسویه پلتفرم',
    eyebrow: 'عملیات مالی',
    icon: 'wallet',
    accent: 'emerald',
    breadcrumb: trail(ADMIN, 'تسویه‌حساب'),
  },
  '/dashboard/transfer-providers': {
    owner: 'client',
    variant: 'compact',
    title: 'صرافی‌های جدول مقایسه',
    description: 'مدیریت provider های نرخ که در صفحه /money-transfer نمایش داده می‌شوند',
    eyebrow: 'عملیات مالی',
    icon: 'layers',
    accent: 'amber',
    breadcrumb: trail(ADMIN, 'جدول مقایسه'),
  },

  // ── حساب من ──────────────────────────────────────────────────────────────
  '/dashboard/virtual-cards': {
    owner: 'client',
    variant: 'compact',
    title: 'کارت‌های مجازی',
    description: 'مدیریت کارت‌های مجازی، صدور کارت جدید، فریز و پیگیری تراکنش‌ها.',
    eyebrow: 'حساب من',
    icon: 'credit-card',
    accent: 'cyan',
    breadcrumb: trail(ADMIN, 'حساب من', 'کارت‌های مجازی'),
  },
  '/dashboard/transfer': {
    owner: 'client',
    variant: 'strip',
    title: 'انتقال P2P',
    description:
      'ارسال فوری افغانی به دوستان، همکاران و خانواده — انتقال مستقیم بین کاربران ثبت‌شده',
    eyebrow: 'حساب من',
    icon: 'send',
    accent: 'cyan',
    breadcrumb: trail(ADMIN, 'حساب من', 'انتقال P2P'),
  },
  '/dashboard/my-deals': {
    owner: 'client',
    variant: 'compact',
    title: 'معاملات ارزی من',
    eyebrow: 'پورتفولیو',
    icon: 'arrow-left-right',
    accent: 'cyan',
    breadcrumb: trail(ADMIN, 'معاملات ارزی من'),
  },
  '/dashboard/my-requests': {
    owner: 'client',
    variant: 'compact',
    title: 'درخواست‌های من',
    eyebrow: 'حساب من',
    icon: 'inbox',
    accent: 'indigo',
    breadcrumb: trail(ADMIN, 'درخواست‌های من'),
  },
  '/dashboard/subscription': {
    owner: 'client',
    variant: 'minimal',
    title: 'پلن اشتراک',
    description: 'پلن فعلی خود را ارتقاء دهید یا تغییر دهید',
    eyebrow: 'حساب من',
    icon: 'sparkles',
    accent: 'violet',
    breadcrumb: trail(ADMIN, 'اشتراک'),
  },
  '/dashboard/billing-address': {
    owner: 'client',
    variant: 'strip',
    title: 'آدرس صورتحساب',
    eyebrow: 'صورتحساب',
    icon: 'file-text',
    accent: 'indigo',
    breadcrumb: trail(ADMIN, 'آدرس صورتحساب'),
  },
  '/dashboard/edit-profile': {
    owner: 'page',
    variant: 'strip',
    title: 'ویرایش پروفایل',
    eyebrow: 'حساب کاربری',
    icon: 'user-circle',
    accent: 'indigo',
    breadcrumb: trail(ADMIN, 'ویرایش پروفایل'),
  },

  // ── امنیت و ممیزی ────────────────────────────────────────────────────────
  '/dashboard/devices': {
    owner: 'client',
    variant: 'minimal',
    title: 'دستگاه‌ها و نشست‌های فعال',
    description:
      'مانیتورینگ هوشمند، مدیریت دسترسی‌ها و بررسی فعالیت‌های امنیتی حساب کاربری شما',
    eyebrow: 'امنیت',
    icon: 'device-phone-mobile',
    accent: 'cyan',
    breadcrumb: trail(ADMIN, 'دستگاه‌ها'),
  },
  '/dashboard/audit-log': {
    owner: 'client',
    variant: 'compact',
    title: 'گزارش ممیزی',
    eyebrow: 'امنیت',
    icon: 'database',
    accent: 'violet',
    breadcrumb: trail(ADMIN, 'گزارش ممیزی'),
  },
  '/dashboard/kyc-review': {
    owner: 'client',
    variant: 'compact',
    title: 'بررسی درخواست‌های KYC',
    eyebrow: 'انطباق',
    icon: 'shield-check',
    accent: 'emerald',
    breadcrumb: trail(ADMIN, 'بررسی KYC'),
  },
  '/dashboard/fraud-review': {
    owner: 'client',
    variant: 'compact',
    title: 'مرکز بررسی تقلب',
    eyebrow: 'انطباق',
    icon: 'shield-x',
    accent: 'rose',
    breadcrumb: trail(ADMIN, 'بررسی تقلب'),
  },

  // ── تحلیل و عملیات ───────────────────────────────────────────────────────
  '/dashboard/reports': {
    owner: 'client',
    variant: 'minimal',
    title: 'گزارش‌ها',
    eyebrow: 'تحلیل و آمار',
    icon: 'bar-chart',
    accent: 'indigo',
    breadcrumb: trail(ADMIN, 'گزارش‌ها'),
  },
  '/dashboard/observability': {
    owner: 'layout',
    variant: 'minimal',
    title: 'مرکز مشاهده‌پذیری',
    description:
      'سلامت سرویس‌ها، تأخیر، خطا و رد ممیزی — هر عدد مستقیم از SystemLog و AuditLog خوانده می‌شود.',
    eyebrow: 'مرکز عملیات',
    icon: 'radar',
    accent: 'emerald',
    breadcrumb: trail(ADMIN, 'مشاهده‌پذیری'),
  },
  '/dashboard/customers': {
    owner: 'client',
    variant: 'compact',
    title: 'مشتریان صرافی',
    eyebrow: 'عملیات صرافی',
    icon: 'users',
    accent: 'emerald',
    breadcrumb: trail(ADMIN, 'مشتریان'),
  },

  // ── پنل صرافی ────────────────────────────────────────────────────────────
  '/exchange/rates': {
    owner: 'page',
    variant: 'default',
    title: 'مدیریت نرخ‌ها',
    description: 'نرخ‌های صرافی خود را تنظیم کنید تا در صفحه مقایسه سایت نمایش داده شوند',
    eyebrow: 'صرافی',
    icon: 'circle-dollar-sign',
    accent: 'emerald',
    breadcrumb: trail(EXCHANGE, 'نرخ‌ها'),
  },
  '/exchange/quotes': {
    owner: 'page',
    variant: 'default',
    title: 'قیمت‌گذاری ارز',
    description:
      'برای هر ارز قیمت خرید و فروش خود را ثبت کنید. پس از تایید ادمین در سایت نمایش داده می‌شود.',
    eyebrow: 'صرافی',
    icon: 'arrow-left-right',
    accent: 'emerald',
    breadcrumb: trail(EXCHANGE, 'قیمت‌گذاری'),
  },
  '/exchange/transactions': {
    owner: 'page',
    variant: 'default',
    title: 'تراکنش‌ها',
    eyebrow: 'صرافی',
    icon: 'arrow-left-right',
    accent: 'emerald',
    breadcrumb: trail(EXCHANGE, 'تراکنش‌ها'),
  },
  '/exchange/settlement': {
    owner: 'page',
    variant: 'default',
    title: 'تسویه‌حساب',
    description: 'آبشار تسویه، خط زمانی دوره‌ها و جزئیات هر دوره.',
    eyebrow: 'صرافی',
    icon: 'wallet',
    accent: 'emerald',
    breadcrumb: trail(EXCHANGE, 'تسویه‌حساب'),
  },
  '/exchange/reports': {
    owner: 'page',
    variant: 'default',
    title: 'گزارش‌ها',
    description: 'تحلیل مالی، شبکهٔ ارزی، ریتم هفتگی و لیست تراکنش‌ها.',
    eyebrow: 'صرافی',
    icon: 'bar-chart',
    accent: 'emerald',
    breadcrumb: trail(EXCHANGE, 'گزارش‌ها'),
  },
  '/exchange/services': {
    owner: 'page',
    variant: 'default',
    title: 'خدمات آنلاین',
    description:
      'سرویس‌هایی که در صفحه عمومی صرافی نمایش داده می‌شود را انتخاب و تنظیم کنید',
    eyebrow: 'صرافی',
    icon: 'layers',
    accent: 'emerald',
    breadcrumb: trail(EXCHANGE, 'خدمات'),
  },
  '/exchange/kyc-review': {
    owner: 'page',
    variant: 'default',
    title: 'بررسی احراز هویت',
    description: 'صف KYC مشتریان صرافی شما — تأیید یا رد با یک کلیک',
    eyebrow: 'صرافی',
    icon: 'shield-check',
    accent: 'emerald',
    breadcrumb: trail(EXCHANGE, 'بررسی KYC'),
  },
  '/exchange/profile': {
    owner: 'page',
    variant: 'default',
    title: 'پروفایل عمومی',
    description: 'هویت بصری و اطلاعاتی که مشتریان در صفحهٔ عمومی شما می‌بینند',
    eyebrow: 'صرافی',
    icon: 'building',
    accent: 'emerald',
    breadcrumb: trail(EXCHANGE, 'پروفایل'),
  },
  '/exchange/settings': {
    owner: 'layout',
    variant: 'default',
    title: 'تنظیمات صرافی',
    description: 'پیکربندی عملیاتی، امنیتی و اطلاعات عمومی',
    eyebrow: 'Workspace',
    icon: 'settings',
    accent: 'emerald',
    breadcrumb: trail(EXCHANGE, 'تنظیمات'),
  },
  '/exchange/staff': {
    owner: 'page',
    variant: 'default',
    title: 'تیم و دسترسی‌ها',
    eyebrow: 'صرافی',
    icon: 'users',
    accent: 'emerald',
    breadcrumb: trail(EXCHANGE, 'تیم'),
  },
  '/exchange/staff/activity': {
    owner: 'page',
    variant: 'default',
    title: 'لاگ ممیزی',
    eyebrow: 'صرافی · تیم',
    icon: 'database',
    accent: 'emerald',
    breadcrumb: trail(EXCHANGE, { label: 'تیم', href: '/exchange/staff' }, 'لاگ ممیزی'),
  },
  '/exchange/staff/permissions': {
    owner: 'page',
    variant: 'default',
    title: 'ماتریس دسترسی نقش‌ها',
    eyebrow: 'صرافی · تیم',
    icon: 'key-round',
    accent: 'emerald',
    breadcrumb: trail(EXCHANGE, { label: 'تیم', href: '/exchange/staff' }, 'دسترسی‌ها'),
  },
  '/exchange/customers/new': {
    owner: 'page',
    variant: 'default',
    title: 'ایجاد مشتری جدید',
    description: 'مشخصات، محدودیت‌ها و وضعیت را در یک صفحه وارد کنید.',
    eyebrow: 'صرافی · مشتریان',
    icon: 'user-circle',
    accent: 'emerald',
    breadcrumb: trail(EXCHANGE, { label: 'مشتریان', href: '/exchange/customers' }, 'مشتری جدید'),
  },
  '/exchange/customers/import': {
    owner: 'page',
    variant: 'default',
    title: 'ورود دسته‌جمعی',
    description: 'از CSV یا paste ساده. پیش‌نمایش قبل از ثبت، خطاها به تفکیک.',
    eyebrow: 'صرافی · مشتریان',
    icon: 'inbox',
    accent: 'emerald',
    breadcrumb: trail(EXCHANGE, { label: 'مشتریان', href: '/exchange/customers' }, 'ورود دسته‌جمعی'),
  },
  '/exchange/customers/archive': {
    owner: 'page',
    variant: 'default',
    title: 'آرشیو مشتریان',
    description: 'مشتریان بسته و مسدود برای گزارش‌های قانونی و مراجعات بعدی.',
    eyebrow: 'صرافی · مشتریان',
    icon: 'folder-open',
    accent: 'emerald',
    breadcrumb: trail(EXCHANGE, { label: 'مشتریان', href: '/exchange/customers' }, 'آرشیو'),
  },
  '/exchange/customers/segments': {
    owner: 'page',
    variant: 'default',
    title: 'سگمنت‌های مشتریان',
    description: 'سفر از سگمنت‌های کلان به رفتار تک‌تک مشتریان.',
    eyebrow: 'صرافی · مشتریان',
    icon: 'layers',
    accent: 'emerald',
    breadcrumb: trail(EXCHANGE, { label: 'مشتریان', href: '/exchange/customers' }, 'سگمنت‌ها'),
  },
} satisfies Record<string, PageHeaderPreset>;

export type PageHeaderRoute = keyof typeof PAGE_HEADERS;

/** پیش‌تنظیم یک مسیر. برای مصرف در اسکلتون و تست‌ها. */
export function resolvePageHeader(route: PageHeaderRoute): PageHeaderPreset {
  return PAGE_HEADERS[route];
}

/** آیا این مسیر در جدول ثبت شده است؟ (برای گاردهای زمان اجرا) */
export function isPageHeaderRoute(value: string): value is PageHeaderRoute {
  return Object.hasOwn(PAGE_HEADERS, value);
}
