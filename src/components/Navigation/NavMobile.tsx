'use client';

/**
 * NavMobile — linear.app × stripe.com
 *
 * - Smooth accordion panels (height auto-animated) instead of `display:none`.
 * - Staggered entry on mount for the search box, socials, and list.
 * - Reduced-motion friendly: heights are set instantly.
 * - Renders a server-friendly `nav` landmark with a labelled dialog region.
 */

import type React from 'react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import ButtonClose from '@/components/ButtonClose/ButtonClose';
import Logo from '@/components/Logo/Logo';
import { Disclosure } from '@/app/headlessui';
import ClientSocialLinks from '@/components/SocialsList/ClientSocialLinks';
import SwitchDarkMode from '@/components/SwitchDarkMode/SwitchDarkMode';
import Link from 'next/link';
import {
  STRIPE_EASE,
  STRIPE_EASE_SOFT,
  accordionPanel,
  staggerContainer,
  staggerItem,
} from '@/lib/motion';

export interface NavMobileProps {
  onClickClose?: () => void;
}

type MobileNavItem = {
  id: string;
  href: string;
  name: string;
  subItems?: Array<{ id: string; href: string; name: string }>;
};

const NAVBAR_LINKS: readonly MobileNavItem[] = [
  { id: 'urgent', name: 'اخبار فوری', href: '/archive/category/news-urgent' },
  { id: 'home', name: 'صفحه اصلی', href: '/' },
  {
    id: 'crypto',
    name: 'ارزهای دیجیتال',
    href: '/archive/category/crypto',
    subItems: [
      { id: 'crypto-urgent', name: 'اخبار فوری', href: '/archive/category/crypto/news-urgent' },
      { id: 'crypto-analysis', name: 'تحلیل', href: '/archive/category/crypto/analysis' },
      { id: 'crypto-education', name: 'آموزش', href: '/archive/category/crypto/education' },
    ],
  },
  {
    id: 'gold',
    name: 'طلا (اونس)',
    href: '/archive/category/gold',
    subItems: [
      { id: 'gold-news', name: 'اخبار طلا', href: '/archive/category/gold/news' },
      { id: 'gold-analysis', name: 'تحلیل', href: '/archive/category/gold/analysis' },
      { id: 'gold-global', name: 'بازار جهانی', href: '/archive/category/gold/global' },
    ],
  },
  {
    id: 'global-market',
    name: 'بازار جهانی',
    href: '/archive/category/global-market',
    subItems: [
      {
        id: 'currency-pairs',
        name: 'جفت ارزها',
        href: '/archive/category/global-market/currency-pairs',
      },
      { id: 'global-analysis', name: 'تحلیل', href: '/archive/category/global-market/analysis' },
      {
        id: 'global-education',
        name: 'آموزش',
        href: '/archive/category/global-market/education',
      },
    ],
  },
  { id: 'stock', name: 'بورس و سهام', href: '/archive/category/stock' },
  { id: 'political-news', name: 'اخبار سیاسی', href: '/archive/category/political-news' },
  { id: 'money-transfer', name: 'حواله', href: '/money-transfer' },
  { id: 'online-payment', name: 'پرداخت آنلاین', href: '/online-payment' },
  { id: 'terms', name: 'قوانین', href: '/terms' },
] as const;

