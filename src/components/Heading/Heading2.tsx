import type React from 'react';
import type { HTMLAttributes } from 'react';

export interface Heading2Props extends HTMLAttributes<HTMLHeadingElement> {
  emoji?: string;
}

const Heading2: React.FC<Heading2Props> = ({
  children,
  emoji = '',
  className = 'justify-center',
  ...args
}) => {
  return (
    <h2
      className={`flex items-center text-xl leading-[1.2] md:text-3xl lg:text-4xl md:leading-[1.2] font-semibold text-neutral-900 dark:text-neutral-100 ${className}`}
      {...args}
    >
      {!!emoji && (
        <span className="mr-3 md:mr-4 text-xl md:text-2xl lg:text-3xl leading-none">{emoji}</span>
      )}
      {children || `Heading2 Title`}
    </h2>
  );
};

export default Heading2;
