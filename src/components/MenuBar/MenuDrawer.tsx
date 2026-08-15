'use client';

import NavMobile from '@/components/Navigation/NavMobile';
import { Transition } from '@headlessui/react';
import React from 'react';

/**
 * MenuDrawer — بخش سنگین منوی موبایل (headlessui Transition + NavMobile).
 *
 * جدا شد از MenuBar تا `@headlessui/react` (~۱۰۹KB chunk طبق بررسی 2026-08-12)
 * و NavMobile از first-load همه‌ی صفحات site خارج شوند — فقط وقتی کاربر دکمه‌ی
 * منو را باز می‌کند lazy-lod می‌شود (الگوی SearchModalLazy). این کامپوننت همیشه
 * با show=true مونت می‌شود (فقط هنگام باز شدن) — همان رفتار SearchModal.
 */
export default function MenuDrawer({ onClose }: { onClose: () => void }) {
  const handleOverlayInteraction = (e: React.MouseEvent | React.KeyboardEvent) => {
    if (
      e.type === 'click' ||
      (e as React.KeyboardEvent).key === 'Enter' ||
      (e as React.KeyboardEvent).key === ' '
    ) {
      onClose();
    }
  };

  return (
    <Transition show as={React.Fragment}>
      <div className="relative z-50">
        <Transition.Child
          as={React.Fragment}
          enter="transition-opacity duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="transition-opacity duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div
            className="fixed inset-0 bg-neutral-900 bg-opacity-50 backdrop-blur-md"
            onClick={handleOverlayInteraction}
            onKeyDown={handleOverlayInteraction}
            role="button"
            tabIndex={0}
          />
        </Transition.Child>

        <Transition.Child
          as={React.Fragment}
          enter="transition transform duration-100"
          enterFrom="opacity-0 -translate-x-14 rtl:translate-x-14"
          enterTo="opacity-100 translate-x-0"
          leave="transition transform duration-150"
          leaveFrom="opacity-100 translate-x-0"
          leaveTo="opacity-0 -translate-x-14 rtl:translate-x-14"
        >
          <div
            className="fixed inset-y-0 start-0 w-screen max-w-sm overflow-y-auto z-50"
            id="mobile-menu"
          >
            <div className="flex min-h-full">
              <div className="w-full max-w-sm overflow-hidden transition-all">
                <NavMobile onClickClose={onClose} />
              </div>
            </div>
          </div>
        </Transition.Child>
      </div>
    </Transition>
  );
}
