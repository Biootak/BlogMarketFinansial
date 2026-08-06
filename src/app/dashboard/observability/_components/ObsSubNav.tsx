'use client';

import { AlertTriangle, Database, Gauge, Layers, Radar, ScrollText } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { faNum } from './format';
import { useObs } from './ObsProvider';
import s from './command.module.css';

const BASE = '/dashboard/observability';
const ITEMS = [
  { segment: '', label: 'نمای کلی', icon: Radar },
  { segment: '/services', label: 'سرویس‌ها', icon: Layers },
  { segment: '/errors', label: 'خطاها', icon: AlertTriangle },
  { segment: '/latency', label: 'تأخیر', icon: Gauge },
  { segment: '/queries', label: 'کوئری کند', icon: Database },
  { segment: '/audit', label: 'رد ممیزی', icon: ScrollText },
] as const;

export function ObsSubNav() {
  const pathname = usePathname();
  const { data } = useObs();
  const unhealthy = (data?.services ?? []).filter((service) => service.status === 'down' || service.status === 'degraded').length;
  const counts: Record<string, { value: number; alarming: boolean } | undefined> = {
    '/services': { value: unhealthy, alarming: unhealthy > 0 },
    '/errors': { value: data?.totals.errors ?? 0, alarming: (data?.totals.errors ?? 0) > 0 },
    '/queries': { value: data?.slowQueries.length ?? 0, alarming: false },
    '/audit': { value: data?.totals.audit ?? 0, alarming: false },
  };

  return <nav className={s.nav} aria-label="بخش‌های مشاهده‌پذیری"><span className={s.navLabel}>نمای عملیاتی</span><ul className={s.navList}>{ITEMS.map(({ segment, label, icon: Icon }) => { const href = `${BASE}${segment}`; const active = segment === '' ? pathname === BASE : pathname.startsWith(href); const count = counts[segment]; return <li key={href}><Link href={href} className={s.navLink} aria-current={active ? 'page' : undefined}><Icon size={16} strokeWidth={1.7} aria-hidden /><span>{label}</span>{count && count.value > 0 ? <span className={s.navCount} data-tone={count.alarming ? 'bad' : 'idle'}>{faNum(count.value)}</span> : null}</Link></li>; })}</ul></nav>;
}
