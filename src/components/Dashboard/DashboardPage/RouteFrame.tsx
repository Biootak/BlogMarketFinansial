'use client';

/* --------------------------------------------------------------------------
   RouteFrame — قاب مشترک همه‌ی مسیرهای داشبورد (Atlas 2026)
   --------------------------------------------------------------------------
   کار این کامپوننت یک چیز است: به کاربر بگوید «کجایی، وضعیت چیست، قدم بعدی
   کجاست». هیچ تزئینی که این سه را نگوید اینجا جا ندارد.

   ساختار:
     utility  → مسیر، بازگشت، نشانی فنی
     header   → نشانه در ناودان spine + عنوان + توضیح + ابزار
     body     → محتوای صفحه

   نگاشت مسیرها با «طولانی‌ترین پیشوند» انجام می‌شود؛ نسخه‌ی قبلی با
   includes() ساده کار می‌کرد و مثلاً /kyc-review به /kyc می‌افتاد.
   -------------------------------------------------------------------------- */

import {
  Activity,
  ArrowLeft,
  ArrowUpLeft,
  BadgeCheck,
  BarChart3,
  Bell,
  Building2,
  ClipboardList,
  CreditCard,
  FileCheck2,
  FileText,
  Gauge,
  Landmark,
  LayoutGrid,
  LifeBuoy,
  ListChecks,
  LockKeyhole,
  type LucideIcon,
  MapPin,
  Megaphone,
  MessageSquare,
  Percent,
  Receipt,
  ScrollText,
  Settings2,
  ShieldAlert,
  ShieldCheck,
  Tags,
  Timer,
  UserCog,
  Users,
  WalletCards,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

type RouteFamily =
  | 'home'
  | 'money'
  | 'risk'
  | 'identity'
  | 'observe'
  | 'reports'
  | 'security'
  | 'people'
  | 'support'
  | 'content'
  | 'settings'
  | 'workspace';

interface RouteMeta {
  label: string;
  family: RouteFamily;
  description: string;
  icon: LucideIcon;
  eyebrow: string;
  /** مسیر خواهر — نزدیک‌ترین اقدام بعدی، نه یک لینک تصادفی. */
  sibling?: string;
  siblingLabel?: string;
  /** آیا این مسیر داده‌ی زنده دارد؟ چیپ «داده زنده» فقط اینجا نشان داده می‌شود. */
  live?: boolean;
}

/* از طولانی به کوتاه مرتب شده — ترتیب بخشی از منطق است. */
const ROUTES: ReadonlyArray<readonly [string, RouteMeta]> = [
  ['/observability', { label: 'مشاهده‌پذیری', family: 'observe', eyebrow: 'Observability', description: 'سلامت سرویس‌ها، تأخیر پاسخ و رویدادهای زنده در یک نمای عملیاتی.', icon: Activity, sibling: '/dashboard/reports', siblingLabel: 'گزارش‌ها', live: true }],
  ['/transfer-providers', { label: 'ارائه‌دهندگان انتقال', family: 'money', eyebrow: 'Providers', description: 'مسیرهای انتقال، سهم هر ارائه‌دهنده و نرخ موفقیت آن‌ها.', icon: Landmark, sibling: '/dashboard/transfer', siblingLabel: 'انتقال‌ها' }],
  ['/exchange-quotes', { label: 'استعلام صرافی', family: 'money', eyebrow: 'Quotes', description: 'استعلام‌های ثبت‌شده و مهلت اعتبار هرکدام.', icon: Percent, sibling: '/dashboard/exchange-rates', siblingLabel: 'نرخ‌ها', live: true }],
  ['/exchange-rates', { label: 'نرخ صرافی', family: 'money', eyebrow: 'Rates', description: 'نرخ‌های فعال، اسپرد و آخرین زمان به‌روزرسانی.', icon: Percent, sibling: '/dashboard/rate-lists', siblingLabel: 'فهرست نرخ', live: true }],
  ['/exchange-staff', { label: 'کارکنان صرافی', family: 'people', eyebrow: 'Staff', description: 'دسترسی اعضای صرافی و نقشی که هرکدام دارند.', icon: UserCog, sibling: '/dashboard/permissions', siblingLabel: 'دسترسی‌ها' }],
  ['/service-requests', { label: 'درخواست خدمات', family: 'support', eyebrow: 'Requests', description: 'صف درخواست‌های باز و زمان پاسخ هرکدام.', icon: ClipboardList, sibling: '/dashboard/helpdesk', siblingLabel: 'پشتیبانی', live: true }],
  ['/billing-address', { label: 'نشانی صورتحساب', family: 'settings', eyebrow: 'Billing', description: 'نشانی‌های ثبت‌شده برای صدور صورتحساب.', icon: MapPin, sibling: '/dashboard/subscription', siblingLabel: 'اشتراک' }],
  ['/virtual-cards', { label: 'کارت مجازی', family: 'money', eyebrow: 'Cards', description: 'کارت‌های صادرشده، سقف مصرف و وضعیت هرکدام.', icon: CreditCard, sibling: '/dashboard/wallet', siblingLabel: 'کیف پول' }],
  ['/credit-rates', { label: 'نرخ اعتبار', family: 'money', eyebrow: 'Credit', description: 'نرخ‌های اعتباری تعریف‌شده و بازه‌ی اعمال آن‌ها.', icon: Percent, sibling: '/dashboard/rate-lists', siblingLabel: 'فهرست نرخ' }],
  ['/advertisements', { label: 'تبلیغات', family: 'content', eyebrow: 'Ads', description: 'کمپین‌های فعال، جایگاه‌ها و عملکرد هرکدام.', icon: Megaphone, sibling: '/dashboard/header-ad', siblingLabel: 'بنر سربرگ' }],
  ['/communication', { label: 'ارتباطات', family: 'support', eyebrow: 'Comms', description: 'پیام‌های خروجی، قالب‌ها و کانال‌های ارسال.', icon: MessageSquare, sibling: '/dashboard/notifications', siblingLabel: 'اعلان‌ها' }],
  ['/notifications', { label: 'اعلان‌ها', family: 'support', eyebrow: 'Notifications', description: 'رویدادهایی که نیاز به توجه شما دارند.', icon: Bell, sibling: '/dashboard/communication', siblingLabel: 'ارتباطات', live: true }],
  ['/subscription', { label: 'اشتراک', family: 'settings', eyebrow: 'Plan', description: 'طرح فعال، سقف مصرف و تاریخ تمدید.', icon: Receipt, sibling: '/dashboard/billing-address', siblingLabel: 'نشانی صورتحساب' }],
  ['/edit-profile', { label: 'ویرایش پروفایل', family: 'settings', eyebrow: 'Profile', description: 'اطلاعات حساب و ترجیحات شخصی شما.', icon: UserCog, sibling: '/dashboard/devices', siblingLabel: 'دستگاه‌ها' }],
  ['/fraud-review', { label: 'بررسی ریسک', family: 'risk', eyebrow: 'Risk', description: 'صف موارد مشکوک با شواهد واقعی، بدون داده‌ی نمایشی.', icon: ShieldAlert, sibling: '/dashboard/audit-log', siblingLabel: 'لاگ ممیزی', live: true }],
  ['/kyc-review', { label: 'صف احراز هویت', family: 'identity', eyebrow: 'KYC queue', description: 'پرونده‌های در انتظار بررسی، به ترتیب قدمت.', icon: FileCheck2, sibling: '/dashboard/kyc', siblingLabel: 'وضعیت من', live: true }],
  ['/my-requests', { label: 'درخواست‌های من', family: 'support', eyebrow: 'Mine', description: 'درخواست‌هایی که ثبت کرده‌اید و وضعیت فعلی‌شان.', icon: ClipboardList, sibling: '/dashboard/helpdesk', siblingLabel: 'پشتیبانی' }],
  ['/settlements', { label: 'تسویه', family: 'money', eyebrow: 'Settlement', description: 'چرخه‌های تسویه، مغایرت‌ها و اقلام باز.', icon: Landmark, sibling: '/dashboard/transfer', siblingLabel: 'انتقال‌ها' }],
  ['/permissions', { label: 'دسترسی‌ها', family: 'security', eyebrow: 'Permissions', description: 'اینکه چه کسی دقیقاً به چه چیزی دسترسی دارد.', icon: LockKeyhole, sibling: '/dashboard/roles', siblingLabel: 'نقش‌ها' }],
  ['/rate-lists', { label: 'فهرست نرخ', family: 'money', eyebrow: 'Rate lists', description: 'فهرست‌های نرخ و مقصدی که هرکدام سرویس می‌دهند.', icon: ListChecks, sibling: '/dashboard/exchange-rates', siblingLabel: 'نرخ صرافی' }],
  ['/site-guide', { label: 'راهنمای سایت', family: 'content', eyebrow: 'Guide', description: 'محتوای راهنما و مسیرهای آموزشی کاربران.', icon: FileText, sibling: '/dashboard/posts', siblingLabel: 'نوشته‌ها' }],
  ['/categories', { label: 'دسته‌بندی‌ها', family: 'content', eyebrow: 'Taxonomy', description: 'ساختار دسته‌ها و نحوه‌ی چیده‌شدن محتوا.', icon: Tags, sibling: '/dashboard/posts', siblingLabel: 'نوشته‌ها' }],
  ['/header-ad', { label: 'بنر سربرگ', family: 'content', eyebrow: 'Header ad', description: 'بنر بالای سایت و بازه‌ی نمایش آن.', icon: Megaphone, sibling: '/dashboard/advertisements', siblingLabel: 'تبلیغات' }],
  ['/exchanges', { label: 'صرافی‌ها', family: 'people', eyebrow: 'Exchanges', description: 'صرافی‌های متصل، وضعیت احراز و حجم کارشان.', icon: Building2, sibling: '/dashboard/exchange-staff', siblingLabel: 'کارکنان' }],
  ['/approvals', { label: 'تأییدها', family: 'risk', eyebrow: 'Approvals', description: 'مواردی که منتظر تصمیم شما مانده‌اند.', icon: BadgeCheck, sibling: '/dashboard/audit-log', siblingLabel: 'لاگ ممیزی', live: true }],
  ['/audit-log', { label: 'لاگ ممیزی', family: 'risk', eyebrow: 'Audit', description: 'ردپای تغییرات و رویدادهای حساس سیستم.', icon: ScrollText, sibling: '/dashboard/reports', siblingLabel: 'گزارش‌ها' }],
  ['/customers', { label: 'مشتری‌ها', family: 'people', eyebrow: 'Customers', description: 'نمای عملیاتی مشتری‌ها، درخواست‌ها و وضعیت حساب.', icon: Users, sibling: '/dashboard/service-requests', siblingLabel: 'درخواست‌ها' }],
  ['/my-deals', { label: 'معامله‌های من', family: 'money', eyebrow: 'Deals', description: 'معامله‌های باز و بسته‌ی شما با نتیجه‌ی هرکدام.', icon: WalletCards, sibling: '/dashboard/wallet', siblingLabel: 'کیف پول' }],
  ['/helpdesk', { label: 'پشتیبانی', family: 'support', eyebrow: 'Helpdesk', description: 'تیکت‌های باز، زمان انتظار و مسئول هرکدام.', icon: LifeBuoy, sibling: '/dashboard/my-requests', siblingLabel: 'درخواست‌های من', live: true }],
  ['/settings', { label: 'تنظیمات', family: 'settings', eyebrow: 'Settings', description: 'تنظیمات این پورتال، بدون خروج از جریان کاری.', icon: Settings2, sibling: '/dashboard/edit-profile', siblingLabel: 'پروفایل' }],
  ['/transfer', { label: 'انتقال وجه', family: 'money', eyebrow: 'Transfers', description: 'جریان انتقال‌ها، ارائه‌دهنده و وضعیت تسویه.', icon: WalletCards, sibling: '/dashboard/settlements', siblingLabel: 'تسویه', live: true }],
  ['/devices', { label: 'دستگاه‌ها', family: 'security', eyebrow: 'Devices', description: 'دستگاه‌های متصل و نشست‌های فعال حساب.', icon: LockKeyhole, sibling: '/dashboard/permissions', siblingLabel: 'دسترسی‌ها' }],
  ['/reports', { label: 'گزارش‌ها', family: 'reports', eyebrow: 'Reports', description: 'گزارش‌های قابل اتکا برای تصمیم‌های مالی و عملیاتی.', icon: BarChart3, sibling: '/dashboard/observability', siblingLabel: 'مشاهده‌پذیری' }],
  ['/wallet', { label: 'کیف پول', family: 'money', eyebrow: 'Wallet', description: 'موجودی‌ها و حرکت‌های مالی حساب.', icon: WalletCards, sibling: '/dashboard/virtual-cards', siblingLabel: 'کارت مجازی', live: true }],
  ['/posts', { label: 'نوشته‌ها', family: 'content', eyebrow: 'Editorial', description: 'پیش‌نویس‌ها، زمان‌بندی انتشار و عملکرد محتوا.', icon: FileText, sibling: '/dashboard/categories', siblingLabel: 'دسته‌بندی‌ها' }],
  ['/users', { label: 'کاربران', family: 'people', eyebrow: 'Users', description: 'مدیریت دسترسی و وضعیت کاربران پلتفرم.', icon: Users, sibling: '/dashboard/roles', siblingLabel: 'نقش‌ها' }],
  ['/roles', { label: 'نقش‌ها', family: 'security', eyebrow: 'Roles', description: 'نقش‌های تعریف‌شده و اختیاری که هرکدام می‌دهند.', icon: ShieldCheck, sibling: '/dashboard/permissions', siblingLabel: 'دسترسی‌ها' }],
  ['/jobs', { label: 'کارهای زمان‌بندی‌شده', family: 'observe', eyebrow: 'Jobs', description: 'اجراهای پس‌زمینه، آخرین نتیجه و اجرای بعدی.', icon: Timer, sibling: '/dashboard/observability', siblingLabel: 'مشاهده‌پذیری', live: true }],
  ['/kyc', { label: 'احراز هویت', family: 'identity', eyebrow: 'Identity', description: 'وضعیت هویت و مدارک شما با مسیر شفاف تا تأیید.', icon: FileCheck2, sibling: '/dashboard/kyc-review', siblingLabel: 'صف بررسی' }],
] as const;

const HOME: RouteMeta = {
  label: 'مرکز فرمان',
  family: 'home',
  eyebrow: 'Command center',
  description: 'تصویر زنده‌ای از مهم‌ترین کارهایی که همین حالا نیاز به توجه دارند.',
  icon: LayoutGrid,
  live: true,
};

const FALLBACK: RouteMeta = {
  label: 'فضای کاری',
  family: 'workspace',
  eyebrow: 'Workspace',
  description: 'اطلاعات واقعی این مسیر، با تمرکز روی اقدام بعدی.',
  icon: Gauge,
};

/** طولانی‌ترین پیشوند برنده است، نه اولین تطابق. */
function resolve(pathname: string): RouteMeta {
  let best: RouteMeta | null = null;
  let bestLength = 0;

  for (const [segment, meta] of ROUTES) {
    if (pathname.includes(segment) && segment.length > bestLength) {
      best = meta;
      bestLength = segment.length;
    }
  }

  if (best) return best;
  if (pathname === '/dashboard' || pathname.endsWith('/dashboard')) return HOME;
  return FALLBACK;
}

function resolveBase(pathname: string): string {
  if (pathname.startsWith('/customer')) return '/customer/dashboard';
  if (pathname.startsWith('/exchange')) return '/exchange/dashboard';
  return '/dashboard';
}

export function RouteFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const meta = resolve(pathname);
  const Icon = meta.icon;
  const base = resolveBase(pathname);
  const isHome = pathname === base;

  return (
    <div className="route-frame" data-route-family={meta.family} data-route-path={pathname}>
      <div className="route-frame__utility">
        <span className="route-frame__breadcrumb">
          <span className="route-frame__breadcrumb-dot" aria-hidden />
          {isHome ? 'مرکز فرمان' : 'فضای کاری'}
        </span>

        {!isHome && (
          <Link href={base} className="route-frame__back">
            <ArrowLeft aria-hidden size={13} strokeWidth={2} />
            بازگشت
          </Link>
        )}

        <span className="route-frame__path" dir="ltr">
          {pathname}
        </span>
      </div>

      <header className="route-frame__header">
        <span className="route-frame__mark" aria-hidden>
          <Icon size={19} strokeWidth={1.7} />
        </span>

        <div className="route-frame__heading">
          <span className="route-frame__eyebrow">{meta.eyebrow}</span>
          <h1 className="route-frame__title">{meta.label}</h1>
          <p className="route-frame__description">{meta.description}</p>
        </div>

        <div className="route-frame__tools">
          {meta.live && (
            <span className="route-frame__state" aria-live="polite">
              <span className="route-frame__state-dot" aria-hidden />
              داده زنده
            </span>
          )}
          {meta.sibling && (
            <Link href={meta.sibling} className="route-frame__sibling">
              {meta.siblingLabel}
              <ArrowUpLeft aria-hidden size={13} strokeWidth={2} />
            </Link>
          )}
        </div>
      </header>

      <div className="route-frame__body">{children}</div>
    </div>
  );
}
