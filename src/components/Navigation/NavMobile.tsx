'use client';

import type React from 'react';
import ButtonClose from '@/components/ButtonClose/ButtonClose';
import Logo from '@/components/Logo/Logo';
import { Disclosure } from '@/app/headlessui';
import SocialsList from '@/components/SocialsList/SocialsList';
import SwitchDarkMode from '@/components/SwitchDarkMode/SwitchDarkMode';
import Link from 'next/link';
import { SOCIALS_DATA } from '../SocialsShare/SocialsShare';

export interface NavMobileProps {
  onClickClose?: () => void;
}

const NavMobile: React.FC<NavMobileProps> = ({ onClickClose }) => {
  const NAVBAR_LINKS = [
    {
      id: '0',
      href: '/',
      name: 'صفحه اصلی',
    },
    {
      id: '1',
      href: '/archive',
      name: 'وبلاگ',
    },
    {
      id: '2',
      href: '/market',
      name: 'مارکت',
    },
    {
      id: '3',
      href: '/about',
      name: 'درباره ما',
    },
    {
      id: '4',
      href: '/contact',
      name: 'تماس با ما',
    },
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

  const _renderItem = (item: { id: string; href: string; name: string }) => {
    return (
      <Disclosure key={item.id} as="li" className="text-slate-900 dark:text-white">
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
    <div className="overflow-y-auto w-full h-screen py-2 transition transform shadow-lg ring-1 dark:ring-neutral-700 bg-white dark:bg-neutral-900 divide-y-2 divide-neutral-100 dark:divide-neutral-800">
      <div className="py-6 px-5">
        <Logo />
        <div className="flex flex-col mt-5 text-slate-600 dark:text-slate-300 text-sm">
          <span className="text-right">
            از مبتدی تا حرفه‌ای، اینجا مکانی برای یادگیری و رشد در دنیای ارزهای دیجیتال است
          </span>

          <div className="flex justify-between items-center mt-4">
            <SwitchDarkMode className="bg-neutral-100 dark:bg-neutral-800" />
            <SocialsList
              socials={SOCIALS_DATA}
              itemClass="w-10 h-10 sm:w-8 sm:h-8 flex items-center justify-center rounded-full text-xl"
            />
          </div>
        </div>
        <span className="absolute end-2 top-2 p-1">
          <ButtonClose onClick={onClickClose} />
        </span>

        <div className="mt-5">
          <form action="" method="POST" className="flex-1 text-slate-900 dark:text-slate-200">
            <div className="bg-slate-50 dark:bg-slate-800 flex items-center space-x-1 space-x-reverse py-2 px-4 rounded-xl h-full">
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
