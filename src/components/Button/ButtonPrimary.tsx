'use client';

import React, { forwardRef } from 'react';
import Button, { type ButtonProps } from './Button';

const ButtonPrimary = forwardRef<HTMLButtonElement, ButtonProps>((props, ref) => {
  return <Button {...props} pattern="primary" ref={ref} />;
});

ButtonPrimary.displayName = 'ButtonPrimary';

export default ButtonPrimary;
