'use client';

import { ArrowLeft, ArrowUpLeft, BarChart3, FileCheck2, Landmark, LifeBuoy, LockKeyhole, Settings2, ShieldCheck, WalletCards } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

type Meta = { label: string; family: string; description: string; icon: typeof BarChart3; sibling?: string; siblingLabel?: string };

const META: Array<[string, Meta]> = [
  ['/observability', { label: 'مشاهده‌پذیری', family: 'observe', description: 'سلامت سرویس‌ها، latency و رویدادهای زنده در یک نمای عملیاتی.', icon: BarChart3, sibling: '/dashboard/observability/services', siblingLabel: 'سرویس‌ها' }],
  ['/reports', { label: 'گزارش‌ها', family: 'reports', description: 'گزارش‌های قابل اتکا برای تصمیم‌های مالی و عملیاتی.', icon: BarChart3, sibling: '/dashboard/audit-log', siblingLabel: 'لاگ ممیزی' }],
  ['/audit-log', { label: 'لاگ ممیزی', family: 'risk', description: 'ردپای تغییرات و رویدادهای حساس سیستم.', icon: ShieldCheck, sibling: '/dashboard/reports', siblingLabel: 'گزارش‌ها' }],
  ['/fraud-review', { label: 'بررسی ریسک', family: 'risk', description: 'صف بررسی موارد مشکوک، بدون داده ساختگی.', icon: ShieldCheck, sibling: '/dashboard/kyc-review', siblingLabel: 'صف احراز هویت' }],
  ['/kyc', { label: 'احراز هویت', family: 'identity', description: 'بررسی وضعیت هویت و مدارک با مسیر شفاف.', icon: FileCheck2, sibling: '/dashboard/kyc-review', siblingLabel: 'صف بررسی' }],
  ['/kyc-review', { label: 'صف احراز هویت', family: 'identity', description: 'مدیریت پرونده‌های احراز هویت در انتظار اقدام.', icon: FileCheck2, sibling: '/dashboard/kyc', siblingLabel: 'وضعیت من' }],
  ['/transfer', { label: 'انتقال وجه', family: 'money', description: 'جریان انتقال، ارائه‌دهنده و وضعیت تسویه.', icon: WalletCards, sibling: '/dashboard/transfer-providers', siblingLabel: 'ارائه‌دهنده‌ها' }],
  ['/settlement', { label: 'تسویه', family: 'money', description: 'کنترل چرخه‌های تسویه و مغایرت‌ها.', icon: Landmark, sibling: '/dashboard/transfer', siblingLabel: 'انتقال‌ها' }],
  ['/wallet', { label: 'کیف پول', family: 'money', description: 'موجودی‌ها و حرکت‌های مالی حساب.', icon: WalletCards, sibling: '/dashboard/transactions', siblingLabel: 'تراکنش‌ها' }],
  ['/customers', { label: 'مشتری‌ها', family: 'people', description: 'نمای عملیاتی مشتری‌ها، درخواست‌ها و وضعیت حساب.', icon: Landmark, sibling: '/dashboard/service-requests', siblingLabel: 'درخواست‌ها' }],
  ['/users', { label: 'کاربران', family: 'people', description: 'مدیریت دسترسی و وضعیت کاربران پلتفرم.', icon: Landmark, sibling: '/dashboard/roles', siblingLabel: 'نقش‌ها' }],
  ['/settings', { label: 'تنظیمات', family: 'settings', description: 'تنظیمات این پورتال، بدون خروج از جریان کاری.', icon: Settings2, sibling: '/dashboard/edit-profile', siblingLabel: 'پروفایل' }],
  ['/security', { label: 'امنیت', family: 'security', description: 'دستگاه‌ها، نشست‌ها و کنترل‌های امنیتی.', icon: LockKeyhole, sibling: '/dashboard/devices', siblingLabel: 'دستگاه‌ها' }],
  ['/devices', { label: 'دستگاه‌ها', family: 'security', description: 'دستگاه‌های متصل و نشست‌های فعال.', icon: LockKeyhole, sibling: '/dashboard/permissions', siblingLabel: 'دسترسی‌ها' }],
  ['/helpdesk', { label: 'پشتیبانی', family: 'support', description: 'درخواست‌های پشتیبانی و پیگیری پاسخ‌ها.', icon: LifeBuoy, sibling: '/dashboard/helpdesk/mine', siblingLabel: 'درخواست‌های من' }],
];

/**
 * مسیرهایی که PageHeader خودشان را دارند — RouteFrame برای این‌ها
 * فقط wrapper می‌شود بدون اینکه header خودش را رندر کند.
 *
 * قانون: اگر یک page یا client component در این مسیر <PageHeader> رندر
 * می‌کند، مسیر را اینجا اضافه کن تا header تکراری نداشته باشیم.
 */
