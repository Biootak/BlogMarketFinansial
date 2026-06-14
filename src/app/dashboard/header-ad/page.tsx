import { checkAdmin } from '@/lib/auth';
import {
  getAllHeaderAds,
} from '@/actions/headerAdActions';
import HeaderAdsClient from './HeaderAdsClient';

/**
 * صفحه مدیریت تبلیغ هدر — نسخه سرور
 *
 *  - checkAdmin → فقط ADMIN و SUPER_ADMIN
 *  - getAllHeaderAds → لیست همه تبلیغات
 *  - تحویل به کلاینت کامپوننت برای UI پویا
 *
 *  ۲۰۲۶-۰۶-۱۴: هماهنگ با /dashboard/advertisements
 */
export default async function HeaderAdsPage() {
  await checkAdmin();
  const result = await getAllHeaderAds();
  const ads = (result.success && result.data ? result.data : []) as Array<{
    id: string;
    text: string;
    subtext?: string | null;
    ctaLabel?: string | null;
    ctaHref?: string | null;
    imageUrl?: string | null;
    href?: string | null;
    variant: 'TEXT' | 'IMAGE' | 'MIXED';
    theme: 'PRIMARY' | 'ACCENT' | 'NEUTRAL' | 'DARK' | 'GRADIENT';
    isActive: boolean;
    priority: number;
    startDate?: string | null;
    endDate?: string | null;
    createdAt: string;
    updatedAt: string;
  }>;

  return <HeaderAdsClient initialAds={ads} />;
}
