'use client';

/**
 * LiveOpsPulseDemo — نمونه داده برای LiveOpsPulse
 * ─────────────────────────────────────────────────────────────
 *  این فایل فقط داده‌های نمونه را نگه می‌دارد تا کامپوننت اصلی
 *  (LiveOpsPulse.tsx) کوچک بماند. در فاز بعدی می‌توان با داده‌های
 *  واقعی از سرویس‌ها جایگزین شود.
 */

import { Database, Globe2, HardDrive, type LucideIcon, ShieldCheck, Wifi, Zap } from 'lucide-react';
import { type LiveOpsEvent, LiveOpsPulse, type LiveOpsService } from './LiveOpsPulse';

export function LiveOpsPulseDemo() {
  const now = Date.now();
  const services: LiveOpsService[] = [
    {
      id: 'api',
      name: 'API اصلی',
      desc: 'درگاه REST و GraphQL',
      icon: Globe2 as unknown as LucideIcon,
      status: 'healthy',
      latencyMs: 84,
      href: '/dashboard',
    },
    {
      id: 'db',
      name: 'پایگاه داده',
      desc: 'Postgres اصلی + رپلیکا',
      icon: Database as unknown as LucideIcon,
      status: 'healthy',
      latencyMs: 12,
      href: '/dashboard',
    },
    {
      id: 'cache',
      name: 'کش توزیع‌شده',
      desc: 'Redis cluster',
      icon: HardDrive as unknown as LucideIcon,
      status: 'degraded',
      latencyMs: 142,
      href: '/dashboard/settings',
    },
    {
      id: 'queue',
      name: 'صف پیام',
      desc: 'Workers و cron jobs',
      icon: Zap as unknown as LucideIcon,
      status: 'healthy',
      latencyMs: 23,
      href: '/dashboard',
    },
    {
      id: 'auth',
      name: 'احراز هویت',
      desc: 'NextAuth v5 + OAuth',
      icon: ShieldCheck as unknown as LucideIcon,
      status: 'healthy',
      latencyMs: 56,
      href: '/dashboard',
    },
    {
      id: 'edge',
      name: 'Edge / CDN',
      desc: 'پاسخ‌گویی لبه',
      icon: Wifi as unknown as LucideIcon,
      status: 'idle',
      latencyMs: 9,
      href: '/dashboard',
    },
  ];

  const events: LiveOpsEvent[] = [
    {
      id: '1',
      type: 'deposit',
      actor: 'علی محمدی',
      detail: 'واریز از درگاه بانکی',
      amount: { value: 4_500_000, currency: 'IRR' },
      timestamp: now - 12_000,
    },
    {
      id: '2',
      type: 'kyc',
      actor: 'مریم احمدی',
      detail: 'تأیید سطح ۲ مدارک',
      timestamp: now - 38_000,
    },
    {
      id: '3',
      type: 'order',
      actor: 'صرافی پارس',
      detail: 'سفارش خرید USDT',
      amount: { value: 250, currency: 'USDT' },
      timestamp: now - 75_000,
    },
    {
      id: '4',
      type: 'fraud',
      actor: 'سیستم ریسک',
      detail: 'تشخیص ۲ تراکنش مشکوک',
      timestamp: now - 142_000,
    },
    {
      id: '5',
      type: 'withdraw',
      actor: 'حسین رضایی',
      detail: 'برداشت به کارت بانکی',
      amount: { value: 1_200_000, currency: 'IRR' },
      timestamp: now - 218_000,
    },
    {
      id: '6',
      type: 'auth',
      actor: 'ادمین جدید',
      detail: 'ورود از دستگاه جدید',
      timestamp: now - 360_000,
    },
  ];

  return (
    <LiveOpsPulse
      services={services}
      events={events}
      pollIntervalMs={2200}
      activityBars={[
        12, 18, 22, 30, 25, 38, 55, 62, 58, 70, 82, 78, 65, 72, 88, 92, 85, 74, 68, 60, 50, 42, 30,
        22,
      ]}
    />
  );
}

export default LiveOpsPulseDemo;
