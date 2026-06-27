import type React from 'react';
import type { HTMLAttributes, ReactNode } from 'react';

export interface HeadingProps extends HTMLAttributes<HTMLHeadingElement> {
  fontClass?: string;
  desc?: ReactNode;
  isCenter?: boolean;
}

const Heading: React.FC<HeadingProps> = ({
  children,
  desc = '',
  className = 'mb-10 md:mb-12 text-neutral-900 dark:text-neutral-50',
  isCenter = false,
  ...args
}) => {
  return (
    <div
      className={`nc-Section-Heading relative flex flex-col sm:flex-row sm:items-end justify-between ${className}`}
    >
      <div className={isCenter ? 'text-center w-full max-w-2xl mx-auto' : 'max-w-2xl'}>
        <h2
          className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white"
          {...args}
        >
          {children || 'Section Heading'}
        </h2>
        {desc && (
          <p className="mt-2 md:mt-3 font-normal text-[13px] sm:text-sm text-neutral-500 dark:text-neutral-400">
            {desc}
          </p>
        )}
      </div>
    </div>
  );
};

export default Heading;
