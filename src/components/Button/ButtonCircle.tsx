'use client';

import twFocusClass from '@/utils/twFocusClass';
import type React from 'react';
import type { ButtonHTMLAttributes } from 'react';

export interface ButtonCircleProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  size?: string;
}

const ButtonCircle: React.FC<ButtonCircleProps> = ({
  className = ' ',
  size = ' w-9 h-9 ',
  ...args
}) => {
  return (
    <button
      className={
        // biome-ignore lint/style/useTemplate: <explanation>
        `ttnc-ButtonCircle flex items-center justify-center rounded-full !leading-none disabled:bg-opacity-70 bg-slate-900 hover:bg-slate-800 
        text-slate-50 ${className} ${size} ` + twFocusClass(true)
      }
      {...args}
    />
  );
};

export default ButtonCircle;