const MagnifyingGlassIcon = (
  <svg
    aria-hidden
    width={18}
    height={18}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M11.5 21C16.7467 21 21 16.7467 21 11.5C21 6.25329 16.7467 2 11.5 2C6.25329 2 2 6.25329 2 11.5C2 16.7467 6.25329 21 11.5 21Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M22 22L20 20"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const NavMobile: React.FC<NavMobileProps> = ({ onClickClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/archive?q=${encodeURIComponent(searchQuery.trim())}`);
      onClickClose?.();
    }
  };

  const panelVariants = prefersReducedMotion
    ? {
        hidden: { height: 'auto', opacity: 1 },
        visible: { height: 'auto', opacity: 1 },
        exit: { height: 'auto', opacity: 1 },
      }
    : accordionPanel;

  const renderItem = (item: MobileNavItem) => {
    if (item.subItems) {
      return (
        <Disclosure key={item.id} as="div" className="text-[rgb(var(--c-foreground))]">
          {({ open }) => (
            <div>
              <Disclosure.Button
                className="
                  group flex w-full items-center justify-between
                  py-2.5 px-4 text-sm font-medium tracking-wide
                  rounded-xl outline-none
                  transition-colors duration-200
                  hover:bg-[rgb(var(--c-surface-elevated))]
                  focus-visible:bg-[rgb(var(--c-surface-elevated))]
                "
              >
                <span>{item.name}</span>
                <svg
                  aria-hidden
                  className={`
                    size-4
                    transition-transform duration-200 ease-out
                    ${open ? 'rotate-180' : ''}
                  `}
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </Disclosure.Button>

              <AnimatePresence initial={false}>
                {open && (
                  <motion.div
                    key="content"
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    variants={panelVariants}
                    style={{ overflow: 'hidden' }}
                  >
                    <motion.ul
                      variants={staggerContainer}
                      initial="hidden"
                      animate="visible"
                      className="ps-4 pe-2 py-2 space-y-1"
                    >
                      {item.subItems?.map((subItem: { id: string; href: string; name: string }) => (
                        <motion.li key={subItem.id} variants={staggerItem}>
                          <Link
                            href={subItem.href}
                            className="
                              flex items-center gap-2 py-2 px-3 text-sm
                              rounded-lg outline-none
                              text-[rgb(var(--c-neutral-300))]
                              transition-colors duration-200
                              hover:bg-[rgb(var(--c-surface-elevated))]
                              hover:text-[rgb(var(--c-foreground))]
                              focus-visible:bg-[rgb(var(--c-surface-elevated))]
                            "
                            onClick={onClickClose}
                          >
                            <span
                              aria-hidden
                              className="size-1 rounded-full bg-[rgb(var(--c-primary-500))]"
                            />
                            {subItem.name}
                          </Link>
                        </motion.li>
                      ))}
                    </motion.ul>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </Disclosure>
      );
    }

    return (
      <Disclosure key={item.id} as="div">
        <Link
          className="
            flex w-full items-center py-2.5 px-4 text-sm font-medium tracking-wide
            rounded-xl outline-none
            text-[rgb(var(--c-foreground))]
            transition-colors duration-200
            hover:bg-[rgb(var(--c-surface-elevated))]
            focus-visible:bg-[rgb(var(--c-surface-elevated))]
          "
          href={item.href}
          onClick={onClickClose}
        >
          <span className="block w-full text-right">{item.name}</span>
        </Link>
      </Disclosure>
    );
  };

  return (
    <motion.div
      initial={prefersReducedMotion ? { x: 0, opacity: 1 } : { x: 32, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={prefersReducedMotion ? { x: 0, opacity: 1 } : { x: 32, opacity: 0 }}
      transition={{ duration: 0.28, ease: STRIPE_EASE }}
      className="
        overflow-y-auto w-full h-full
        bg-[rgb(var(--c-surface-canvas))] scrollbar-custom
      "
      role="dialog"
      aria-modal="true"
      aria-label="منوی موبایل"
    >
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="py-6 px-5 border-b border-[rgb(var(--c-border-subtle))]"
      >
        <motion.div variants={staggerItem} className="flex items-center justify-between">
          <Logo />
          <ButtonClose onClick={onClickClose} />
        </motion.div>

        <motion.p
          variants={staggerItem}
          className="mt-5 text-sm text-[rgb(var(--c-neutral-400))] text-right"
        >
          از مبتدی تا حرفه‌ای، اینجا مکانی برای یادگیری و رشد در دنیای ارزهای دیجیتال است
        </motion.p>

        <motion.div
          variants={staggerItem}
          className="mt-4 flex justify-between items-center"
        >
          <SwitchDarkMode className="bg-[rgb(var(--c-surface-elevated))]" />
          <ClientSocialLinks className="gap-2" itemClass="!w-9 !h-9" iconSize={18} />
        </motion.div>

        <motion.form
          variants={staggerItem}
          onSubmit={handleSearch}
          className="mt-5 text-[rgb(var(--c-foreground))]"
        >
          <label htmlFor="bmf-mobile-search" className="sr-only">
            جستجو
          </label>
          <div
            className="
              flex items-center gap-2 py-2.5 px-4 rounded-xl h-full
              bg-[rgb(var(--c-surface-elevated))]
              border border-[rgb(var(--c-border-subtle))]
              focus-within:border-[rgb(var(--c-primary-500))]
              transition-colors duration-200
            "
          >
            <span className="text-[rgb(var(--c-neutral-400))]">{MagnifyingGlassIcon}</span>
            <input
              id="bmf-mobile-search"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجو کنید و اینتر بزنید"
              className="
                flex-1 border-none bg-transparent
                focus:outline-none focus:ring-0
                text-sm text-right
                placeholder:text-[rgb(var(--c-neutral-500))]
              "
            />
          </div>
        </motion.form>
      </motion.div>

      <motion.ul
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="flex flex-col py-4 px-2 space-y-0.5"
      >
        {NAVBAR_LINKS.map((item) => (
          <motion.li key={item.id} variants={staggerItem}>
            {renderItem(item)}
          </motion.li>
        ))}
      </motion.ul>
    </motion.div>
  );
};

export default NavMobile;

export { STRIPE_EASE, STRIPE_EASE_SOFT };
