'use client';

/**
 * ObservabilityNav — ناوبری فرعی مرکز پایش.
 *
 *  تب‌های داخل صفحه به مسیر واقعی تبدیل شدند: هر بخش قابل bookmark و
 *  deep-link است و فقط کد همان بخش دانلود می‌شود (code-split).
 */

import { AlertTriangle, Database, Gauge, Radio } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import s from './ObservabilityNav.module.css';

const ROOT = '/dashboard/observability';

interface NavItem {
  key: string;
  href: string;
  label: string;
  hint: string;
  icon: LucideIcon;
}

const ITEMS: NavItem[] = [
  { key: 'overview', href: ROOT, label: 'نمای کلی', hint: 'خط زمان رویداد و سرویس‌ها', icon: Radio },
  {
    key: 'errors',
    href: `${ROOT}/errors`,
    label: 'خطا و رخداد',
    hint: 'جریان خطا، incident، رد ممیزی',
    icon: AlertTriangle,
  },
  {
    key: 'latency',
    href: `${ROOT}/latency`,
    label: 'تأخیر',
    hint: 'صدک‌ها و کارایی هر سرویس',
    icon: Gauge,
  },
  {
    key: 'queries',
    href: `${ROOT}/queries`,
    label: 'کوئری کند',
    hint: 'لاگ‌های duration و منابع پرحجم',
    icon: Database,
  },
];

export function ObservabilityNav() {
  const pathname = usePathname();

  return (
    <nav className={s.nav} aria-label="بخش‌های مرکز پایش">
      <ul className={s.list}>
        {ITEMS.map((item) => {
          const active = item.href === ROOT ? pathname === ROOT : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <li key={item.key} className={s.item}>
              <Link
                href={item.href}
                className={s.link}
                data-active={active}
                aria-current={active ? 'page' : undefined}
              >
                <span className={s.chip} aria-hidden>
                  <Icon size={15} strokeWidth={1.75} />
                </span>
                <span className={s.label}>{item.label}</span>
                <span className={s.hint}>{item.hint}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
