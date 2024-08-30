'use client';

import React, { type FC, useState } from 'react';
import twFocusClass from '@/utils/twFocusClass';
import NcDropDown from '@/components/NcDropDown/NcDropDown';
import ModalReportItem from '@/components/ModalReportItem/ModalReportItem';
import ModalHideAuthor from './ModalHideAuthor';
import type { NcDropDownItem } from '@/types/types';
import { HiOutlineClipboard, HiOutlineEyeSlash, HiOutlineFlag } from 'react-icons/hi2';

// تعریف پراپ‌های کامپوننت
export interface AccountActionDropdownProps {
  containerClassName?: string;
  iconClass?: string;
  dropdownPositon?: 'up' | 'down';
}

const AccountActionDropdown: FC<AccountActionDropdownProps> = ({
  containerClassName = 'h-8 w-8 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700',
  iconClass = 'h-6 w-6',
  dropdownPositon = 'down',
}) => {
  // تعریف آیتم‌های منوی دراپ‌داون
  const initialActions: NcDropDownItem[] = [
    {
      id: 'copylink',
      name: 'کپی لینک',
      icon: HiOutlineClipboard,
    },
    {
      id: 'hideThisAuthor',
      name: 'مخفی کردن این نویسنده',
      icon: HiOutlineEyeSlash,
    },
    {
      id: 'reportThisArticle',
      name: 'گزارش این نویسنده',
      icon: HiOutlineFlag,
    },
  ];

  // تعریف state‌های کامپوننت
  const [actions, setActions] = useState<NcDropDownItem[]>(initialActions);
  const [isReporting, setIsReporting] = useState(false);
  const [showModalHideAuthor, setShowModalHideAuthor] = useState(false);
  // biome-ignore lint/correctness/noUnusedVariables: <explanation>
  const [isCopied, setIsCopied] = useState(false);

  // توابع مربوط به مدال‌ها
  const openModalReportPost = () => setIsReporting(true);
  const closeModalReportPost = () => setIsReporting(false);
  const openModalHideAuthor = () => setShowModalHideAuthor(true);
  const onCloseModalHideAuthor = () => setShowModalHideAuthor(false);

  // تابع برای هندل کردن کلیک روی آیتم‌های دراپ‌داون
  const handleClickDropDown = (item: NcDropDownItem) => {
    switch (item.id) {
      case 'copylink':
        navigator.clipboard.writeText(window.location.origin + '/author/this-is-slug');
        setIsCopied(true);
        setActions((prevActions) =>
          prevActions.map((action) =>
            action.id === 'copylink' ? { ...action, name: 'لینک کپی شد' } : action,
          ),
        );
        setTimeout(() => {
          setIsCopied(false);
          setActions(initialActions);
        }, 1000);
        break;
      case 'reportThisArticle':
        openModalReportPost();
        break;
      case 'hideThisAuthor':
        openModalHideAuthor();
        break;
    }
  };

  // رندر کردن منوی دراپ‌داون
  const renderMenu = () => (
    <NcDropDown
      className={`text-neutral-500 dark:text-neutral-400 flex items-center justify-center rounded-full ${containerClassName} ${twFocusClass()}`}
      triggerIconClass={iconClass}
      data={actions}
      panelMenusClass={dropdownPositon === 'up' ? 'origin-bottom-right bottom-0' : undefined}
      onClick={handleClickDropDown}
    />
  );

  return (
    <div>
      {renderMenu()}
      <ModalReportItem show={isReporting} onCloseModalReportItem={closeModalReportPost} />
      <ModalHideAuthor show={showModalHideAuthor} onCloseModalHideAuthor={onCloseModalHideAuthor} />
    </div>
  );
};

export default AccountActionDropdown;
