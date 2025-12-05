'use client';

import { Popover, Transition } from '@headlessui/react';
import React, { Fragment, type ReactNode } from 'react';
import { UserIcon } from '@/components/Icons';

interface ClientSideDropdownProps {
  children: ReactNode;
}

export default function ClientSideDropdown({ children }: ClientSideDropdownProps) {
  return (
    <Popover className="relative">
      {({ open }) => (
        <>
          <Popover.Button
            className={`
              relative w-11 h-11 rounded-2xl
              flex items-center justify-center
              text-slate-600 dark:text-slate-300
              bg-gradient-to-br from-slate-50 to-slate-100/80
              dark:from-slate-800/90 dark:to-slate-900/80
              border border-slate-200/60 dark:border-slate-700/50
              shadow-sm hover:shadow-md
              hover:border-slate-300/80 dark:hover:border-slate-600/60
              hover:from-white hover:to-slate-50
              dark:hover:from-slate-700/90 dark:hover:to-slate-800/80
              focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50
              transition-all duration-200 ease-out
              ${open ? 'shadow-md border-slate-300 dark:border-slate-600 from-white to-slate-50 dark:from-slate-700/90 dark:to-slate-800/80' : ''}
            `}
            aria-label="منوی کاربری"
          >
            <UserIcon title="آواتار" className="w-5 h-5" />
          </Popover.Button>
          <Transition
            as={Fragment}
            enter="transition ease-out duration-200"
            enterFrom="opacity-0 translate-y-2 scale-95"
            enterTo="opacity-100 translate-y-0 scale-100"
            leave="transition ease-in duration-200"
            leaveFrom="opacity-100 translate-y-0 scale-100"
            leaveTo="opacity-0 translate-y-2 scale-95"
          >
            <Popover.Panel className="absolute z-50 w-screen max-w-[280px] mt-4 -end-2 sm:end-0">
              {children}
            </Popover.Panel>
          </Transition>
        </>
      )}
    </Popover>
  );
}
