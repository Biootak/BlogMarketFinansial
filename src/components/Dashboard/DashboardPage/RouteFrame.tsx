'use client';

import { ArrowLeft, ArrowUpLeft, BarChart3, FileCheck2, Landmark, LifeBuoy, LockKeyhole, Radar, Settings2, ShieldCheck, WalletCards } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

type HeaderMode = 'route' | 'local' | 'none';
type Meta = { label: string; family: string; description: string; icon: typeof BarChart3; header: HeaderMode; sibling?: string; siblingLabel?: string };

/*
 * Header policy:
 * - `none`: dashboard home is the cockpit, not a document page.
 * - `local`: the page owns a deliberate header (compact, strip, or a custom
 *   product header) and must not get a second global h1/breadcrumb.
 * - `route`: the shared route header is the only header, used for routes that
 *   otherwise have no page-level header. Observability intentionally lives here.
 *
 * Keep this list explicit. Guessing from whether a component happens to import
 * PageHeader is how duplicate headers got into production in the first place.
 */
const LOCAL_HEADER_ROUTES = [
  '/roles',
  '/approvals',
  '/edit-profile',
  '/credit-rates',
  '/categories',
  '/exchanges',
  '/virtual-cards',
  '/exchange-quotes',
  '/users',
  '/exchange-rates',
  '/posts',
  '/reports',
  '/advertisements',
  '/header-ad',
  '/subscription',
  '/helpdesk',
  '/devices',
  '/audit-log',
  '/billing-address',
  '/kyc-review',
  '/fraud-review',
  '/settlements',
  '/my-requests',
  '/notifications',
  '/exchange-staff',
  '/transfer-providers',
  '/transfer',
  '/my-deals',
  '/customers',
];

const hasLocalHeader = (path: string) => LOCAL_HEADER_ROUTES.some((route) => path === `/dashboard${route}` || path.startsWith(`/dashboard${route}/`));

const META: Array<[string, Omit<Meta, 'header'>]> = [
  ['/observability', { label: 'مرکز مشاهده‌پذیری', family: 'observe', description: 'سلامت سرویس‌ها، تأخیر، خطا و رد ممیزی، هر عدد مستقیم از SystemLog و AuditLog خوانده می‌شود.', icon: Radar, sibling: '/dashboard/observability/services', siblingLabel: 'سرویس‌ها' }],
  ['/service-requests', { label: 'درخواست‌های خدماتی', family: 'operations', description: 'صف درخواست‌های واقعی کاربران، با تمرکز روی وضعیت و اقدام بعدی.', icon: LifeBuoy, sibling: '/dashboard/my-requests', siblingLabel: 'درخواست‌های من' }],
  ['/wallet', { label: 'کیف پول', family: 'money', description: 'موجودی‌ها و حرکت‌های مالی حساب.', icon: WalletCards, sibling: '/dashboard/transfer', siblingLabel: 'انتقال وجه' }],
  ['/settings', { label: 'تنظیمات', family: 'settings', description: 'تنظیمات این پورتال، بدون خروج از جریان کاری.', icon: Settings2, sibling: '/dashboard/edit-profile', siblingLabel: 'پروفایل' }],
  ['/security', { label: 'امنیت', family: 'security', description: 'دستگاه‌ها، نشست‌ها و کنترل‌های امنیتی.', icon: LockKeyhole, sibling: '/dashboard/devices', siblingLabel: 'دستگاه‌ها' }],
  ['/permissions', { label: 'دسترسی‌ها', family: 'security', description: 'کنترل نقش‌ها و سطح دسترسی در پلتفرم.', icon: ShieldCheck, sibling: '/dashboard/roles', siblingLabel: 'نقش‌ها' }],
  ['/users', { label: 'کاربران', family: 'people', description: 'مدیریت دسترسی و وضعیت کاربران پلتفرم.', icon: Landmark, sibling: '/dashboard/roles', siblingLabel: 'نقش‌ها' }],
];

const resolve = (path: string): Meta => {
  if (path === '/dashboard' || path.endsWith('/dashboard')) {
    return { label: 'مرکز فرمان', family: 'home', description: 'تصویر زنده‌ای از مهم‌ترین کارهایی که همین حالا نیاز به توجه دارند.', icon: BarChart3, header: 'none' };
  }

  const local = hasLocalHeader(path);
  for (const [match, meta] of META) {
    if (path.includes(match)) return { ...meta, header: local ? 'local' : 'route' };
  }

  return { label: 'فضای کاری', family: 'workspace', description: 'اطلاعات واقعی این مسیر، با تمرکز روی اقدام بعدی.', icon: BarChart3, header: local ? 'local' : 'route' };
};

export function RouteFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const meta = resolve(pathname);
  const Icon = meta.icon;
  const base = pathname.startsWith('/customer') ? '/customer/dashboard' : pathname.startsWith('/exchange') ? '/exchange/dashboard' : '/dashboard';
  const isHome = pathname === base;

  if (meta.header === 'none' || meta.header === 'local') {
    return <>{children}</>;
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
        <div className="route-frame__heading"><span className="route-frame__eyebrow">مرکز عملیات</span><h1 className="route-frame__title">{meta.label}</h1><p className="route-frame__description">{meta.description}</p></div>
        <div className="route-frame__tools"><span className="route-frame__state"><span className="route-frame__state-dot" aria-hidden /> داده زنده</span>{meta.sibling && <Link href={meta.sibling} className="route-frame__sibling">{meta.siblingLabel}<ArrowUpLeft aria-hidden size={14} /></Link>}</div>
      </header>
      <div className="route-frame__body">{children}</div>
    </div>
  );
}
