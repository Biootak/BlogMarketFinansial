import React from 'react';
import { Icon } from '../../ui/icon';
import { cn } from '../lib/utils';
import { Tooltip } from '@/components/ui/tooltip';
import { buttonVariants } from '@/components/ui/button';

type ColorButtonProps = {
  color: string;
  name: string;
  active?: boolean;
  isBrightColor?: boolean;
  onColorChange: (color: string) => void;
};

export const ColorButton = ({
  color,
  name,
  active,
  onColorChange,
  isBrightColor,
}: ColorButtonProps) => {
  return (
    <Tooltip title={name}>
      <button
        type="button"
        style={{ backgroundColor: color }}
        className={cn(
          buttonVariants({ variant: 'outline' }),
          'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium cursor-pointer size-6 border border-solid p-0 shadow',
        )}
        onClick={() => onColorChange(color)}
      >
        {active ? (
          <Icon
            name="Check"
            className={isBrightColor ? 'text-black' : 'text-white'}
            strokeWidth={2.5}
          />
        ) : null}
      </button>
    </Tooltip>
  );
};
