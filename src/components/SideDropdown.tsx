'use client';

import { UserIcon } from '@/components/Icons';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { ReactNode } from 'react';

interface ClientSideDropdownProps {
  children: ReactNode;
}

export default function ClientSideDropdown({ children }: ClientSideDropdownProps) {
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="
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
            transition-all duration-300 ease-out
            data-[state=open]:shadow-md data-[state=open]:border-slate-300 data-[state=open]:from-white data-[state=open]:to-slate-50
            dark:data-[state=open]:border-slate-600 dark:data-[state=open]:from-slate-700/90 dark:data-[state=open]:to-slate-800/80
          "
          aria-label="منوی کاربری"
        >
          <UserIcon title="آواتار" className="w-5 h-5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={16}
        className="w-[280px] p-0 border-0 shadow-none bg-transparent"
      >
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
