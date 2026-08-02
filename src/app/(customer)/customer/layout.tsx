/**
 * layout.tsx — Customer Portal
 *
 * دسترسی:
 *   - CUSTOMER / TEST_CUSTOMER / MERCHANT: Customer record خودشان
 *   - OWNER / SUPERADMIN / ADMIN پلتفرم: می‌توانند وارد شوند (برای پشتیبانی)
 *     ← این نقش‌ها در DashboardProviders به CUSTOMER resolve می‌شوند تا
 *       منوی customer portal را ببینند، نه منوی ادمین.
 *   - بقیه: redirect به /
 *
 * Tenant isolation: customerId از DB resolve می‌شود، نه از JWT.
 * Security: portal='customer' به DashboardProviders می‌گوید که platform admins
 * باید منوی CUSTOMER دریافت کنند و keyboard shortcuts ادمین غیرفعال باشند.
 *
 * Admin Customer Switcher:
 *   وقتی ادمین وارد customer portal می‌شود، یک نوار شیشه‌ای بالای صفحه
 *   نمایش داده می‌شود که مشتری فعلی (impersonation target) و یک popover
 *   برای تغییر آن را نشان می‌دهد. پشتیبانی از cookie `admin_customer_ctx`.
 */
// dashboard.css is intentionally shared across all three portals (admin/customer/exchange).
// It contains the CSS custom properties and layout classes that all portal shells use.
// Changes to this file will affect all portals — do not add portal-specific rules here.
import '@/app/dashboard/dashboard.css';
import { getCustomerProfile } from '@/actions/customer-portal';
import { auth } from '@/auth';

// auth() + cookies() are request-time APIs — without this the route flips
// static→dynamic at runtime and 500s.
export const dynamic = 'force-dynamic';
import { AdminCustomerSwitcher } from '@/components/Dashboard/DashboardPage/AdminCustomerSwitcher';
import { DashboardProviders } from '@/components/Dashboard/DashboardPage/DashboardProviders';
import { SiteSettingsProvider } from '@/components/SiteSettingsProvider';
import { getSystemSettingsData } from '@/data/getSystemSettings';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';

const PLATFORM_ADMINS = new Set(['OWNER', 'SUPERADMIN', 'ADMIN']);
const ADMIN_CUSTOMER_COOKIE = 'admin_customer_ctx';

export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/auth?callbackUrl=/customer/dashboard');
  }

  const { user } = session;
  const role = user.role as string;
  const isPlatformAdmin = PLATFORM_ADMINS.has(role);

  const [profile, settings] = await Promise.all([getCustomerProfile(), getSystemSettingsData()]);

  if (!profile) {
    if (isPlatformAdmin) {
      redirect('/dashboard');
    }
    // H3-fix (2026-08-01): نقش USER (کاربر تازه‌ثبت‌نام) که هنوز Customer
    // record ندارد — قبلاً به /auth redirect می‌شد که برای کاربر لاگین‌شده
    // گیج‌کننده بود (layout/auth → middleware bounce → حلقه). حالا به فرم
    // ثبت درخواست سرویس عمومی می‌رویم تا کاربر بتواند همان‌جا سفارش دهد
    // بدون نیاز به پورتال مشتری. اگر از مبدل ارز آمده باشد (?action=exchange)
    // همان #contact مقصد است.
    redirect('/money-transfer#contact');
  }

  // برای ادمین: بررسی کن آیا explicit یک مشتری خاص را انتخاب کرده
  // (در این صورت، popover "انتخاب دستی" را نشان می‌دهد)
  const cookieStore = await cookies();
  const hasExplicitCustomer = isPlatformAdmin && !!cookieStore.get(ADMIN_CUSTOMER_COOKIE)?.value;

  return (
    <SiteSettingsProvider
      initialSettings={{
        siteName: settings.siteName,
        siteDescription: settings.siteDescription,
        logoUrl: settings.logoUrl,
      }}
    >
      {isPlatformAdmin && (
        <AdminCustomerSwitcher
          currentCustomerId={profile.id}
          currentCustomerName={profile.fullName}
          currentExchangeName={profile.exchange.name}
          isImpersonating={hasExplicitCustomer}
        />
      )}
      <Suspense fallback={null}>
        <DashboardProviders userRole={role} portal="customer">
          {children}
        </DashboardProviders>
      </Suspense>
    </SiteSettingsProvider>
  );
}
