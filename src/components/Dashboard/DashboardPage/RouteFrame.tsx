'use client';

import { ArrowLeft, BarChart3, FileCheck2, Landmark, LifeBuoy, LockKeyhole, Settings2, ShieldCheck, WalletCards } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

const ROUTE_META: Array<{ match: string; label: string; family: string; description: string; icon: typeof BarChart3 }> = [
  { match: '/observability', label: 'مشاهده‌پذیری', family: 'observe', description: 'سلامت سرویس‌ها، latency و رویدادهای زنده در یک نمای عملیاتی.', icon: BarChart3 },
  { match: '/reports', label: 'گزارش‌ها', family: 'reports', description: 'گزارش‌های قابل اتکا برای تصمیم‌های مالی و عملیاتی.', icon: BarChart3 },
  { match: '/audit-log', label: 'لاگ ممیزی', family: 'risk', description: 'ردپای تغییرات و رویدادهای حساس سیستم.', icon: ShieldCheck },
  { match: '/fraud-review', label: 'بررسی ریسک', family: 'risk', description: 'صف بررسی موارد مشکوک، بدون داده ساختگی.', icon: ShieldCheck },
  { match: '/kyc', label: 'احراز هویت', family: 'identity', description: 'بررسی وضعیت هویت و مدارک با مسیر شفاف.', icon: FileCheck2 },
  { match: '/kyc-review', label: 'صف احراز هویت', family: 'identity', description: 'مدیریت پرونده‌های احراز هویت در انتظار اقدام.', icon: FileCheck2 },
  { match: '/transfer', label: 'انتقال وجه', family: 'money', description: 'جریان انتقال، ارائه‌دهنده و وضعیت تسویه.', icon: WalletCards },
  { match: '/settlement', label: 'تسویه', family: 'money', description: 'کنترل چرخه‌های تسویه و مغایرت‌ها.', icon: Landmark },
  { match: '/wallet', label: 'کیف پول', family: 'money', description: 'موجودی‌ها و حرکت‌های مالی حساب.', icon: WalletCards },
  { match: '/customers', label: 'مشتری‌ها', family: 'people', description: 'نمای عملیاتی مشتری‌ها، درخواست‌ها و وضعیت حساب.', icon: Landmark },
  { match: '/users', label: 'کاربران', family: 'people', description: 'مدیریت دسترسی و وضعیت کاربران پلتفرم.', icon: Landmark },
  { match: '/settings', label: 'تنظیمات', family: 'settings', description: 'تنظیمات این پورتال، بدون خروج از جریان کاری.', icon: Settings2 },
  { match: '/security', label: 'امنیت', family: 'security', description: 'دستگاه‌ها، نشست‌ها و کنترل‌های امنیتی.', icon: LockKeyhole },
  { match: '/devices', label: 'دستگاه‌ها', family: 'security', description: 'دستگاه‌های متصل و نشست‌های فعال.', icon: LockKeyhole },
  { match: '/helpdesk', label: 'پشتیبانی', family: 'support', description: 'درخواست‌های پشتیبانی و پیگیری پاسخ‌ها.', icon: LifeBuoy },
];

function getMeta(pathname: string) {
  const meta = ROUTE_META.find((item) => pathname.includes(item.match));
  if (meta) return meta;
  if (pathname === '/dashboard' || pathname.endsWith('/dashboard')) {
    return { label: 'مرکز فرمان', family: 'home', description: 'تصویر زنده‌ای از مهم‌ترین کارهایی که همین حالا نیاز به توجه دارند.', icon: BarChart3 };
  }
  return { label: 'فضای کاری', family: 'workspace', description: 'اطلاعات واقعی این مسیر، با تمرکز روی اقدام بعدی.', icon: BarChart3 };
}

export function RouteFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const meta = getMeta(pathname);
  const Icon = meta.icon;
  const backHref = pathname.startsWith('/customer') ? '/customer/dashboard' : pathname.startsWith('/exchange') ? '/exchange/dashboard' : '/dashboard';
  const isHome = pathname === backHref;

  return (
    <div className="route-frame" data-route-family={meta.family} data-route-path={pathname}>
      {!isHome && (
        <div className="route-frame__backline">
          <Link href={backHref} className="route-frame__back"><ArrowLeft aria-hidden size={14} /><span>بازگشت به مرکز فرمان</span></Link>
          <span className="route-frame__path" dir="ltr">{pathname}</span>
        </div>
      )}
      <header className="route-frame__header">
        <div className="route-frame__mark" aria-hidden><Icon size={20} strokeWidth={1.7} /></div>
        <div className="route-frame__heading">
          <span className="route-frame__eyebrow">{isHome ? 'Operational view' : 'Route workspace'}</span>
          <h1 className="route-frame__title">{meta.label}</h1>
          <p className="route-frame__description">{meta.description}</p>
        </div>
        <span className="route-frame__state"><span className="route-frame__state-dot" aria-hidden /> داده زنده</span>
      </header>
      <div className="route-frame__body">{children}</div>
    </div>
  );
}
