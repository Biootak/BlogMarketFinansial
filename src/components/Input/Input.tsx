import React, { type InputHTMLAttributes } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  sizeClass?: string;
  fontClass?: string;
  rounded?: string;
  error?: string;
}

// eslint-disable-next-line react/display-name
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className = '',
      sizeClass = 'h-11 px-4 py-3',
      fontClass = 'text-sm font-normal',
      rounded = 'rounded-full',
      children,
      type = 'text',
      error,
      ...args
    },
    ref,
  ) => {
    return (
      <div className="nc-Input relative">
        <input
          ref={ref}
          type={type}
          className={`block w-full border-neutral-200 focus:border-primary-300 focus:ring focus:ring-primary-200/50 bg-white dark:border-neutral-500 dark:focus:ring-primary-500/30 dark:bg-neutral-900 
          ${error ? 'border-red-500' : ''}
          ${rounded} ${fontClass} ${sizeClass} ${className}`}
          {...args}
        />
        {error && (
          <span className="text-red-500 text-sm mt-1 absolute start-0 -bottom-6">{error}</span>
        )}
      </div>
    );
  },
);

export default Input;
