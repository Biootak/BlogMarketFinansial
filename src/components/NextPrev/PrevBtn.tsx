import twFocusClass from '@/utils/twFocusClass';
import { HiChevronRight } from 'react-icons/hi2';
import React, { type ButtonHTMLAttributes, type FC } from 'react';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {}

const PrevBtn: FC<Props> = ({ className = 'w-10 h-10 text-lg', ...args }) => {
  return (
    <button
      className={`PrevBtn ${className} bg-white/90 dark:bg-neutral-800/90 backdrop-blur-sm border border-neutral-200/50 dark:border-neutral-600/50 rounded-full inline-flex items-center justify-center shadow-lg hover:bg-white dark:hover:bg-neutral-700 hover:shadow-xl hover:scale-105 transition-all duration-200 ${twFocusClass()}`}
      aria-label="قبلی"
      {...args}
    >
      <HiChevronRight className="w-5 h-5" />
    </button>
  );
};

export default PrevBtn;
