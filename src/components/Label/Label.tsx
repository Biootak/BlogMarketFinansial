import type React from 'react';
import type { FC } from 'react';

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  className?: string;
  children: React.ReactNode;
}

const Label: FC<LabelProps> = ({ className = '', children, ...props }) => {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: generic Label wrapper — htmlFor is passed via props spread
    <label
      className={`nc-Label ${className} text-neutral-800 font-medium text-sm dark:text-neutral-300`}
      data-nc-id="Label"
      {...props}
    >
      {children}
    </label>
  );
};

export default Label;
