'use client';

import { Dialog, Transition } from '@headlessui/react';
import { type FC, Fragment, type ReactNode, useEffect, useState } from 'react';
import Button from '../Button/Button';
import ButtonClose from '../ButtonClose/ButtonClose';

export interface NcModalProps {
  renderContent: () => ReactNode;
  renderTrigger?: (openModal: () => void) => ReactNode;
  contentExtraClass?: string;
  contentPaddingClass?: string;
  triggerText?: ReactNode;
  modalTitle?: ReactNode;
  isOpenProp?: boolean;
  onCloseModal?: () => void;
}

const NcModal: FC<NcModalProps> = ({
  renderTrigger,
  renderContent,
  contentExtraClass = 'max-w-screen-xl',
  contentPaddingClass = 'py-4 px-6 md:py-5',
  triggerText = 'Open Modal',
  modalTitle = 'Modal title',
  isOpenProp,
  onCloseModal,
}) => {
  const [isOpen, setIsOpen] = useState(!!isOpenProp);

  function closeModal() {
    if (typeof isOpenProp !== 'boolean') {
      setIsOpen(false);
    }
    onCloseModal?.();
  }

  function openModal() {
    if (typeof isOpenProp !== 'boolean') {
      setIsOpen(true);
    }
  }

  useEffect(() => {
    setIsOpen(!!isOpenProp);
  }, [isOpenProp]);

  return (
    <div className="nc-NcModal">
      {renderTrigger ? (
        renderTrigger(openModal)
      ) : (
        <Button onClick={openModal}> {triggerText} </Button>
      )}

      <Transition appear show={isOpen} as={Fragment}>
        <Dialog as="div" className="fixed inset-0 z-50 overflow-y-auto" onClose={closeModal}>
          <div className="min-h-dvh px-1 text-center md:px-4">
            <Transition.Child
              as="div"
              enter="ease-out duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <div className="fixed inset-0 bg-black bg-opacity-40" aria-hidden="true" />
            </Transition.Child>

            {/* This element is to trick the browser into centering the modal contents. */}
            <span className="inline-block h-dvh align-middle" aria-hidden="true">
              &#8203;
            </span>
            <Transition.Child
              as={Dialog.Panel}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
              className={`inline-block w-full my-5 overflow-hidden text-start align-middle transition-all transform bg-white border border-black border-opacity-5 shadow-xl rounded-2xl sm:my-8 dark:bg-neutral-800 dark:border-neutral-700 text-neutral-900 dark:text-neutral-300 ${contentExtraClass}`}
            >
              <div className="py-4 px-6 text-center relative border-b border-neutral-100 dark:border-neutral-700 md:py-5">
                <ButtonClose
                  onClick={closeModal}
                  className="absolute left-2 top-1/2 transform -translate-y-1/2 sm:left-4"
                />
                {modalTitle && (
                  <Dialog.Title
                    as="h3"
                    className="text-base font-semibold text-neutral-900 lg:text-xl dark:text-neutral-200 mx-10"
                  >
                    {modalTitle}
                  </Dialog.Title>
                )}
              </div>
              <div className={contentPaddingClass}>{renderContent()}</div>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
};

export default NcModal;
