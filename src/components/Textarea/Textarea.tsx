import React, { type TextareaHTMLAttributes } from 'react';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
}

// eslint-disable-next-line react/display-name
const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className = '', children, error, ...args }, ref) => {
    return (
      <div className="nc-Textarea relative">
        <textarea
          ref={ref}
          className={`block w-full text-sm rounded-xl border-neutral-200 focus:border-primary-300 focus:ring focus:ring-primary-200 focus:ring-opacity-50 bg-white dark:border-neutral-700 dark:focus:ring-primary-6000 dark:focus:ring-opacity-25 dark:bg-neutral-900 
          ${error ? 'border-red-500' : ''}
          ${className}`}
          rows={4}
          {...args}
        >
          {children}
        </textarea>
        {error && (
          <span className="text-red-500 text-sm mt-1 absolute left-0 -bottom-6">{error}</span>
        )}
      </div>
    );
  },
);

export default Textarea;
