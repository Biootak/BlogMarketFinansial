'use client';

import { AlertTriangle, Database, Gauge, Layers, Radar, ScrollText } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { faNum } from './format';
import { useObs } from './ObsProvider';
import s from './obs.module.css';

const BASE = '/dashboard/observability';

const ITEMS = [
  { segment: '', label: 'نمای کلی', icon: Radar },
  { segment: '/services', label: 'سرویس‌ها', icon: Layers },
  { segment: '/errors', label: 'خطاها', icon: AlertTriangle },
  { segment: '/latency', label: 'تأخیر', icon: Gauge },
  { segment: '/queries', label: 'کوئری کند', icon: Database },
  { segment: '/audit', label: 'رد ممیزی', icon: ScrollText },
] as const;

/**
 * ناوبری فرعی — segmented rail.
 *
 * نشانگر فعال یک هیرلاین است که با `transform: scaleX` باز می‌شود، نه یک نوار
 * جداگانه که با JS اندازه‌گیری شود؛ پس هیچ measure/resize-observer نداریم و
 * حرکت فقط روی transform است.
 *
 * روی موبایل اسکرول افقی با scroll-snap دارد و هر قلم هدف لمسی ۴۴px می‌گیرد.
 * شمارنده‌ها عدد واقعی snapshot‌اند: اگر صفر باشند اصلاً رندر نمی‌شوند تا نوار
 * پر از «۰» نشود.
 */
export function ObsSubNav() {
  const pathname = usePathname();
  const { data } = useObs();

  const unhealthy = (data?.services ?? []).filter(
    (service) => service.status === 'down' || service.status === 'degraded',
  ).length;

  const counts: Record<string, { value: number; tone: 'bad' | 'warn' | 'idle' } | undefined> = {
    '/services': { value: unhealthy, tone: unhealthy > 0 ? 'bad' : 'idle' },
    '/errors': { value: data?.totals.errors ?? 0, tone: (data?.totals.errors ?? 0) > 0 ? 'bad' : 'idle' },
    '/latency': {
      value: data?.performance.latencySamples ?? 0,
      tone: data?.performance.latencySource === 'measured' ? 'idle' : 'warn',
    },
    '/queries': { value: data?.slowQueries.length ?? 0, tone: 'idle' },
    '/audit': { value: data?.totals.audit ?? 0, tone: 'idle' },
  };

  return (
    <nav className={s.nav} aria-label="بخش‌های مشاهده‌پذیری">
      <ul className={s.navList}>
        {ITEMS.map(({ segment, label, icon: Icon }) => {
          const href = `${BASE}${segment}`;
          const active = segment === '' ? pathname === BASE : pathname.startsWith(href);
          const count = counts[segment];

          return (
            <li key={href} className={s.navItem}>
              <Link
                href={href}
                className={s.navLink}
                data-active={active}
                aria-current={active ? 'page' : undefined}
              >
                <Icon size={16} strokeWidth={1.5} className={s.navIcon} aria-hidden="true" />
                <span className={s.navLabel}>{label}</span>
                {count && count.value > 0 ? (
                  <span className={s.navCount} data-tone={count.tone}>
                    {faNum(count.value)}
                  </span>
                ) : null}
                <span className={s.navUnderline} aria-hidden="true" />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
