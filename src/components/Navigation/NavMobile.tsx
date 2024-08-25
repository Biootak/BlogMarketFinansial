'use client';

import type React from 'react';
import ButtonClose from '@/components/ButtonClose/ButtonClose';
import Logo from '@/components/Logo/Logo';
import { Disclosure } from '@/app/headlessui';
import type { NavItemType } from './NavigationItem';
import { NAVBAR_LINKS } from '@/data/navigation';
import ButtonPrimary from '@/components/Button/ButtonPrimary';
import SocialsList from '@/components/SocialsList/SocialsList';
import { HiChevronDown } from 'react-icons/hi2';
import SwitchDarkMode from '@/components/SwitchDarkMode/SwitchDarkMode';
import Link from 'next/link';

export interface NavMobileProps {
  data?: NavItemType[];
  onClickClose?: () => void;
}

const NavMobile: React.FC<NavMobileProps> = ({ data = NAVBAR_LINKS, onClickClose }) => {
  // Moved the rendering of the magnifying glass icon outside the component to avoid redundant re-renders.
  const MagnifyingGlassIcon = (
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

  const _renderMenuChild = (
    item: NavItemType,
    itemClass = ' pl-3 text-neutral-900 dark:text-neutral-200 font-medium ',
  ) => {
    return (
      <ul className="nav-mobile-sub-menu ps-6 pb-1 text-base">
        {item.children?.map((i, index) => (
          <Disclosure key={index} as="li">
            <Link
              href={{
                pathname: i.href || undefined,
              }}
              className={`flex text-sm rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 mt-0.5 pe-4 ${itemClass}`}
              onClick={onClickClose} // Close the menu when a link is clicked.
            >
              <span className={`py-2.5 ${!i.children ? 'block w-full' : ''}`}>{i.name}</span>
              {i.children && (
                <span
                  className="flex items-center flex-grow"
                  onClick={(e) => e.preventDefault()} // Prevent default link behavior for the dropdown toggle.
                >
                  <Disclosure.Button as="span" className="flex justify-end flex-grow">
                    <HiChevronDown className="ms-2 h-4 w-4 text-slate-500" aria-hidden="true" />
                  </Disclosure.Button>
                </span>
              )}
            </Link>
            {i.children && (
              <Disclosure.Panel>
                {_renderMenuChild(i, 'ps-3 text-slate-600 dark:text-slate-400 ')}
              </Disclosure.Panel>
            )}
          </Disclosure>
        ))}
      </ul>
    );
  };

  const _renderItem = (item: NavItemType, index: number) => {
    return (
      <Disclosure key={index} as="li" className="text-slate-900 dark:text-white">
        <Link
          className="flex w-full items-center py-2.5 px-4 font-medium uppercase tracking-wide text-sm hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
          href={{
            pathname: item.href || undefined,
          }}
          onClick={onClickClose} // Close the menu when a link is clicked.
        >
          <span className={!item.children ? 'block w-full' : ''}>{item.name}</span>
          {item.children && (
            <span
              className="block flex-grow"
              onClick={(e) => e.preventDefault()} // Prevent default link behavior for the dropdown toggle.
            >
              <Disclosure.Button as="span" className="flex justify-end flex-grow">
                <HiChevronDown className="ms-2 h-4 w-4 text-neutral-500" aria-hidden="true" />
              </Disclosure.Button>
            </span>
          )}
        </Link>
        {item.children && <Disclosure.Panel>{_renderMenuChild(item)}</Disclosure.Panel>}
      </Disclosure>
    );
  };

  return (
    <div className="overflow-y-auto w-full h-screen py-2 transition transform shadow-lg ring-1 dark:ring-neutral-700 bg-white dark:bg-neutral-900 divide-y-2 divide-neutral-100 dark:divide-neutral-800">
      <div className="py-6 px-5">
        <Logo />
        <div className="flex flex-col mt-5 text-slate-600 dark:text-slate-300 text-sm">
          <span>
            Discover the most outstanding articles on all topics of life. Write your stories and
            share them
          </span>

          <div className="flex justify-between items-center mt-4">
            <SocialsList itemClass="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-full text-xl" />
            <span className="block">
              <SwitchDarkMode className="bg-neutral-100 dark:bg-neutral-800" />
            </span>
          </div>
        </div>
        <span className="absolute end-2 top-2 p-1">
          <ButtonClose onClick={onClickClose} />
        </span>

        <div className="mt-5">
          {/* Moved the search form rendering outside to avoid redundant re-renders. */}
          <form action="" method="POST" className="flex-1 text-slate-900 dark:text-slate-200">
            <div className="bg-slate-50 dark:bg-slate-800 flex items-center space-x-1 rtl:space-x-reverse py-2 px-4 rounded-xl h-full">
              {MagnifyingGlassIcon}
              <input
                type="search"
                placeholder="Type and press enter"
                className="border-none bg-transparent focus:outline-none focus:ring-0 w-full text-sm "
              />
            </div>
            <input type="submit" hidden value="" />
          </form>
        </div>
      </div>
      <ul className="flex flex-col py-6 px-2 space-y-1 rtl:space-x-reverse">
        {data.map(_renderItem)}
      </ul>
    </div>
  );
};

export default NavMobile;
