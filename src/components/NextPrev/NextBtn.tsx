import twFocusClass from '@/utils/twFocusClass';
import { HiChevronRight } from 'react-icons/hi2';
import React, { type ButtonHTMLAttributes, type FC } from 'react';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {}

const NextBtn: FC<Props> = ({ className = 'w-10 h-10 text-lg', ...args }) => {
  return (
    <button
      className={`NextBtn ${className} bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-6000 dark:hover:border-neutral-500 rounded-full inline-flex items-center justify-center hover:border-neutral-300 ${twFocusClass()}`}
      {...args}
    >
      <HiChevronRight className="w-5 h-5 rtl:rotate-180" />
    </button>
  );
};

export default NextBtn;
