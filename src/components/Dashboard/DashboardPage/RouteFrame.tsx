'use client';

import { ArrowLeft, ArrowUpLeft, BarChart3, FileCheck2, Landmark, LifeBuoy, LockKeyhole, Radar, Settings2, ShieldCheck, WalletCards } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

type Meta = { label: string; family: string; description: string; icon: typeof BarChart3; sibling?: string; siblingLabel?: string };

/*
 * این جدول تنها منبع تیتر هر مسیر داشبورد است. هیچ صفحه‌ای نباید تیتر دومی
 * (PageHeader و مانند آن) بالای محتوای خودش بگذارد — نتیجه‌اش دو h1 روی یک
 * صفحه است که هم تکراری دیده می‌شود هم ساختار heading را برای screen reader
 * می‌شکند. اگر متن یک مسیر نارسا است، همین‌جا اصلاحش کن.
 */
const META: Array<[string, Meta]> = [
  ['/observability', { label: 'مرکز مشاهده‌پذیری', family: 'observe', description: 'سلامت سرویس‌ها، تأخیر، خطا و رد ممیزی — هر عدد مستقیم از SystemLog و AuditLog خوانده می‌شود.', icon: Radar, sibling: '/dashboard/observability/services', siblingLabel: 'سرویس‌ها' }],
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

  return (
    <div className="route-frame" data-route-family={meta.family} data-route-path={pathname}>
      <div className="route-frame__utility" aria-label="زمینه مسیر">
        <span className="route-frame__breadcrumb"><span className="route-frame__breadcrumb-dot" aria-hidden /> {isHome ? 'مرکز فرمان' : 'فضای کاری'}</span>
        {!isHome && <Link href={base} className="route-frame__back"><ArrowLeft aria-hidden size={14} /> بازگشت</Link>}
        <span className="route-frame__path" dir="ltr">{pathname}</span>
      </div>
      <header className="route-frame__header">
        <div className="route-frame__mark" aria-hidden><Icon size={21} strokeWidth={1.7} /></div>
        <div className="route-frame__heading"><span className="route-frame__eyebrow">{meta.family === 'home' ? 'مرکز فرمان' : 'مرکز عملیات'}</span><h1 className="route-frame__title">{meta.label}</h1><p className="route-frame__description">{meta.description}</p></div>
        <div className="route-frame__tools"><span className="route-frame__state"><span className="route-frame__state-dot" aria-hidden /> داده زنده</span>{meta.sibling && <Link href={meta.sibling} className="route-frame__sibling">{meta.siblingLabel}<ArrowUpLeft aria-hidden size={14} /></Link>}</div>
      </header>
      <div className="route-frame__body">{children}</div>
    </div>
  );
}
