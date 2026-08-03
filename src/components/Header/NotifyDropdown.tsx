'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { memo } from 'react';

interface Props {
  className?: string;
}

const NotifyDropdown = memo(({ className = 'hidden sm:block' }: Props) => {
  return (
    <div className={className}>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="اعلان‌ها"
            className="
              relative
              flex items-center justify-center
              size-10 rounded-xl
              text-neutral-600 dark:text-neutral-300
              focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50
              transition-colors duration-200
              data-[state=open]:bg-neutral-100 dark:data-[state=open]:bg-neutral-800/80
            "
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 6.43994V9.76994"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeMiterlimit="10"
                strokeLinecap="round"
              />
              <path
                d="M12.02 2C8.34002 2 5.36002 4.98 5.36002 8.66V10.76C5.36002 11.44 5.08002 12.46 4.73002 13.04L3.46002 15.16C2.68002 16.47 3.22002 17.93 4.66002 18.41C9.44002 20 14.61 20 19.39 18.41C20.74 17.96 21.32 16.38 20.59 15.16L19.32 13.04C18.97 12.46 18.69 11.43 18.69 10.76V8.66C18.68 5 15.68 2 12.02 2Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeMiterlimit="10"
                strokeLinecap="round"
              />
              <path
                d="M15.33 18.8201C15.33 20.6501 13.83 22.1501 12 22.1501C11.09 22.1501 10.25 21.7701 9.65004 21.1701C9.05004 20.5701 8.67004 19.7301 8.67004 18.8201"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeMiterlimit="10"
              />
              <title>اعلان‌ها</title>
            </svg>
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="end"
          sideOffset={16}
          className="w-screen max-w-sm p-0 border-0 shadow-none bg-transparent"
        >
          <div
            className="
              overflow-hidden rounded-3xl
              bg-white/95 dark:bg-neutral-900/95
              backdrop-blur-xl backdrop-saturate-150
              border border-white/20 dark:border-neutral-700/50
              shadow-[0_8px_32px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.04)]
              dark:shadow-[0_8px_32px_rgba(0,0,0,0.4),0_2px_8px_rgba(0,0,0,0.2)]
            "
          >
            {/* Header */}
            <div
              className="
                flex items-center justify-between p-4 pb-3
                border-b border-neutral-100 dark:border-neutral-800
              "
            >
              <h3 className="text-base font-bold text-neutral-900 dark:text-white">اعلان‌ها</h3>
            </div>

            {/* Empty state */}
            <div className="flex flex-col items-center justify-center py-10 px-4">
              <div
                className="
                  w-16 h-16 mb-4
                  flex items-center justify-center
                  rounded-2xl
                  bg-gradient-to-br from-slate-100 to-slate-200/80
                  dark:from-neutral-800 dark:to-neutral-700/80
                "
              >
                <svg
                  className="w-8 h-8 text-neutral-400 dark:text-neutral-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
              </div>
              <p className="text-sm font-medium text-neutral-600 dark:text-neutral-300">
                اعلان جدیدی ندارید
              </p>
              <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
                اعلان‌های جدید اینجا نمایش داده می‌شوند
              </p>
            </div>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
});

NotifyDropdown.displayName = 'NotifyDropdown';

export default NotifyDropdown;
