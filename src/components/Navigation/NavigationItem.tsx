'use client';

import { AnimatePresence } from '@/lib/motion-shim';
import type { Route } from '@/routers/types';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import Link from 'next/link';
import { type FC, Fragment, useState } from 'react';
import { HiChevronDown } from 'react-icons/hi2';
import NcImage from '../NcImage/NcImage';
import { Button } from '../ui/button';

export interface NavItemType {
  id: string;
  name: string;
  href: Route;
  targetBlank?: boolean;
  children?: NavItemType[];
  type?: 'dropdown' | 'megaMenu' | 'none';
  isNew?: boolean;
}

export interface NavigationItemProps {
  menuItem: NavItemType;
}

const recentPosts = [
  {
    id: 1,
    title: 'Boost your conversion rate',
    href: '/single-gallery/demo-slug',
    date: 'Mar 16, 2023',
    datetime: '2023-03-16',
    category: { title: 'Marketing', href: '/archive/demo-slug' },
    imageUrl:
      'https://images.unsplash.com/photo-1678720175173-f57e293022e4?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxlZGl0b3JpYWwtZmVlZHw0MjJ8fHxlbnwwfHx8fA%3D%3D&auto=format&fit=crop&w=500&q=60',
    description:
      'Et et dolore officia quis nostrud esse aute cillum irure do esse. Eiusmod ad deserunt cupidatat est magna Lorem.',
  },
  {
    id: 2,
    title: 'How to use search engine optimization to drive sales',
    href: '/single-gallery/demo-slug',
    date: 'Mar 10, 2023',
    datetime: '2023-03-10',
    category: { title: 'Sales', href: '/archive/demo-slug' },
    imageUrl:
      'https://images.unsplash.com/photo-1678846912726-667eda5a850f?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxlZGl0b3JpYWwtZmVlZHwyODh8fHxlbnwwfHx8fA%3D%3D&auto=format&fit=crop&w=500&q=60',
    description: 'Optio cum necessitatibus dolor voluptatum provident commodi et.',
  },
];

