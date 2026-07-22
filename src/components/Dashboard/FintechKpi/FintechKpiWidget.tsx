'use client';

/**
 * FintechKpiWidget — 2026 Admin Fintech KPI Strip
 *
 * یک نوار KPI فین‌تکی برای ادمین‌ها در صفحه اصلی داشبورد.
 * - تراکنش‌های ۲۴ ساعت اخیر
 * - کاربران فعال (Customer)
 * - موارد باز fraud
 * - سرویس‌ریکوئست‌های در انتظار
 * - کل حجم معاملات (deals)
 */

import { ArrowLeftRight, ShieldAlert, Users, Wallet, Zap } from 'lucide-react';
import Link from 'next/link';
import s from './FintechKpiWidget.module.css';

export interface FintechKpiData {
  txn24h: number;
  activeCustomers: number;
  openFraudCases: number;
  pendingRequests: number;
  dealsVolume: number;
  dealsCurrency: string;
}

interface Props {
  data: FintechKpiData;
}

function formatVolume(n: number, currency: string): string {
  if (n >= 1_000_000)
    return `${new Intl.NumberFormat('fa-IR').format(Math.round(n / 1_000_000))} م ${currency}`;
  if (n >= 1_000)
    return `${new Intl.NumberFormat('fa-IR').format(Math.round(n / 1_000))} ه ${currency}`;
  return `${new Intl.NumberFormat('fa-IR').format(n)} ${currency}`;
}

const KPIS = (data: FintechKpiData) =>
  [
    {
      icon: ArrowLeftRight,
      label: 'تراکنش ۲۴ ساعت',
      value: new Intl.NumberFormat('fa-IR').format(data.txn24h),
      href: '/dashboard/audit-log',
      accent: 'progress',
    },
    {
      icon: Users,
      label: 'مشتریان فعال',
      value: new Intl.NumberFormat('fa-IR').format(data.activeCustomers),
      href: '/dashboard/users',
      accent: 'default',
    },
    {
      icon: ShieldAlert,
      label: 'موارد باز تقلب',
      value: new Intl.NumberFormat('fa-IR').format(data.openFraudCases),
      href: '/dashboard/fraud-review',
      accent: data.openFraudCases > 0 ? 'error' : 'success',
    },
    {
      icon: Zap,
      label: 'درخواست در انتظار',
      value: new Intl.NumberFormat('fa-IR').format(data.pendingRequests),
      href: '/dashboard/service-requests',
      accent: data.pendingRequests > 5 ? 'pending' : 'default',
    },
    {
      icon: Wallet,
      label: 'حجم معاملات',
      value: formatVolume(data.dealsVolume, data.dealsCurrency),
      href: '/dashboard/settlements',
      accent: 'success',
    },
  ] as const;

export function FintechKpiWidget({ data }: Props) {
  const kpis = KPIS(data);

  return (
    <section className={s.root} aria-label="شاخص‌های کلیدی فین‌تک">
      <div className={s.header}>
        <span className={s.eyebrow}>داشبورد فین‌تک</span>
        <Link href="/dashboard/wallet" className={s.viewAll}>
          مشاهده کیف پول
        </Link>
      </div>

      <div className={s.strip}>
        {kpis.map(({ icon: Icon, label, value, href, accent }, i) => {
          const accentClass =
            accent === 'progress'
              ? s.accentProgress
              : accent === 'error'
                ? s.accentError
                : accent === 'success'
                  ? s.accentSuccess
                  : accent === 'pending'
                    ? s.accentPending
                    : '';
          return (
            <Link
              key={label}
              href={href}
              className={s.kpiCard}
              style={{ animationDelay: `${i * 60}ms` }}
              aria-label={`${label}: ${value}`}
            >
              <span className={`${s.kpiIcon} ${accentClass}`} aria-hidden>
                <Icon size={18} />
              </span>
              <span className={s.kpiVal}>{value}</span>
              <span className={s.kpiLabel}>{label}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
