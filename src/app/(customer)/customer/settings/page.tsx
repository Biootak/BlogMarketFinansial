/**
 * /customer/settings — تنظیمات حساب مشتری
 *
 * 2026-07-29: علاوه بر profile، اکنون overview امنیتی نیز پاس داده می‌شه تا
 * toggleها (notifyVoice, monthlyActivityReport, shareWithExchange) با مقدار
 * واقعی از DB رندر شوند (نه فقط optimistic از کلاینت).
 */
import { getCustomerProfile, getMySecurityOverview } from '@/actions/customer-portal';
import { auth } from '@/auth';
import { PageHeader } from '@/components/Dashboard/primitives';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import SettingsContent from './_components/SettingsContent';

export const metadata: Metadata = {
  title: 'تنظیمات',
  description: 'مدیریت تنظیمات و امنیت حساب',
};

export const dynamic = 'force-dynamic';

export default async function CustomerSettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/auth?callbackUrl=/customer/settings');

  const profile = await getCustomerProfile();
  if (!profile) redirect('/');

  const overview = await getMySecurityOverview();
  const prefs = overview.success
    ? {
        notifyVoice: overview.data.notifyVoice,
        monthlyActivityReport: overview.data.monthlyActivityReport,
        shareWithExchange: overview.data.shareWithExchange,
      }
    : { notifyVoice: false, monthlyActivityReport: false, shareWithExchange: false };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-6)' }}>
      <PageHeader
        title="تنظیمات"
        description="مدیریت امنیت و اطلاعات حساب"
        breadcrumb={[{ label: 'پورتال مشتری' }, { label: 'تنظیمات' }]}
        icon="settings"
      />
      <SettingsContent profile={profile} prefs={prefs} />
    </div>
  );
}
