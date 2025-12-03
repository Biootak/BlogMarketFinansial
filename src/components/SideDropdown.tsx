'use client';

import { Popover, Transition } from "@headlessui/react";
import React, { Fragment, type ReactNode } from "react";
import { UserIcon } from "@/components/Icons";

interface ClientSideDropdownProps {
  children: ReactNode;
}

export default function ClientSideDropdown({ children }: ClientSideDropdownProps) {
  return (
    <Popover className="relative">
      {() => (
        <>
          <Popover.Button 
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-full text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none flex items-center justify-center"
            aria-label="منوی کاربری"
          >
            <UserIcon title="آواتار" />
          </Popover.Button>
          <Transition
            as={Fragment}
            enter="transition ease-out duration-200"
            enterFrom="opacity-0 translate-y-1"
            enterTo="opacity-100 translate-y-0"
            leave="transition ease-in duration-150"
            leaveFrom="opacity-100 translate-y-0"
            leaveTo="opacity-0 translate-y-1"
          >
            <Popover.Panel className="absolute z-10 w-screen max-w-[260px] px-4 mt-3.5 -end-2 sm:end-0 sm:px-0">
              {children}
            </Popover.Panel>
          </Transition>
        </>
      )}
    </Popover>
  );
}