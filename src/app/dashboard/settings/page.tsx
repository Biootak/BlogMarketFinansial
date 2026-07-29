import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { getSystemSettingsData } from '@/data/getSystemSettings';
import { SettingsHub } from './_components/SettingsHub';

// ── metadata ──────────────────────────────────────────────────────────────

export const metadata = {
  title: 'تنظیمات سیستم — داشبورد',
  description: 'پیکربندی هویت سایت، ارتباطات، امنیت و نگهداری',
};

// ── force dynamic — never cache this page ─────────────────────────────────
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// ── page ──────────────────────────────────────────────────────────────────

export default async function SettingsPage() {
  const session = await auth();
  const role = session?.user?.role;
  if (!session?.user) redirect('/login');
  if (role !== 'ADMIN' && role !== 'OWNER' && role !== 'SUPERADMIN') {
    redirect('/dashboard');
  }

  const settings = await getSystemSettingsData().catch(() => null);

  // بعضی فیلدها (smtp) ممکن است در SiteSettings interface نباشند
  // اما در DB موجود باشند — با Reflect.get می‌خوانیم تا ایمن باشد.
  const pickStr = (key: string): string =>
    typeof (settings as unknown as Record<string, unknown> | null)?.[key] === 'string'
      ? ((settings as unknown as Record<string, string>)[key] ?? '')
      : '';

  // normalize the data shape — never let DB failure crash the page
  const data = {
    siteName: settings?.siteName ?? 'financialmarket.page',
    siteDescription:
      settings?.siteDescription ?? 'بازار صرافی‌های افغانستان — نرخ لحظه‌ای افغانی',
    siteUrl: settings?.siteUrl ?? 'https://financialmarket.page',
    contactEmail: settings?.contactEmail ?? 'contact@financialmarket.page',
    contactPhone: settings?.contactPhone ?? '',
    contactAddress: settings?.contactAddress ?? '',
    logoUrl: settings?.logoUrl ?? '',
    smtpServer: pickStr('smtpServer'),
    smtpPort: pickStr('smtpPort') || '587',
    smtpUsername: pickStr('smtpUsername'),
    smtpPassword: pickStr('smtpPassword'),
    maintenanceMode: settings?.maintenanceMode ?? false,
    maintenanceMessage: settings?.maintenanceMessage ?? '',
    cacheEnabled: settings?.cacheEnabled ?? true,
  };

  return <SettingsHub initialData={data} />;
}
