'use client';

import { AlertTriangle, Database, Gauge, Layers, Radar, ScrollText } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { faNum } from './format';
import { useObs } from './ObsProvider';
import n from './ObservabilityNav.module.css';

const BASE = '/dashboard/observability';

const ITEMS = [
  { segment: '', label: 'نمای کلی', icon: Radar },
  { segment: '/services', label: 'سرویس‌ها', icon: Layers },
  { segment: '/errors', label: 'خطاها', icon: AlertTriangle },
  { segment: '/latency', label: 'تأخیر', icon: Gauge },
  { segment: '/queries', label: 'کوئری کند', icon: Database },
  { segment: '/audit', label: 'رد ممیزی', icon: ScrollText },
] as const;

interface Badge {
  value: number;
  tone: 'bad' | 'warn' | 'idle';
}

/**
 * ریل مدخل‌ها.
 *
 * نشانگر فعال یک خط مویی زیر تب است، نه قرص رنگی. دلیلش ساده است: در یک صفحه
 * که همه‌ی رنگ‌هایش معنای وضعیت دارند، یک قرص رنگی برای «تب باز» رنگ را از
 * معنا تهی می‌کند. خط زیرین همان کار را می‌کند و رنگ را برای خطا نگه می‌دارد.
 *
 * شمارنده‌ها واقعی‌اند و از snapshot می‌آیند؛ صفر اصلاً رندر نمی‌شود چون
 * «۰ خطا» به‌شکل بج، نویز است نه اطلاعات.
 */
export function ObsSubNav() {
  const pathname = usePathname();
  const { data } = useObs();

  const unhealthy = (data?.services ?? []).filter(
    (service) => service.status === 'down' || service.status === 'degraded',
  ).length;
  const errors = data?.totals.errors ?? 0;
  const slow = data?.slowQueries.length ?? 0;
  const audit = data?.totals.audit ?? 0;

  const badges: Record<string, Badge | undefined> = {
    '/services': { value: unhealthy, tone: unhealthy > 0 ? 'bad' : 'idle' },
    '/errors': { value: errors, tone: errors > 0 ? 'bad' : 'idle' },
    '/queries': { value: slow, tone: slow > 0 ? 'warn' : 'idle' },
    '/audit': { value: audit, tone: 'idle' },
  };

  return (
    <nav className={n.nav} aria-label="مدخل‌های مشاهده‌پذیری">
      <span className={n.label}>مدخل</span>
      <ul className={n.list}>
        {ITEMS.map(({ segment, label, icon: Icon }) => {
          const href = `${BASE}${segment}`;
          const active = segment === '' ? pathname === BASE : pathname.startsWith(href);
          const badge = badges[segment];

          return (
            <li key={href}>
              <Link
                href={href}
                className={n.link}
                aria-current={active ? 'page' : undefined}
                data-active={active ? 'true' : undefined}
              >
                <Icon size={15} strokeWidth={1.7} aria-hidden="true" />
                <span>{label}</span>
                {badge && badge.value > 0 ? (
                  <span className={n.badge} data-tone={badge.tone}>
                    {faNum(badge.value)}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
