'use client';

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

/**
 * MenuBar — دکمه‌ی منوی موبایل (نازک — بدون headlessui).
 *
 * 2026-08-15 TBT fix: دراور سنگین (headlessui Transition + NavMobile) به
 * `MenuDrawer` منتقل شد و lazy-lod می‌شود — فقط وقتی کاربر منو را باز می‌کند.
 * قبلاً `@headlessui/react` (~۱۰۹KB) در first-load همه‌ی صفحات site بود و
 * TBT/LCP را بالا می‌برد (Lighthouse prod: home TBT 1,090ms). الگوی
 * SearchModalLazy — هزینه‌ی modal فقط با interaction پرداخت می‌شود.
 */
const LazyMenuDrawer = dynamic(() => import('./MenuDrawer'), {
  ssr: false,
});

interface MenuBarProps {
  className?: string;
}

const MenuBar = ({ className }: MenuBarProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const pathname = usePathname();
  useEffect(() => {
    setIsVisible(false);
  }, [pathname]);

  const handleToggleMenu = useCallback(() => {
    setIsVisible((prev) => !prev);
  }, []);

  const menuIcon = useMemo(
    () => (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-7 w-7"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
          clipRule="evenodd"
        />
      </svg>
    ),
    [],
  );

  return (
    <div className={className}>
      <button
        type="button"
        onClick={handleToggleMenu}
        className="p-2.5 rounded-lg text-neutral-700 dark:text-neutral-300 focus:outline-none flex items-center justify-center"
        aria-label="Toggle menu"
        aria-expanded={isVisible}
        aria-controls="mobile-menu"
      >
        {menuIcon}
      </button>

      {isVisible && <LazyMenuDrawer onClose={handleToggleMenu} />}
    </div>
  );
};

export default MenuBar;
