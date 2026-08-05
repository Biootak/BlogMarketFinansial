'use client';

/**
 * SettingsSubNavHost — wrapper client component برای SettingsSubNav که
 * به‌صورت خودکار activeKey را از URL فعلی تشخیص می‌دهد.
 *
 *   این الگو لازم است چون usePathname فقط در client component قابل
 *   استفاده است، ولی SettingsSubNav primitive باید server-friendly
 *   بماند تا در page.tsx های مختلف قابل استفاده باشد.
 */

import { SettingsSubNav, type SettingsSubNavItem } from './SettingsSubNav';
import { usePathname } from 'next/navigation';

const KEY_MAP: ReadonlyArray<{ test: RegExp; key: string }> = [
  { test: /^\/exchange\/settings\/operations\/?$/, key: 'operations' },
  { test: /^\/exchange\/settings\/working-hours\/?$/, key: 'hours' },
  { test: /^\/exchange\/settings\/security\/?$/, key: 'security' },
  { test: /^\/exchange\/profile\/?$/, key: 'identity' },
];

export function SettingsSubNavHost({ items }: { items: SettingsSubNavItem[] }) {
  const pathname = usePathname() ?? '/exchange/settings';

  let activeKey: string | undefined;
  for (const m of KEY_MAP) {
    if (m.test.test(pathname)) {
      activeKey = m.key;
      break;
    }
  }
  if (!activeKey && pathname === '/exchange/settings') activeKey = 'overview';

  return <SettingsSubNav items={items} activeKey={activeKey} />;
}