const PAGES_WITH_OWN_HEADER: readonly string[] = [
  // root dashboard — FintechCockpit header خودش را دارد
  '/dashboard',
  // صفحاتی که page.tsx یا layout یا client آن‌ها PageHeader دارد
  '/dashboard/advertisements',
  '/dashboard/approvals',
  '/dashboard/audit-log',
  '/dashboard/billing-address',
  '/dashboard/categories',
  '/dashboard/credit-rates',
  '/dashboard/customers',
  '/dashboard/devices',
  '/dashboard/edit-profile',
  '/dashboard/exchange-quotes',
  '/dashboard/exchange-rates',
  '/dashboard/exchange-staff',
  '/dashboard/exchanges',
  '/dashboard/fraud-review',
  '/dashboard/header-ad',
  '/dashboard/helpdesk',
  '/dashboard/kyc-review',
  '/dashboard/my-deals',
  '/dashboard/my-requests',
  '/dashboard/notifications',
  '/dashboard/observability',
  '/dashboard/permissions',
  '/dashboard/posts',
  '/dashboard/reports',
  '/dashboard/roles',
  '/dashboard/settlements',
  '/dashboard/subscription',
  '/dashboard/transfer',
  '/dashboard/transfer-providers',
  '/dashboard/users',
  '/dashboard/virtual-cards',
];

/**
 * آیا مسیر جاری header خودش را دارد؟
 * از دقیق‌ترین match استفاده می‌کنیم — مثلاً /dashboard/exchanges/[id] هم
 * زیر /dashboard/exchanges قرار می‌گیرد.
 */
const hasOwnHeader = (pathname: string): boolean => {
  // دقیقاً /dashboard
  if (pathname === '/dashboard') return true;
  // زیرمسیر یکی از مسیرهای لیست
  return PAGES_WITH_OWN_HEADER.some(
    (p) => p !== '/dashboard' && (pathname === p || pathname.startsWith(p + '/'))
  );
};

const resolve = (path: string): Meta => {
  for (const [match, meta] of META) if (path.includes(match)) return meta;
  if (path === '/dashboard' || path.endsWith('/dashboard')) return { label: 'مرکز فرمان', family: 'home', description: 'تصویر زنده‌ای از مهم‌ترین کارهایی که همین حالا نیاز به توجه دارند.', icon: BarChart3 };
  return { label: 'فضای کاری', family: 'workspace', description: 'اطلاعات واقعی این مسیر، با تمرکز روی اقدام بعدی.', icon: BarChart3 };
};

export function RouteFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const meta = resolve(pathname);
  const Icon = meta.icon;
  const base = pathname.startsWith('/customer') ? '/customer/dashboard' : pathname.startsWith('/exchange') ? '/exchange/dashboard' : '/dashboard';
  const isHome = pathname === base;

  // اگر صفحه header خودش را دارد — فقط wrapper بدون header RouteFrame
  if (hasOwnHeader(pathname)) {
    return (
      <div className="route-frame" data-route-family={meta.family} data-route-path={pathname}>
        <div className="route-frame__body">{children}</div>
      </div>
    );
  }

  return (
    <div className="route-frame" data-route-family={meta.family} data-route-path={pathname}>
      <div className="route-frame__utility" aria-label="زمینه مسیر">
        <span className="route-frame__breadcrumb"><span className="route-frame__breadcrumb-dot" aria-hidden /> {isHome ? 'مرکز فرمان' : 'فضای کاری'}</span>
        {!isHome && <Link href={base} className="route-frame__back"><ArrowLeft aria-hidden size={14} /> بازگشت</Link>}
        <span className="route-frame__path" dir="ltr">{pathname}</span>
      </div>
      <header className="route-frame__header">
        <div className="route-frame__mark" aria-hidden><Icon size={21} strokeWidth={1.7} /></div>
        <div className="route-frame__heading"><span className="route-frame__eyebrow">{meta.family === 'home' ? 'Command center' : 'Route workspace'}</span><h1 className="route-frame__title">{meta.label}</h1><p className="route-frame__description">{meta.description}</p></div>
        <div className="route-frame__tools"><span className="route-frame__state"><span className="route-frame__state-dot" aria-hidden /> داده زنده</span>{meta.sibling && <Link href={meta.sibling} className="route-frame__sibling">{meta.siblingLabel}<ArrowUpLeft aria-hidden size={14} /></Link>}</div>
      </header>
      <div className="route-frame__body">{children}</div>
    </div>
  );
}
