'use client';

import type React from 'react';
import ButtonClose from '@/components/ButtonClose/ButtonClose';
import Logo from '@/components/Logo/Logo';
import { Disclosure } from '@/app/headlessui';
import ClientSocialsList from '@/components/SocialsList/ClientSocialsList';
import SwitchDarkMode from '@/components/SwitchDarkMode/SwitchDarkMode';
import Link from 'next/link';

export interface NavMobileProps {
  onClickClose?: () => void;
}

const NavMobile: React.FC<NavMobileProps> = ({ onClickClose }) => {
  const NAVBAR_LINKS = [
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
  ];

  const MagnifyingGlassIcon = (
    // biome-ignore lint/a11y/noSvgWithoutTitle: <explanation>
    <svg width={22} height={22} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
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

  const _renderItem = (item: {
    id: string;
    href: string;
    name: string;
    subItems?: Array<{ id: string; href: string; name: string }>;
  }) => {
    if (item.subItems) {
      return (
        <Disclosure key={item.id} as="div" className="text-slate-900 dark:text-white">
          {({ open }) => (
            <>
              <Disclosure.Button className="flex w-full items-center justify-between py-2.5 px-4 font-medium tracking-wide text-sm hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                <span>{item.name}</span>
                <svg
                  className={`${open ? 'transform rotate-180' : ''} w-5 h-5`}
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </Disclosure.Button>
              <Disclosure.Panel className="px-4 pt-2 pb-2 text-sm">
                <ul className="space-y-1">
                  {item.subItems?.map((subItem) => (
                    <li key={subItem.id}>
                      <Link
                        href={subItem.href}
                        className="block py-2 px-3 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
                        onClick={onClickClose}
                      >
                        {subItem.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </Disclosure.Panel>
            </>
          )}
        </Disclosure>
      );
    }

    return (
      <Disclosure key={item.id} as="div" className="text-slate-900 dark:text-white">
        <Link
          className="flex w-full items-center py-2.5 px-4 font-medium tracking-wide text-sm hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
          href={item.href}
          onClick={onClickClose}
        >
          <span className="block w-full text-right">{item.name}</span>
        </Link>
      </Disclosure>
    );
  };

  return (
    <div className="overflow-y-auto w-full h-screen py-2 transition transform shadow-lg ring-1 dark:ring-neutral-700 bg-white dark:bg-neutral-900 divide-y-2 divide-neutral-100 dark:divide-neutral-800 scrollbar-custom">
      <div className="py-6 px-5">
        <Logo />
        <div className="flex flex-col mt-5 text-slate-600 dark:text-slate-300 text-sm">
          <span className="text-right">
            از مبتدی تا حرفه‌ای، اینجا مکانی برای یادگیری و رشد در دنیای ارزهای دیجیتال است
          </span>

          <div className="flex justify-between items-center mt-4">
            <SwitchDarkMode className="bg-neutral-100 dark:bg-neutral-800" />
            <ClientSocialsList
              itemClass="w-10 h-10 sm:w-8 sm:h-8 flex items-center justify-center rounded-full text-xl"
            />
          </div>
        </div>
        <span className="absolute end-2 top-2 p-1">
          <ButtonClose onClick={onClickClose} />
        </span>

        <div className="mt-5">
          <form action="" method="POST" className="flex-1 text-slate-900 dark:text-slate-200">
            <div className="bg-slate-50 dark:bg-slate-800 flex items-center gap-1 py-2 px-4 rounded-xl h-full">
              <input
                type="search"
                placeholder="جستجو کنید و اینتر بزنید"
                className="border-none bg-transparent focus:outline-none focus:ring-0 w-full text-sm text-right"
              />
              {MagnifyingGlassIcon}
            </div>
            <input type="submit" hidden value="" />
          </form>
        </div>
      </div>
      <ul className="flex flex-col py-6 px-2 space-y-1">{NAVBAR_LINKS.map(_renderItem)}</ul>
    </div>
  );
};

export default NavMobile;
