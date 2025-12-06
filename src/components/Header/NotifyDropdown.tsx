'use client';

import { Popover, Transition } from '@/app/headlessui';
import Avatar from '@/components/Avatar/Avatar';
import { useThemeMode } from '@/hooks/useThemeMode';
import { Fragment, memo, useCallback, useId, useMemo } from 'react';

interface Props {
  className?: string;
}

interface Solution {
  name: string;
  description: string;
  time: string;
  href: string;
}

const NotifyDropdown = memo(({ className = 'hidden sm:block' }: Props) => {
  const { isDarkMode } = useThemeMode();
  const idPrefix = useId();

  const solutions = useMemo<Solution[]>(() => [], []);

  const NotificationIcon = useCallback(
    () => (
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
    ),
    [],
  );

  const NotificationItem = useCallback(
    ({ item }: { item: Solution }) => (
      <li
        className={`
          group relative flex items-start gap-3 p-3
          rounded-2xl cursor-pointer
          hover:bg-gradient-to-l hover:from-slate-50 hover:to-slate-100/50
          dark:hover:from-neutral-800/80 dark:hover:to-neutral-700/50
          transition-all duration-300 ease-out
          ${isDarkMode ? 'dark' : ''}
        `}
      >
        {/* Unread indicator */}
        <span className="absolute right-2 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 shadow-sm shadow-blue-500/30" />

        <div className="relative mr-2">
          <Avatar sizeClass="w-10 h-10" radius="rounded-xl" />
        </div>

        <div className="flex-1 min-w-0 space-y-1">
          <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">
            {item.name}
          </p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2">
            {item.description}
          </p>
          <p className="text-[11px] text-neutral-400 dark:text-neutral-500 font-medium">
            {item.time}
          </p>
        </div>
      </li>
    ),
    [isDarkMode],
  );

  return (
    <div className={className}>
      <Popover className="relative">
        {({ open }) => (
          <>
            <Popover.Button
              aria-label="اعلان‌ها"
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
                transition-all duration-300 ease-out
                ${open ? 'shadow-md border-slate-300 dark:border-slate-600 from-white to-slate-50 dark:from-slate-700/90 dark:to-slate-800/80' : ''}
              `}
            >
              {/* Notification badge */}
              <span
                className="
                  absolute -top-0.5 -left-0.5 w-4 h-4
                  flex items-center justify-center
                  text-[10px] font-bold text-white
                  bg-gradient-to-br from-blue-500 to-blue-600
                  rounded-full
                  shadow-sm shadow-blue-500/40
                  ring-2 ring-white dark:ring-neutral-900
                "
              >
                ۳
              </span>
              <NotificationIcon />
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
              <Popover.Panel className="absolute z-50 w-screen max-w-sm mt-4 -end-28 sm:end-0">
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
                    <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                      اعلان‌ها
                    </h3>
                    <button
                      type="button"
                      className="
                        text-xs font-medium text-primary-600 dark:text-primary-400
                        hover:text-primary-700 dark:hover:text-primary-300
                        transition-colors duration-200
                      "
                    >
                      خواندن همه
                    </button>
                  </div>

                  {/* Notifications List */}
                  <div className="p-2 max-h-[360px] overflow-y-auto">
                    {solutions.length > 0 ? (
                      <ul className="space-y-1">
                        {solutions.map((item) => (
                          <NotificationItem key={`${idPrefix}-${item.name}`} item={item} />
                        ))}
                      </ul>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-10 px-4">
                        <div
                          className="
                            w-16 h-16 mb-4
                            flex items-center justify-center
                            rounded-2xl
                            gradient-neutral-br/80
                            dark:from-neutral-800 dark:to-neutral-700/80
                          "
                        >
                          <svg
                            className="w-8 h-8 text-neutral-400 dark:text-neutral-500"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
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
                    )}
                  </div>

                  {/* Footer */}
                  {solutions.length > 0 && (
                    <div className="p-3 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                      <button
                        type="button"
                        className="
                          w-full py-2.5 px-4
                          text-sm font-medium
                          text-primary-600 dark:text-primary-400
                          bg-primary-50/50 dark:bg-primary-900/20
                          hover:bg-primary-100/80 dark:hover:bg-primary-900/40
                          rounded-xl
                          transition-all duration-150
                        "
                      >
                        مشاهده همه اعلان‌ها
                      </button>
                    </div>
                  )}
                </div>
              </Popover.Panel>
            </Transition>
          </>
        )}
      </Popover>
    </div>
  );
});

NotifyDropdown.displayName = 'NotifyDropdown';

export default NotifyDropdown;
