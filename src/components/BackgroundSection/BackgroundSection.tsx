import React, { type FC } from 'react';

export interface BackgroundSectionProps {
  className?: string;
}

const BackgroundSection: FC<BackgroundSectionProps> = ({
  className = 'bg-neutral-100 dark:bg-black dark:bg-opacity-20',
}) => {
  return (
    <div
      className={`absolute inset-0 mx-4 sm:mx-6 lg:mx-8 rounded-3xl lg:rounded-[40px] z-0 ${className}`}
    >
      <span className="sr-only hidden">bg</span>
    </div>
  );
};

export default BackgroundSection;
