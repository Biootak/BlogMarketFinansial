'use client';

import { cn } from '@/lib/utils';
import type { NcDropDownItem } from '@/types/types';
import { Menu, Transition } from '@headlessui/react';
import type React from 'react';
import { type FC, Fragment, type ReactNode } from 'react';
import { HiEllipsisHorizontal } from 'react-icons/hi2';

export interface NcDropDownProps {
  className?: string;
  panelMenusClass?: string;
  triggerIconClass?: string;
  data: NcDropDownItem[];
  renderTrigger?: () => ReactNode;
  renderItem?: (item: NcDropDownItem) => React.ReactElement;
  title?: string;
  onClick: (item: NcDropDownItem) => void;
}

const NcDropDown: FC<NcDropDownProps> = ({
  className = 'h-8 w-8 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center',
  triggerIconClass = 'h-6 w-6',
  panelMenusClass = 'origin-top-left',
  title = 'More',
  renderTrigger,
  renderItem,
  data,
  onClick,
}) => {
  return (
    <Menu as="div" className="relative inline-block text-start">
      <Menu.Button className={className} title={title}>
        {renderTrigger ? renderTrigger() : <HiEllipsisHorizontal className={triggerIconClass} />}
      </Menu.Button>
      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items
          className={cn(
            'absolute left-0 w-56 mt-2 origin-top-left bg-white dark:bg-neutral-900 rounded-2xl divide-y divide-neutral-100 shadow-lg ring-1 ring-black dark:ring-white ring-opacity-5 dark:ring-opacity-10 focus:outline-none z-30',
            panelMenusClass,
          )}
        >
          <div className="px-1 py-3 text-sm text-neutral-600 dark:text-neutral-300">
            {data.map((item) => (
              <Menu.Item
                key={item.id}
                as={'div'}
                onClick={() => onClick(item)}
                data-menu-item-id={item.id}
              >
                {({ active }) =>
                  renderItem ? (
                    renderItem(item)
                  ) : (
                    <button
                      type="button"
                      className={`flex items-center rounded-xl w-full px-3 py-2 ${
                        active ? 'bg-neutral-100 dark:bg-neutral-800' : ''
                      }`}
                    >
                      {item.icon && <item.icon className="ml-2 h-5 w-5" />}
                      <span>{item.name}</span>
                    </button>
                  )
                }
              </Menu.Item>
            ))}
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
  );
};

export default NcDropDown;