const NavigationItem: FC<NavigationItemProps> = ({ menuItem }) => {
  const [isOpen, setIsOpen] = useState(false);

  const renderMegaMenu = (menu: NavItemType) => {
    if (!menu.children) {
      return null;
    }

    return (
      <li className={'menu-item flex-shrink-0 menu-megamenu menu-megamenu--large'}>
        <DropdownMenu.Root open={isOpen} onOpenChange={setIsOpen}>
          <DropdownMenu.Trigger asChild>
            <Button
              variant="ghost"
              className="inline-flex items-center text-sm font-medium text-neutral-700 hover:text-primary-600 dark:text-neutral-300 dark:hover:text-primary-400"
            >
              {menu.name}
              <HiChevronDown
                className={`ms-1 h-4 w-4 transition-transform duration-200 ${
                  isOpen ? 'rotate-180' : ''
                }`}
              />
              {menu.isNew && (
                <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full ms-2">
                  جدید
                </span>
              )}
            </Button>
          </DropdownMenu.Trigger>

          <AnimatePresence>
            {isOpen && (
              <DropdownMenu.Portal forceMount>
                <DropdownMenu.Content
                  align="start"
                  sideOffset={8}
                  className="z-50 min-w-[14rem] max-w-[min(90vw,18rem)] overflow-hidden rounded-md border border-neutral-200 bg-white shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 dark:border-neutral-800 dark:bg-neutral-900"
                >
                  <div className="grid gap-1 p-1">
                    {menu.children.map((item, index) => (
                      <Fragment key={index}>
                        <DropdownMenu.Item className="flex cursor-pointer select-none items-center rounded-sm px-3 py-2 text-sm outline-none transition-colors hover:bg-neutral-100 focus:bg-neutral-100 dark:hover:bg-neutral-800 dark:focus:bg-neutral-800">
                          <p className="font-medium text-slate-900 dark:text-neutral-200">
                            {item.name}
                          </p>
                          <ul className="grid space-y-4 mt-4">
                            {item.children?.map((i) => (
                              <li key={i.id}>
                                <Link
                                  href={i.href}
                                  target={i.targetBlank ? '_blank' : undefined}
                                  className="flex w-full items-center"
                                >
                                  {i.name}
                                  {i.isNew && (
                                    <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full ms-2">
                                      جدید
                                    </span>
                                  )}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </DropdownMenu.Item>

                        {index === 0 && (
                          <div className="w-[40%]">
                            <div className="grid grid-cols-1 gap-10 sm:gap-8 lg:grid-cols-2">
                              <h3 className="sr-only">Recent posts</h3>
                              {recentPosts.map((post) => (
                                <article
                                  key={post.id}
                                  className="relative isolate flex max-w-2xl flex-col gap-x-8 gap-y-6 sm:flex-row sm:items-start lg:flex-col lg:items-stretch"
                                >
                                  <div className="relative flex-none">
                                    <NcImage
                                      containerClassName="aspect-[2/1] w-full rounded-xl bg-gray-100 sm:aspect-[16/9] sm:h-32 lg:h-auto z-0"
                                      fill
                                      className="rounded-xl object-cover"
                                      src={post.imageUrl}
                                      sizes="300px"
                                      alt=""
                                    />
                                    <div className="absolute inset-0 rounded-xl ring-1 ring-inset ring-gray-900/10" />
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-x-4">
                                      <time
                                        dateTime={post.datetime}
                                        className="text-sm leading-6 text-gray-600"
                                      >
                                        {post.date}
                                      </time>
                                      <Link
                                        href={post.category.href as Route}
                                        className="relative z-10 rounded-full bg-gray-50 py-1.5 px-3 text-xs font-medium text-gray-600 hover:bg-gray-100"
                                      >
                                        {post.category.title}
                                      </Link>
                                    </div>
                                    <h4 className="mt-2 text-sm font-semibold leading-6 text-gray-900">
                                      <Link href={post.href as Route}>
                                        <span className="absolute inset-0" />
                                        {post.title}
                                      </Link>
                                    </h4>
                                    <p className="mt-2 text-sm leading-6 text-gray-600">
                                      {post.description}
                                    </p>
                                  </div>
                                </article>
                              ))}
                            </div>
                          </div>
                        )}
                      </Fragment>
                    ))}
                  </div>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            )}
          </AnimatePresence>
        </DropdownMenu.Root>
      </li>
    );
  };

  const renderDropdownMenu = (menuDropdown: NavItemType) => {
    return (
      <DropdownMenu.Root open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenu.Trigger asChild>
          <Button
            variant="ghost"
            className="inline-flex items-center text-sm font-medium text-neutral-700 hover:text-primary-600 dark:text-neutral-300 dark:hover:text-primary-400"
          >
            {menuDropdown.name}
            <HiChevronDown
              className={`ms-1 h-4 w-4 transition-transform duration-200 ${
                isOpen ? 'rotate-180' : ''
              }`}
            />
            {menuDropdown.isNew && (
              <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full ms-2">
                جدید
              </span>
            )}
          </Button>
        </DropdownMenu.Trigger>

        <AnimatePresence>
          {isOpen && (
            <DropdownMenu.Portal forceMount>
              <DropdownMenu.Content
                align="start"
                sideOffset={8}
                className="z-50 min-w-[14rem] max-w-[min(90vw,18rem)] overflow-hidden rounded-md border border-neutral-200 bg-white shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 dark:border-neutral-800 dark:bg-neutral-900"
              >
                <div className="grid gap-1 p-1">
                  {menuDropdown.children?.map((item) => (
                    <DropdownMenu.Item
                      key={item.id}
                      className="flex cursor-pointer select-none items-center rounded-sm px-3 py-2 text-sm outline-none transition-colors hover:bg-neutral-100 focus:bg-neutral-100 dark:hover:bg-neutral-800 dark:focus:bg-neutral-800"
                    >
                      <Link
                        href={item.href}
                        target={item.targetBlank ? '_blank' : undefined}
                        className="flex w-full items-center"
                      >
                        {item.name}
                        {item.isNew && (
                          <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full ms-2">
                            جدید
                          </span>
                        )}
                      </Link>
                    </DropdownMenu.Item>
                  ))}
                </div>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          )}
        </AnimatePresence>
      </DropdownMenu.Root>
    );
  };

  switch (menuItem.type) {
    case 'dropdown':
      return renderDropdownMenu(menuItem);
    case 'megaMenu':
      return renderMegaMenu(menuItem);
    default:
      return (
        <Link
          href={menuItem.href}
          target={menuItem.targetBlank ? '_blank' : undefined}
          className="inline-flex items-center text-sm font-medium text-neutral-700 hover:text-primary-600 dark:text-neutral-300 dark:hover:text-primary-400"
        >
          {menuItem.name}
          {menuItem.isNew && (
            <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full ms-2">جدید</span>
          )}
        </Link>
      );
  }
};

export default NavigationItem;
