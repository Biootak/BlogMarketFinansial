'use client';

import React, { type FC, useState } from 'react';
import twFocusClass from '@/utils/twFocusClass';
import NcDropDown from '@/components/NcDropDown/NcDropDown';
import ModalReportItem from '@/components/ModalReportItem/ModalReportItem';
import ModalHideAuthor from './ModalHideAuthor';
import type { NcDropDownItem } from '@/types/types';
import { HiOutlineClipboard, HiOutlineEyeSlash, HiOutlineFlag } from 'react-icons/hi2';

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
  let actions: NcDropDownItem[] = [
    {
      id: 'copylink',
      name: 'Copy link',
      icon: HiOutlineClipboard,
    },
    {
      id: 'hideThisAuthor',
      name: 'Hide this author',
      icon: HiOutlineEyeSlash,
    },
    {
      id: 'reportThisArticle',
      name: 'Report this author',
      icon: HiOutlineFlag,
    },
  ];

  //
  const [isReporting, setIsReporting] = useState(false);
  const [showModalHideAuthor, setShowModalHideAuthor] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const openModalReportPost = () => setIsReporting(true);
  const closeModalReportPost = () => setIsReporting(false);

  const openModalHideAuthor = () => setShowModalHideAuthor(true);
  const onCloseModalHideAuthor = () => setShowModalHideAuthor(false);

  const hanldeClickDropDown = (item: (typeof actions)[number]) => {
    if (item.id === 'copylink') {
      navigator.clipboard.writeText(window.location.origin + '/author/this-is-slug');
      setIsCopied(true);
      setTimeout(() => {
        setIsCopied(false);
      }, 1000);
      return;
    }
    if (item.id === 'reportThisArticle') {
      return openModalReportPost();
    }
    if (item.id === 'hideThisAuthor') {
      return openModalHideAuthor();
    }

    return;
  };

  const renderMenu = () => {
    if (isCopied) {
      actions = actions.map((item) => {
        if (item.id !== 'copylink') return item;
        return {
          ...item,
          name: 'Link Copied',
        };
      });
    }
    return (
      <NcDropDown
        className={`text-neutral-500 dark:text-neutral-400 flex items-center justify-center rounded-full ${containerClassName} ${twFocusClass()}`}
        triggerIconClass={iconClass}
        data={actions}
        panelMenusClass={dropdownPositon === 'up' ? 'origin-bottom-right bottom-0' : undefined}
        onClick={hanldeClickDropDown}
      />
    );
  };

  return (
    <div>
      {renderMenu()}

      <ModalReportItem show={isReporting} onCloseModalReportItem={closeModalReportPost} />
      <ModalHideAuthor show={showModalHideAuthor} onCloseModalHideAuthor={onCloseModalHideAuthor} />
    </div>
  );
};

export default AccountActionDropdown;
