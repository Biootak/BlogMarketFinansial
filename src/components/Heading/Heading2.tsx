import type React from 'react';
import type { HTMLAttributes, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

export interface Heading2Props extends HTMLAttributes<HTMLHeadingElement> {
  icon?: LucideIcon | ReactNode;
}

const Heading2: React.FC<Heading2Props> = ({
  children,
  icon,
  className = 'justify-center',
  ...args
}) => {
  return (
    <h2
      className={`flex items-center text-base leading-[1.2] md:text-lg lg:text-xl md:leading-[1.2] font-semibold text-neutral-900 dark:text-neutral-100 ${className}`}
      {...args}
    >
      {!!icon && (
        <span className="ml-3 md:ml-4 inline-flex items-center text-base md:text-lg lg:text-xl leading-none">
          {typeof icon === 'function' || (icon && typeof icon === 'object' && 'render' in (icon as object))
            ? (() => {
                const Icon = icon as LucideIcon;
                return <Icon className="h-5 w-5 text-amber-500" strokeWidth={2} aria-hidden />;
              })()
            : icon}
        </span>
      )}
      {children || `Heading2 Title`}
    </h2>
  );
};

export default Heading2;
