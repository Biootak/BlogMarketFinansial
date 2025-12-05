import Link from 'next/link';
import React, { type FC, type ReactNode } from 'react';

export interface WidgetHeading1Props {
  className?: string;
  title: ReactNode;
  viewAll: {
    label: string;
    href: string;
    targetBlank?: boolean;
  };
}

const WidgetHeading1: FC<WidgetHeading1Props> = ({ className = '', title, viewAll }) => {
  return (
    <div
      className={`nc-WidgetHeading1 flex items-center justify-between p-3 sm:p-4 xl:p-5 border-b border-neutral-200 dark:border-neutral-700 ${className}`}
    >
      <h2 className="text-base sm:text-lg text-neutral-900 dark:text-neutral-100 font-semibold flex-grow">
        {title}
      </h2>
      {!!viewAll.href && (
        <Link
          className="flex-shrink-0 block text-primary-700 dark:text-primary-500 font-semibold text-xs sm:text-sm"
          target={viewAll.targetBlank ? '_blank' : undefined}
          rel="noopener noreferrer"
          href={viewAll.href}
        >
          {viewAll.label}
        </Link>
      )}
    </div>
  );
};

export default WidgetHeading1;
